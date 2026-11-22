import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HotelDeal } from '../../src/types/underwriting.ts';
import { computeDealSummary } from '../../src/utils/financials.ts';
import {
  buildExecutiveSummarySections,
  buildFullIcMemoSections,
} from '../../src/data/memoGenerator.ts';
import {
  DocumentType,
  FrozenUnderwritingSnapshot,
  MasterPreflightResult,
  MasterProvenance,
} from '../../src/types/factory.ts';
import { CANONICAL_RESOURCE_IDS } from './masterResolver.ts';

const ARTIFACT_BASE_DIR = path.resolve('/tmp/hotel-work-factory-artifacts');
const SNAPSHOTS_PATH = path.resolve(ARTIFACT_BASE_DIR, 'snapshots.json');
fs.mkdirSync(ARTIFACT_BASE_DIR, { recursive: true });

const snapshotsById = new Map<string, FrozenUnderwritingSnapshot>();
const snapshotIdByHash = new Map<string, string>();

function hydrateSnapshotsFromTmp() {
  try {
    if (!fs.existsSync(SNAPSHOTS_PATH)) return;
    const raw = fs.readFileSync(SNAPSHOTS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as FrozenUnderwritingSnapshot[];
    if (Array.isArray(parsed)) {
      for (const snap of parsed) {
        if (snap && snap.snapshotId && snap.snapshotHash) {
          snapshotsById.set(snap.snapshotId, snap);
          snapshotIdByHash.set(snap.snapshotHash, snap.snapshotId);
        }
      }
    }
  } catch {
    // Ignore corrupted ephemeral /tmp cache
  }
}

function flushSnapshotsToTmp() {
  try {
    fs.writeFileSync(
      SNAPSHOTS_PATH,
      JSON.stringify(Array.from(snapshotsById.values()), null, 2),
      'utf8'
    );
  } catch {
    // Best-effort ephemeral /tmp write
  }
}

hydrateSnapshotsFromTmp();

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') +
    '}'
  );
}

export function buildMasterProvenance(
  docType: DocumentType,
  preflight?: MasterPreflightResult
): MasterProvenance {
  const templateId =
    docType === 'executive-summary'
      ? CANONICAL_RESOURCE_IDS.esTemplate
      : CANONICAL_RESOURCE_IDS.icTemplate;

  if (preflight?.status === 'MASTER_VERIFIED') {
    return {
      masterRevision: `v${preflight.tuple.masterVersion ?? 'live'} (rev ${preflight.tuple.masterRevision ?? 'Drive'})`,
      runtimeManifestStatus: 'MASTER_VERIFIED',
      templateId:
        docType === 'executive-summary'
          ? preflight.tuple.esTemplateId
          : preflight.tuple.icTemplateId,
      driveConnected: true,
      complianceStatus: 'MASTER_PREFLIGHT_ONLY',
      blockReason: 'Live Master control-plane inputs were read, but PDF content/financial/visual parity has NOT been established.',
      preflightTuple: preflight.tuple,
      disclaimer:
        'MASTER PREFLIGHT VERIFIED ONLY: The actual report is a Stage A synthetic rendering, NOT verified compliant with the canonical Master.',
    };
  }

  const status = preflight?.status ?? 'MASTER_ACCESS_BLOCKED';
  return {
    masterRevision: status,
    runtimeManifestStatus: status,
    templateId,
    driveConnected: preflight?.driveConnected ?? false,
    complianceStatus: status,
    blockReason:
      preflight?.blockReason ??
      'MASTER_ACCESS_BLOCKED — Private Google Drive access unavailable for canonical Master/Manifest.',
    preflightTuple: preflight?.tuple,
    disclaimer:
      'MASTER_ACCESS_BLOCKED — Private Google Drive canonical Master/templates inaccessible. Artifact generated with Stage A underwriting engine.',
  };
}

// The immutable analytical snapshot is document-type agnostic. ES and Full IC
// must point to the SAME input+calculation snapshot, with format-specific
// provenance kept on each generated artifact instead of changing its identity.
const SNAPSHOT_ENGINE_CONTRACT = 'stage-a-synthetic-calculations-v2';

function computeSnapshotFingerprint(
  deal: HotelDeal,
  preflight?: MasterPreflightResult
): string {
  const masterAccess = preflight?.status === 'MASTER_VERIFIED'
    ? 'MASTER_PREFLIGHT_ONLY'
    : preflight?.status ?? 'MASTER_ACCESS_BLOCKED';
  // Include verified control-plane revisions so changes never reuse an older
  // analytical snapshot merely because the user did not change hotel inputs.
  const controlPlane = preflight?.status === 'MASTER_VERIFIED'
    ? {
        masterId: preflight.tuple.masterId,
        masterRevision: preflight.tuple.masterRevision,
        masterDigest: preflight.tuple.masterDigest,
        manifestRevision: preflight.tuple.manifestRevision,
        manifestDigest: preflight.tuple.manifestDigest,
        esTemplateDigest: preflight.tuple.esTemplateDigest,
        icTemplateDigest: preflight.tuple.icTemplateDigest,
        methodologyDigest: preflight.tuple.methodologyDigest,
      }
    : null;
  return crypto.createHash('sha256').update(
    canonicalStringify({
      deal,
      masterAccess,
      controlPlane,
      engineContract: SNAPSHOT_ENGINE_CONTRACT,
    })
  ).digest('hex').slice(0, 16);
}

export function freezeOrReuseSnapshot(
  deal: HotelDeal,
  docType: DocumentType,
  requestedSnapshotId?: string,
  preflight?: MasterPreflightResult
): { snapshot: FrozenUnderwritingSnapshot; reused: boolean } {
  const hash = computeSnapshotFingerprint(deal, preflight);

  if (requestedSnapshotId) {
    const existing = snapshotsById.get(requestedSnapshotId);
    // Never silently regenerate using a stale or unrelated frozen snapshot.
    if (!existing || existing.dealId !== deal.id || existing.snapshotHash !== hash) {
      throw new Error(
        'SNAPSHOT_STALE_OR_MISMATCHED: Current deal inputs or control-plane revision differ from the requested snapshot. Generate a new report version instead.'
      );
    }
    return { snapshot: existing, reused: true };
  }

  const existingId = snapshotIdByHash.get(hash);
  if (existingId && snapshotsById.has(existingId)) {
    return { snapshot: snapshotsById.get(existingId)!, reused: true };
  }

  const summary = computeDealSummary(deal);
  const esSections = buildExecutiveSummarySections(deal, summary);
  const icSections = buildFullIcMemoSections(deal, summary);
  const snapshotId = `SNAP-${deal.id}-${hash.slice(0, 8).toUpperCase()}`;

  // This stored object is the common analytical record; renderer provenance
  // gets re-derived for each document type without mutating the snapshot.
  const frozen: FrozenUnderwritingSnapshot = structuredClone({
    snapshotId,
    snapshotHash: hash,
    createdAt: new Date().toISOString(),
    dealId: deal.id,
    dealName: deal.name,
    deal,
    summary,
    esSections,
    icSections,
    masterProvenance: buildMasterProvenance(docType, preflight),
  });

  snapshotsById.set(snapshotId, frozen);
  snapshotIdByHash.set(hash, snapshotId);
  flushSnapshotsToTmp();

  return { snapshot: frozen, reused: false };
}

export function getSnapshotById(snapshotId: string): FrozenUnderwritingSnapshot | undefined {
  return snapshotsById.get(snapshotId);
}

export function getSnapshotCount(): number {
  return snapshotsById.size;
}
