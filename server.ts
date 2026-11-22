import { applySyntheticPipTotalAdjustment } from './src/utils/pipAdjustments.ts';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildNewSyntheticDeal,
  NewDealFormInput,
  SYNTHETIC_DEALS,
} from './src/data/syntheticDeals.ts';
import { HotelDeal } from './src/types/underwriting.ts';
import { DocumentType, FactoryRuntimeStatus } from './src/types/factory.ts';
import { runStageADocumentPipeline } from './server/factory/pipeline.ts';
import {
  getArtifactCount,
  listArtifactsForDeal,
  readPersistedArtifactBuffer,
} from './server/factory/artifactStore.ts';
import { getSnapshotCount } from './server/factory/snapshotStore.ts';
import {
  getLastObservedMasterStatus,
  resolveMasterPreflightFromDrive,
} from './server/factory/masterResolver.ts';

function extractBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// Server-authoritative allowlist of synthetic deals (seeded strictly with SYN-001..SYN-003)
const allowlistedSyntheticDeals = new Map<string, HotelDeal>(
  SYNTHETIC_DEALS.map((d) => [d.id, d])
);

const PROHIBITED_REAL_BRANDS = [
  'marriott',
  'hilton',
  'hyatt',
  'four seasons',
  'ritz-carlton',
  'intercontinental',
  'sheraton',
  'westin',
  'wyndham',
  'accor',
];

function containsProhibitedRealBrand(text: string): boolean {
  const lower = text.toLowerCase();
  return PROHIBITED_REAL_BRANDS.some((b) => lower.includes(b));
}

function validateIntakeRegistration(raw: unknown): NewDealFormInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.name !== 'string' ||
    r.name.trim().length < 2 ||
    r.name.trim().length > 140 ||
    typeof r.location !== 'string' ||
    r.location.trim().length < 2 ||
    r.location.trim().length > 100 ||
    typeof r.rooms !== 'number' ||
    !Number.isInteger(r.rooms) ||
    r.rooms < 10 ||
    r.rooms > 5000
  ) {
    return null;
  }

  const brand = typeof r.brand === 'string' ? r.brand.trim().slice(0, 100) : 'Independent';
  const notes = typeof r.investmentNotes === 'string' ? r.investmentNotes.trim().slice(0, 1000) : '';
  if (
    containsProhibitedRealBrand(r.name) ||
    containsProhibitedRealBrand(brand) ||
    containsProhibitedRealBrand(notes)
  ) {
    return null;
  }

  const askingPrice =
    r.askingPrice === null || r.askingPrice === undefined
      ? null
      : typeof r.askingPrice === 'number' && Number.isFinite(r.askingPrice) && r.askingPrice > 0
        ? r.askingPrice
        : NaN;
  if (Number.isNaN(askingPrice)) return null;

  const occupancyPct =
    r.occupancyPct === null || r.occupancyPct === undefined
      ? null
      : typeof r.occupancyPct === 'number' &&
          Number.isFinite(r.occupancyPct) &&
          r.occupancyPct >= 0 &&
          r.occupancyPct <= 100
        ? r.occupancyPct
        : NaN;
  if (Number.isNaN(occupancyPct)) return null;

  const adr =
    r.adr === null || r.adr === undefined
      ? null
      : typeof r.adr === 'number' && Number.isFinite(r.adr) && r.adr > 0
        ? r.adr
        : NaN;
  if (Number.isNaN(adr)) return null;

  const fbAndOtherRevenue =
    typeof r.fbAndOtherRevenue === 'number' &&
    Number.isFinite(r.fbAndOtherRevenue) &&
    r.fbAndOtherRevenue >= 0
      ? r.fbAndOtherRevenue
      : 0;
  const estimatedPip =
    typeof r.estimatedPip === 'number' &&
    Number.isFinite(r.estimatedPip) &&
    r.estimatedPip >= 0
      ? r.estimatedPip
      : 0;

  return {
    name: r.name.trim(),
    location: r.location.trim(),
    rooms: r.rooms,
    brand: brand || 'Independent',
    askingPrice,
    occupancyPct,
    adr,
    fbAndOtherRevenue,
    estimatedPip,
    investmentNotes: notes,
  };
}

