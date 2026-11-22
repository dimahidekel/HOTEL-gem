import crypto from 'node:crypto';
import {
  BackendComplianceCheck,
  DocumentType,
  MasterComplianceStatus,
  MasterPreflightResult,
  MasterPreflightTuple,
} from '../../src/types/factory.ts';
import { buildExecutiveSummarySections, buildFullIcMemoSections } from '../../src/data/memoGenerator.ts';
import { SYNTHETIC_DEALS } from '../../src/data/syntheticDeals.ts';
import { computeDealSummary } from '../../src/utils/financials.ts';

export const CANONICAL_RESOURCE_IDS = {
  master: '1bsFReEIXshrvVCDcetjUESSDhIMaTNE2cTynZbz-kcI',
  runtimeManifest: '1BIb_gUVtwhzqyw2zzY6iig0PgQXrT6dpjqXuBbDcuAY',
  esTemplate: '15eSyQo9mGKw52wnt8U1IARKYbPGqZwqq9_FUHNzDn6c',
  icTemplate: '1tF1ibhiNqTf83_lZzEg64RimbeHLJ0GhnW0Mjeo8WkU',
  methodology: '1WBX9VSnENH0uEZwbxEDBqOFRBNezM_7__HabJwYx5Io',
  executionQa: '1i0H8nbVN15dIXa_s4KbWxWXYexGMwyqq',
  calcHelper: '1erqj0y_CVW95EeO-S0ov-jgZKDBOHYp5',
  continuity: '1kpoITm-KyNQvUTkH7YdyiT24-apnjYuEmSt2c9Zw-J0',
  detroitProfile: '1RQ6ILbms3u2Iw2Xh6h0lpmHieFawtNth',
} as const;

interface DriveFileMetadata {
  id: string;
  name?: string;
  mimeType?: string;
  version?: string;
  modifiedTime?: string;
  headRevisionId?: string;
  capabilities?: {
    canEdit?: boolean;
    canRename?: boolean;
    canDelete?: boolean;
  };
}

const VALID_DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,120}$/;

function isValidDriveId(id: unknown): id is string {
  return typeof id === 'string' && VALID_DRIVE_ID_RE.test(id);
}

function normalizeTextDigest(text: string): string {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

async function verifyReadOnlyTokenScope(
  accessToken: string
): Promise<
  | { ok: true; scopeString: string; email: string | null }
  | { ok: false; reason: string }
> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      { method: 'GET' }
    );
    if (!res.ok) {
      return {
        ok: false,
        reason: `MASTER_ACCESS_BLOCKED: OAuth token verification failed (HTTP ${res.status}). Token may be expired or invalid.`,
      };
    }
    const info = (await res.json()) as { scope?: string; email?: string };
    const scopes = (info.scope ?? '').split(/\s+/).filter(Boolean);
    const hasReadOnly = scopes.includes('https://www.googleapis.com/auth/drive.readonly');
    const hasBroadWriteScope = scopes.some(
      (s) =>
        s === 'https://www.googleapis.com/auth/drive' ||
        s === 'https://www.googleapis.com/auth/drive.file' ||
        s === 'https://www.googleapis.com/auth/drive.appdata'
    );
    if (!hasReadOnly) {
      return {
        ok: false,
        reason:
          'MASTER_ACCESS_BLOCKED: Token is missing the required https://www.googleapis.com/auth/drive.readonly scope.',
      };
    }
    if (hasBroadWriteScope) {
      return {
        ok: false,
        reason:
          'MASTER_ACCESS_BLOCKED: Rejected token carrying write-capable Google Drive scopes. Strictly drive.readonly is required.',
      };
    }
    return { ok: true, scopeString: scopes.join(' '), email: info.email ?? null };
  } catch (err) {
    return {
      ok: false,
      reason: `MASTER_ACCESS_BLOCKED: Unable to verify OAuth token scopes (${err instanceof Error ? err.message : 'network error'}).`,
    };
  }
}

async function fetchDriveMetadata(
  fileId: string,
  accessToken: string
): Promise<{ ok: true; meta: DriveFileMetadata } | { ok: false; status: number; message: string }> {
  if (!isValidDriveId(fileId)) {
    return { ok: false, status: 400, message: `Invalid Drive resource ID format: ${String(fileId)}` };
  }
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,version,modifiedTime,headRevisionId,capabilities(canEdit,canRename,canDelete)&supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      message: `Drive API HTTP ${res.status} on ${fileId}${errText ? `: ${errText.slice(0, 180)}` : ''}`,
    };
  }
  const meta = (await res.json()) as DriveFileMetadata;
  return { ok: true, meta };
}