export async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/factory/status', (_req, res) => {
    const masterState = getLastObservedMasterStatus();
    const status: FactoryRuntimeStatus = {
      stage: masterState.status === 'MASTER_VERIFIED' ? 'MASTER_DRIVE_READY' : 'STAGE_A_SYNTHETIC',
      driveIntegration: 'GOOGLE_DRIVE_READONLY_OAUTH',
      masterAccessStatus: masterState.status,
      masterRevision: masterState.revision,
      // A Drive preflight is not a document compliance audit.
      masterComplianceStatus: masterState.status === 'MASTER_VERIFIED'
        ? 'MASTER_PREFLIGHT_ONLY'
        : masterState.status,
      snapshotCount: getSnapshotCount(),
      artifactCount: getArtifactCount(),
      supportedFormats: ['docx', 'pdf', 'xlsx'],
    };
    res.json(status);
  });

  app.get('/api/factory/master-preflight', async (req, res) => {
    const token = extractBearerToken(req.headers.authorization);
    const docType: DocumentType | undefined =
      req.query.docType === 'executive-summary' || req.query.docType === 'full-ic-memo'
        ? req.query.docType
        : undefined;
    const preflight = await resolveMasterPreflightFromDrive(token, docType);
    res.json(preflight);
  });

  app.get('/api/factory/artifacts', (req, res) => {
    const dealId =
      typeof req.query.dealId === 'string' && req.query.dealId.trim()
        ? req.query.dealId.trim()
        : undefined;
    res.json({ artifacts: listArtifactsForDeal(dealId) });
  });

  // Register a validated session synthetic deal into the server allowlist
  app.post('/api/factory/synthetic-deals', (req, res) => {
    const validated = validateIntakeRegistration(req.body);
    if (!validated) {
      res.status(400).json({
        error:
          'Rejected synthetic intake payload: invalid fields or prohibited real-world hospitality brand detected.',
      });
      return;
    }
    const nextIdx = allowlistedSyntheticDeals.size + 1;
    const created = buildNewSyntheticDeal(validated, nextIdx);
    allowlistedSyntheticDeals.set(created.id, created);
    res.status(201).json(created);
  });

  // Update operating inputs, pricing, PIP, notes, or append an unverified evidence source on an allowlisted deal
  app.put('/api/factory/synthetic-deals/:dealId', (req, res) => {
    const dealId = req.params.dealId?.trim();
    const existing = dealId ? allowlistedSyntheticDeals.get(dealId) : undefined;
    if (!existing) {
      res.status(404).json({ error: `Allowlisted synthetic deal "${dealId}" not found.` });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updated = structuredClone(existing);

    if (body.askingPrice !== undefined) {
      if (
        body.askingPrice !== null &&
        (typeof body.askingPrice !== 'number' || !Number.isFinite(body.askingPrice) || body.askingPrice <= 0)
      ) {
        res.status(400).json({ error: 'Invalid askingPrice.' });
        return;
      }
      updated.askingPrice = body.askingPrice as number | null;
    }

    const lastIdx = updated.historicalInputs.length - 1;
    if (lastIdx >= 0) {
      const t12 = updated.historicalInputs[lastIdx];
      if (body.occupancyPct !== undefined) {
        if (
          body.occupancyPct !== null &&
          (typeof body.occupancyPct !== 'number' ||
            !Number.isFinite(body.occupancyPct) ||
            body.occupancyPct < 0 ||
            body.occupancyPct > 100)
        ) {
          res.status(400).json({ error: 'Invalid occupancyPct.' });
          return;
        }
        t12.occupancyPct = body.occupancyPct as number | null;
        delete t12.explicitRoomsRevenue;
      }
      if (body.adr !== undefined) {
        if (
          body.adr !== null &&
          (typeof body.adr !== 'number' || !Number.isFinite(body.adr) || body.adr <= 0)
        ) {
          res.status(400).json({ error: 'Invalid adr.' });
          return;
        }
        t12.adr = body.adr as number | null;
        delete t12.explicitRoomsRevenue;
      }
      if (body.fbRevenue !== undefined) {
        if (typeof body.fbRevenue !== 'number' || !Number.isFinite(body.fbRevenue) || body.fbRevenue < 0) {
          res.status(400).json({ error: 'Invalid fbRevenue.' });
          return;
        }
        t12.fbRevenue = body.fbRevenue;
      }
      if (body.otherRevenue !== undefined) {
        if (typeof body.otherRevenue !== 'number' || !Number.isFinite(body.otherRevenue) || body.otherRevenue < 0) {
          res.status(400).json({ error: 'Invalid otherRevenue.' });
          return;
        }
        t12.otherRevenue = body.otherRevenue;
      }
    }

    if (typeof body.investmentNotes === 'string') {
      if (containsProhibitedRealBrand(body.investmentNotes)) {
        res.status(400).json({ error: 'Prohibited real-world hospitality brand detected in notes.' });
        return;
      }
      updated.investmentNotes = body.investmentNotes.trim().slice(0, 1200);
    }

    if (body.estimatedPip !== undefined) {
      if (typeof body.estimatedPip !== 'number' || !Number.isFinite(body.estimatedPip) || body.estimatedPip < 0) {
        res.status(400).json({ error: 'Invalid estimatedPip.' });
        return;
      }
      // Do not silently rewrite existing vendor/engineering PIP line items.
      // Keep the aggregate override as a separate, visibly unverified delta.
      updated.pipItems = applySyntheticPipTotalAdjustment(updated, body.estimatedPip).pipItems;
    }

    if (body.newEvidence && typeof body.newEvidence === 'object') {
      const ev = body.newEvidence as Record<string, unknown>;
      const title = typeof ev.title === 'string' ? ev.title.trim().slice(0, 140) : '';
      const provider = typeof ev.provider === 'string' ? ev.provider.trim().slice(0, 100) : 'Session User Input';
      const notes = typeof ev.notes === 'string' ? ev.notes.trim().slice(0, 400) : '';
      if (!title || containsProhibitedRealBrand(title) || containsProhibitedRealBrand(provider) || containsProhibitedRealBrand(notes)) {
        res.status(400).json({ error: 'Invalid or prohibited brand in evidence submission.' });
        return;
      }
      const allowedCats = ['Financials', 'Franchise / Brand', 'Physical / Engineering', 'Environmental / Legal', 'Market / STR'] as const;
      const category = allowedCats.includes(ev.category as (typeof allowedCats)[number])
        ? (ev.category as (typeof allowedCats)[number])
        : 'Financials';
      const allowedStatus = ['Received — Unverified', 'Missing', 'Conflicted', 'Pending Third-Party'] as const;
      const status = allowedStatus.includes(ev.status as (typeof allowedStatus)[number])
        ? (ev.status as (typeof allowedStatus)[number])
        : 'Received — Unverified';

      updated.sourceRegister.push({
        id: `SRC-${updated.id}-${updated.sourceRegister.length + 1}`,
        title,
        category,
        periodCovered: typeof ev.periodCovered === 'string' && ev.periodCovered.trim() ? ev.periodCovered.trim().slice(0, 60) : 'Current Intake',
        provider,
        status,
        notes: notes || 'Added during active session; unverified pending independent third-party audit.',
      });
    }

    allowlistedSyntheticDeals.set(updated.id, updated);
    res.json(updated);
  });

  app.post('/api/factory/generate', async (req, res) => {
    try {
      const body = req.body as {
        dealId?: unknown;
        deal?: unknown;
        docType?: unknown;
        snapshotId?: unknown;
      };

      const docType: DocumentType | null =
        body.docType === 'executive-summary' || body.docType === 'full-ic-memo'
          ? body.docType
          : null;

      if (!docType) {
        res.status(400).json({
          error: 'Invalid docType. Must be "executive-summary" or "full-ic-memo".',
        });
        return;
      }

      // Reject arbitrary inline deal payloads that attempt to inject non-allowlisted deals
      if (body.deal !== undefined) {
        res.status(403).json({
          error:
            'Rejected non-allowlisted inline deal payload. Generation is restricted to server-allowlisted synthetic deal IDs.',
        });
        return;
      }

      if (typeof body.dealId !== 'string' || !body.dealId.trim()) {
        res.status(400).json({
          error: 'Missing allowlisted synthetic dealId.',
        });
        return;
      }

      const allowlisted = allowlistedSyntheticDeals.get(body.dealId.trim());
      if (!allowlisted) {
        res.status(403).json({
          error: `Deal ID "${body.dealId}" is not in the server-allowlisted synthetic registry.`,
        });
        return;
      }

      const requestedSnapshotId =
        typeof body.snapshotId === 'string' && body.snapshotId.trim()
          ? body.snapshotId.trim()
          : undefined;

      const token = extractBearerToken(req.headers.authorization);
      const masterPreflight = await resolveMasterPreflightFromDrive(token, docType);

      const record = await runStageADocumentPipeline({
        deal: allowlisted,
        docType,
        requestedSnapshotId,
        masterPreflight,
      });

      res.status(record.qaPassed ? 200 : 422).json(record);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Document generation failed.';
      res.status(reason.startsWith('SNAPSHOT_STALE_OR_MISMATCHED:') ? 409 : 500).json({
        error: reason,
      });
    }
  });

  app.get('/api/factory/artifacts/:artifactId/download', (req, res) => {
    const artifactId = req.params.artifactId;
    const format = req.query.format;
    if (format !== 'docx' && format !== 'pdf' && format !== 'xlsx') {
      res.status(400).json({ error: 'Invalid format. Must be docx, pdf, or xlsx.' });
      return;
    }

    const found = readPersistedArtifactBuffer(artifactId, format);
    if (!found) {
      res.status(404).json({
        error: 'Artifact not found or blocked by QA release gate.',
      });
      return;
    }

    res.setHeader('Content-Type', found.fileInfo.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${found.fileInfo.filename}"`
    );
    res.setHeader('X-Artifact-SHA256', found.fileInfo.sha256);
    res.send(found.buffer);
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  createServer().then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`HOTEL WORK DEV server listening on http://0.0.0.0:${PORT}`);
    });
  });
}