async function fetchDriveTextContent(
  meta: DriveFileMetadata,
  accessToken: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const isGoogleDoc = meta.mimeType === 'application/vnd.google-apps.document';
  const url = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(meta.id)}/export?mimeType=text/plain`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(meta.id)}?alt=media&supportsAllDrives=true`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      message: `Drive content read HTTP ${res.status} on ${meta.id}${errText ? `: ${errText.slice(0, 180)}` : ''}`,
    };
  }
  const text = await res.text();
  return { ok: true, text };
}

function tryParseManifestJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/^\uFEFF/, '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function extractMasterIdFromManifest(manifest: Record<string, unknown> | null): string | null {
  if (!manifest) return null;
  const candidates: unknown[] = [
    manifest.master_id,
    manifest.masterId,
    manifest.master_file_id,
    manifest.masterFileId,
    (manifest.master as Record<string, unknown> | undefined)?.file_id,
    (manifest.master as Record<string, unknown> | undefined)?.fileId,
    (manifest.master as Record<string, unknown> | undefined)?.id,
    (manifest.control_plane as Record<string, unknown> | undefined)?.file_id,
    (manifest.control_plane as Record<string, unknown> | undefined)?.id,
  ];
  for (const c of candidates) {
    if (isValidDriveId(c)) return c;
  }
  return null;
}

function normalizeHeadingText(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumberedHeadings(text: string, expectedMax: number): string[] {
  const lines = text.split(/\r?\n/);
  const byNumber = new Map<number, string>();
  for (const rawLine of lines) {
    const line = normalizeHeadingText(rawLine);
    const match = line.match(
      /^(?:#{1,4}\s*)?(?:Section\s+)?(\d{1,2})[.:)]\s+([A-Za-z0-9 &/,()-]{3,90})$/i
    );
    if (match) {
      const num = Number(match[1]);
      if (num >= 1 && num <= expectedMax && !byNumber.has(num)) {
        byNumber.set(num, `${num}. ${match[2].trim()}`);
      }
    }
  }
  const ordered: string[] = [];
  for (let i = 1; i <= expectedMax; i++) {
    const v = byNumber.get(i);
    if (v) ordered.push(v);
  }
  return ordered;
}

function buildSectionComplianceChecks(
  esTemplateHeadings?: string[],
  icTemplateHeadings?: string[],
  liveMasterText?: string
): BackendComplianceCheck[] {
  const syn001 = SYNTHETIC_DEALS[0];
  const summary = computeDealSummary(syn001);
  const currentEs = buildExecutiveSummarySections(syn001, summary).map(
    (s) => `${s.number}. ${s.title}`
  );
  const currentIc = buildFullIcMemoSections(syn001, summary).map(
    (s) => `${s.number}. ${s.title}`
  );

  const checks: BackendComplianceCheck[] = [];

  if (esTemplateHeadings && esTemplateHeadings.length > 0) {
    const esMismatches = esTemplateHeadings.filter(
      (h, i) => normalizeHeadingText(currentEs[i] ?? '').toLowerCase() !== normalizeHeadingText(h).toLowerCase()
    );
    checks.push({
      id: 'TEMPLATE-ES-10',
      label: 'ES 10-Section Headings vs Live Drive Template',
      status: esMismatches.length === 0 && esTemplateHeadings.length === 10 ? 'MATCH' : 'GAP',
      detail:
        esMismatches.length === 0 && esTemplateHeadings.length === 10
          ? 'All 10 ES §10 headings match live Drive ES template.'
          : `${esMismatches.length} ES heading variance(s) (${esTemplateHeadings.length}/10 headings parsed): ${esMismatches.slice(0, 3).join('; ')}`,
    });
  } else {
    checks.push({
      id: 'TEMPLATE-ES-10',
      label: 'ES 10-Section Headings vs Live Drive Template',
      status: 'UNVERIFIED',
      detail: 'Canonical ES template headings not loaded from Drive.',
    });
  }

  if (icTemplateHeadings && icTemplateHeadings.length > 0) {
    const icMismatches = icTemplateHeadings.filter(
      (h, i) => normalizeHeadingText(currentIc[i] ?? '').toLowerCase() !== normalizeHeadingText(h).toLowerCase()
    );
    checks.push({
      id: 'TEMPLATE-IC-19',
      label: 'Full IC 19-Section Headings vs Live Drive Template',
      status: icMismatches.length === 0 && icTemplateHeadings.length === 19 ? 'MATCH' : 'GAP',
      detail:
        icMismatches.length === 0 && icTemplateHeadings.length === 19
          ? 'All 19 Full IC §10 headings match live Drive Full IC template.'
          : `${icMismatches.length} Full IC heading variance(s) (${icTemplateHeadings.length}/19 headings parsed): ${icMismatches.slice(0, 3).join('; ')}`,
    });
  } else {
    checks.push({
      id: 'TEMPLATE-IC-19',
      label: 'Full IC 19-Section Headings vs Live Drive Template',
      status: 'UNVERIFIED',
      detail: 'Canonical Full IC template headings not loaded from Drive.',
    });
  }

  if (liveMasterText) {
    const hasDetroitPalette =
      liveMasterText.includes('#183B53') &&
      liveMasterText.includes('#257C83') &&
      liveMasterText.includes('#AB382B');
    const hasRescueRule = /Alternative\s*\/\s*Rescue Strategy/i.test(liveMasterText);
    checks.push({
      id: 'MASTER-UX-V3-POLICY',
      label: 'Detroit UX v3 (§21/§24) & Rescue Strategy (§25) Contract',
      status: hasDetroitPalette && hasRescueRule ? 'MATCH' : 'GAP',
      detail:
        hasDetroitPalette && hasRescueRule
          ? 'Verified live Master §21/§24 Detroit UX v3 palette (#183B53/#257C83/#AB382B) and §25 contract.'
          : 'Live Master missing expected §24/§25 contract markers.',
    });
  }

  return checks;
}

let lastObservedStatus: MasterComplianceStatus = 'MASTER_ACCESS_BLOCKED';
let lastObservedRevision = 'MASTER_ACCESS_BLOCKED';
let lastObservedPreflight: MasterPreflightResult | null = null;

export function getLastObservedMasterStatus(): {
  status: MasterComplianceStatus;
  revision: string;
} {
  return { status: lastObservedStatus, revision: lastObservedRevision };
}

export function getLastObservedPreflight(): MasterPreflightResult | null {
  return lastObservedPreflight;
}

export function buildBlockedPreflight(reason: string): MasterPreflightResult {
  lastObservedStatus = 'MASTER_ACCESS_BLOCKED';
  lastObservedRevision = 'MASTER_ACCESS_BLOCKED';
  const result: MasterPreflightResult = {
    status: 'MASTER_ACCESS_BLOCKED',
    driveConnected: false,
    oauthScopeVerified: null,
    blockReason: reason,
    tuple: {
      manifestId: CANONICAL_RESOURCE_IDS.runtimeManifest,
      manifestName: null,
      manifestVersion: null,
      manifestRevision: null,
      manifestDigest: null,
      masterId: CANONICAL_RESOURCE_IDS.master,
      masterName: null,
      masterVersion: null,
      masterRevision: null,
      masterDigest: null,
      esTemplateId: CANONICAL_RESOURCE_IDS.esTemplate,
      esTemplateRevision: null,
      esTemplateDigest: null,
      icTemplateId: CANONICAL_RESOURCE_IDS.icTemplate,
      icTemplateRevision: null,
      icTemplateDigest: null,
      methodologyId: CANONICAL_RESOURCE_IDS.methodology,
      methodologyRevision: null,
      methodologyDigest: null,
      executionQaId: CANONICAL_RESOURCE_IDS.executionQa,
      executionQaRevision: null,
      calcHelperId: CANONICAL_RESOURCE_IDS.calcHelper,
      calcHelperRevision: null,
      continuityId: CANONICAL_RESOURCE_IDS.continuity,
      continuityRevision: null,
      detroitProfileId: CANONICAL_RESOURCE_IDS.detroitProfile,
      detroitProfileRevision: null,
      pipelineDocId: null,
      pipelineDocRevision: null,
      checkedAt: new Date().toISOString(),
    },
    backendComplianceChecks: buildSectionComplianceChecks(),
  };
  lastObservedPreflight = result;
  return result;
}

export async function resolveMasterPreflightFromDrive(
  accessToken: string | null | undefined,
  docType?: DocumentType
): Promise<MasterPreflightResult> {
  if (!accessToken || !accessToken.trim()) {
    return buildBlockedPreflight(
      'MASTER_ACCESS_BLOCKED: Private Google Drive authorization token is absent. Sign in with Google (drive.readonly) so the private backend can verify live Master and Manifest revisions.'
    );
  }

  const token = accessToken.trim();
  const checkedAt = new Date().toISOString();

  try {
    // 0. Verify OAuth token carries strictly drive.readonly and no write-capable Drive scope
    const scopeCheck = await verifyReadOnlyTokenScope(token);
    if (!scopeCheck.ok) {
      return buildBlockedPreflight(scopeCheck.reason);
    }

    // 1. Read canonical Runtime Manifest (read-only GET)
    const manifestMetaRes = await fetchDriveMetadata(CANONICAL_RESOURCE_IDS.runtimeManifest, token);
    if (!manifestMetaRes.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Cannot read canonical Runtime Manifest (${CANONICAL_RESOURCE_IDS.runtimeManifest}). ${manifestMetaRes.message}`
      );
    }

    const manifestTextRes = await fetchDriveTextContent(manifestMetaRes.meta, token);
    if (!manifestTextRes.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Cannot export Runtime Manifest body. ${manifestTextRes.message}`
      );
    }

    const manifestDigest = normalizeTextDigest(manifestTextRes.text);
    const manifestJson = tryParseManifestJson(manifestTextRes.text);
    const manifestVersion =
      (typeof manifestJson?.manifest_version === 'string' && manifestJson.manifest_version) ||
      (typeof manifestJson?.version === 'string' && manifestJson.version) ||
      manifestMetaRes.meta.version ||
      null;

    // 2. Verify canonical Master document (1bsFReEIXshrvVCDcetjUESSDhIMaTNE2cTynZbz-kcI)
    const manifestDeclaredMasterId = extractMasterIdFromManifest(manifestJson);
    if (
      manifestDeclaredMasterId &&
      manifestDeclaredMasterId !== CANONICAL_RESOURCE_IDS.master
    ) {
      const mismatchTuple: MasterPreflightTuple = {
        manifestId: manifestMetaRes.meta.id,
        manifestName: manifestMetaRes.meta.name ?? null,
        manifestVersion,
        manifestRevision:
          manifestMetaRes.meta.headRevisionId ?? manifestMetaRes.meta.version ?? null,
        manifestDigest,
        masterId: CANONICAL_RESOURCE_IDS.master,
        masterName: null,
        masterVersion: null,
        masterRevision: null,
        masterDigest: null,
        esTemplateId: CANONICAL_RESOURCE_IDS.esTemplate,
        esTemplateRevision: null,
        esTemplateDigest: null,
        icTemplateId: CANONICAL_RESOURCE_IDS.icTemplate,
        icTemplateRevision: null,
        icTemplateDigest: null,
        methodologyId: CANONICAL_RESOURCE_IDS.methodology,
        methodologyRevision: null,
        methodologyDigest: null,
        checkedAt,
      };
      lastObservedStatus = 'BLOCKED_RELEASE_MISMATCH';
      lastObservedRevision = `Manifest points to ${manifestDeclaredMasterId}, expected ${CANONICAL_RESOURCE_IDS.master}`;
      const res: MasterPreflightResult = {
        status: 'BLOCKED_RELEASE_MISMATCH',
        driveConnected: true,
        oauthScopeVerified: scopeCheck.scopeString,
        userEmail: scopeCheck.email,
        blockReason: `BLOCKED_RELEASE_MISMATCH: Runtime Manifest points to Master ${manifestDeclaredMasterId}, expected ${CANONICAL_RESOURCE_IDS.master}.`,
        tuple: mismatchTuple,
      };
      lastObservedPreflight = res;
      return res;
    }

    const mMeta = await fetchDriveMetadata(CANONICAL_RESOURCE_IDS.master, token);
    if (!mMeta.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Canonical Master (${CANONICAL_RESOURCE_IDS.master}) unreadable (${mMeta.message}).`
      );
    }
    const masterMeta = mMeta.meta;
    const mText = await fetchDriveTextContent(masterMeta, token);
    if (!mText.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Unable to export canonical Master content (${mText.message}).`
      );
    }
    const masterDigest = normalizeTextDigest(mText.text);
    const verMatch = mText.text.match(/Canonical Version:\s*([0-9]+\.[0-9]+\.[0-9]+)/i);
    const masterVersion = verMatch ? verMatch[1] : (masterMeta.version ?? null);

    // 3. Resolve ES, IC, Methodology, and supporting Master §11/§21 contracts read-only
    const needEs = !docType || docType === 'executive-summary';
    const needIc = !docType || docType === 'full-ic-memo';

    const [esMetaRes, icMetaRes, methMetaRes, execMetaRes, calcMetaRes, contMetaRes, detMetaRes] =
      await Promise.all([
        needEs ? fetchDriveMetadata(CANONICAL_RESOURCE_IDS.esTemplate, token) : Promise.resolve(null),
        needIc ? fetchDriveMetadata(CANONICAL_RESOURCE_IDS.icTemplate, token) : Promise.resolve(null),
        fetchDriveMetadata(CANONICAL_RESOURCE_IDS.methodology, token),
        fetchDriveMetadata(CANONICAL_RESOURCE_IDS.executionQa, token),
        fetchDriveMetadata(CANONICAL_RESOURCE_IDS.calcHelper, token),
        fetchDriveMetadata(CANONICAL_RESOURCE_IDS.continuity, token),
        fetchDriveMetadata(CANONICAL_RESOURCE_IDS.detroitProfile, token),
      ]);

    if (esMetaRes && !esMetaRes.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Canonical ES template (${CANONICAL_RESOURCE_IDS.esTemplate}) unreadable (${esMetaRes.message}).`
      );
    }
    if (icMetaRes && !icMetaRes.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Canonical Full IC template (${CANONICAL_RESOURCE_IDS.icTemplate}) unreadable (${icMetaRes.message}).`
      );
    }
    if (!methMetaRes.ok) {
      return buildBlockedPreflight(
        `MASTER_ACCESS_BLOCKED: Canonical Methodology (${CANONICAL_RESOURCE_IDS.methodology}) unreadable (${methMetaRes.message}).`
      );
    }

    let esHeadings: string[] | undefined;
    let esDigest: string | null = null;
    if (esMetaRes && esMetaRes.ok) {
      const esTextRes = await fetchDriveTextContent(esMetaRes.meta, token);
      if (esTextRes.ok) {
        esDigest = normalizeTextDigest(esTextRes.text);
        esHeadings = extractNumberedHeadings(esTextRes.text, 10);
      }
    }

    let icHeadings: string[] | undefined;
    let icDigest: string | null = null;
    if (icMetaRes && icMetaRes.ok) {
      const icTextRes = await fetchDriveTextContent(icMetaRes.meta, token);
      if (icTextRes.ok) {
        icDigest = normalizeTextDigest(icTextRes.text);
        icHeadings = extractNumberedHeadings(icTextRes.text, 19);
      }
    }

    const methTextRes = await fetchDriveTextContent(methMetaRes.meta, token);
    const methodologyDigest = methTextRes.ok ? normalizeTextDigest(methTextRes.text) : null;

    // Read-only lookup for HOTEL_WORK_PROJECT_PIPELINE_v1.0.md
    let pipelineDocId: string | null = null;
    let pipelineDocRevision: string | null = null;
    try {
      const pipeSearchUrl =
        'https://www.googleapis.com/drive/v3/files?q=' +
        encodeURIComponent("name contains 'HOTEL_WORK_PROJECT_PIPELINE' and trashed = false") +
        '&fields=files(id,name,version,headRevisionId)&supportsAllDrives=true&includeItemsFromAllDrives=true';
      const pipeRes = await fetch(pipeSearchUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pipeRes.ok) {
        const pipeData = (await pipeRes.json()) as { files?: DriveFileMetadata[] };
        const first = pipeData.files?.[0];
        if (first) {
          pipelineDocId = first.id;
          pipelineDocRevision = first.headRevisionId ?? first.version ?? null;
        }
      }
    } catch {
      // Non-fatal optional metadata lookup
    }

    const expectedMasterVer =
      (typeof manifestJson?.master_version === 'string' && manifestJson.master_version) ||
      (typeof (manifestJson?.master as Record<string, unknown> | undefined)?.version === 'string' &&
        ((manifestJson?.master as Record<string, unknown>).version as string)) ||
      null;

    const tuple: MasterPreflightTuple = {
      manifestId: manifestMetaRes.meta.id,
      manifestName: manifestMetaRes.meta.name ?? null,
      manifestVersion,
      manifestRevision: manifestMetaRes.meta.headRevisionId ?? manifestMetaRes.meta.version ?? null,
      manifestDigest,
      masterId: masterMeta.id,
      masterName: masterMeta.name ?? null,
      masterVersion,
      masterRevision: masterMeta.headRevisionId ?? masterMeta.version ?? null,
      masterDigest,
      esTemplateId: CANONICAL_RESOURCE_IDS.esTemplate,
      esTemplateRevision:
        esMetaRes && esMetaRes.ok ? (esMetaRes.meta.headRevisionId ?? esMetaRes.meta.version ?? null) : null,
      esTemplateDigest: esDigest,
      icTemplateId: CANONICAL_RESOURCE_IDS.icTemplate,
      icTemplateRevision:
        icMetaRes && icMetaRes.ok ? (icMetaRes.meta.headRevisionId ?? icMetaRes.meta.version ?? null) : null,
      icTemplateDigest: icDigest,
      methodologyId: CANONICAL_RESOURCE_IDS.methodology,
      methodologyRevision: methMetaRes.meta.headRevisionId ?? methMetaRes.meta.version ?? null,
      methodologyDigest,
      executionQaId: CANONICAL_RESOURCE_IDS.executionQa,
      executionQaRevision: execMetaRes.ok ? (execMetaRes.meta.headRevisionId ?? execMetaRes.meta.version ?? null) : null,
      calcHelperId: CANONICAL_RESOURCE_IDS.calcHelper,
      calcHelperRevision: calcMetaRes.ok ? (calcMetaRes.meta.headRevisionId ?? calcMetaRes.meta.version ?? null) : null,
      continuityId: CANONICAL_RESOURCE_IDS.continuity,
      continuityRevision: contMetaRes.ok ? (contMetaRes.meta.headRevisionId ?? contMetaRes.meta.version ?? null) : null,
      detroitProfileId: CANONICAL_RESOURCE_IDS.detroitProfile,
      detroitProfileRevision: detMetaRes.ok ? (detMetaRes.meta.headRevisionId ?? detMetaRes.meta.version ?? null) : null,
      pipelineDocId,
      pipelineDocRevision,
      checkedAt,
    };

    const backendComplianceChecks = buildSectionComplianceChecks(esHeadings, icHeadings, mText.text);

    if (expectedMasterVer && masterVersion && expectedMasterVer !== masterVersion) {
      lastObservedStatus = 'BLOCKED_RELEASE_MISMATCH';
      lastObservedRevision = `v${masterVersion} (mismatch vs manifest v${expectedMasterVer})`;
      const mismatchResult: MasterPreflightResult = {
        status: 'BLOCKED_RELEASE_MISMATCH',
        driveConnected: true,
        oauthScopeVerified: scopeCheck.scopeString,
        userEmail: scopeCheck.email,
        blockReason: `BLOCKED_RELEASE_MISMATCH: Manifest declares Master v${expectedMasterVer}, live Master reads v${masterVersion}.`,
        tuple,
        esTemplateHeadings: esHeadings,
        icTemplateHeadings: icHeadings,
        backendComplianceChecks,
      };
      lastObservedPreflight = mismatchResult;
      return mismatchResult;
    }

    lastObservedStatus = 'MASTER_VERIFIED';
    lastObservedRevision = `v${masterVersion ?? 'resolved'} (rev ${tuple.masterRevision ?? 'live'})`;

    const verifiedResult: MasterPreflightResult = {
      status: 'MASTER_VERIFIED',
      driveConnected: true,
      oauthScopeVerified: scopeCheck.scopeString,
      userEmail: scopeCheck.email,
      blockReason: null,
      tuple,
      esTemplateHeadings: esHeadings,
      icTemplateHeadings: icHeadings,
      backendComplianceChecks,
    };
    lastObservedPreflight = verifiedResult;
    return verifiedResult;
  } catch (err) {
    return buildBlockedPreflight(
      `MASTER_ACCESS_BLOCKED: Private Google Drive lookup failed (${err instanceof Error ? err.message : 'network error'}).`
    );
  }
}
