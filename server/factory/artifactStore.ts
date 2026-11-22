import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ArtifactFileInfo,
  DocumentType,
  GeneratedArtifactRecord,
} from '../../src/types/factory.ts';

const ARTIFACT_BASE_DIR = path.resolve('/tmp/hotel-work-factory-artifacts');
const REGISTRY_PATH = path.resolve(ARTIFACT_BASE_DIR, 'registry.json');
fs.mkdirSync(ARTIFACT_BASE_DIR, { recursive: true });

const artifactRegistry = new Map<string, GeneratedArtifactRecord>();
const versionCounters = new Map<string, number>();

function hydrateRegistryFromTmp() {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return;
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(raw) as GeneratedArtifactRecord[];
    if (Array.isArray(parsed)) {
      for (const rec of parsed) {
        if (rec && rec.artifactId) {
          artifactRegistry.set(rec.artifactId, rec);
          const key = `${rec.dealId}:${rec.docType}`;
          const prev = versionCounters.get(key) ?? 0;
          if (rec.version > prev) {
            versionCounters.set(key, rec.version);
          }
        }
      }
    }
  } catch {
    // Ignore corrupted ephemeral /tmp cache
  }
}

function flushRegistryToTmp() {
  try {
    fs.writeFileSync(
      REGISTRY_PATH,
      JSON.stringify(Array.from(artifactRegistry.values()), null, 2),
      'utf8'
    );
  } catch {
    // Ephemeral /tmp write best-effort
  }
}

hydrateRegistryFromTmp();

export function nextArtifactVersion(dealId: string, docType: DocumentType): number {
  const key = `${dealId}:${docType}`;
  const next = (versionCounters.get(key) ?? 0) + 1;
  versionCounters.set(key, next);
  return next;
}

function safeResolveArtifactPath(artifactId: string, filename: string): string {
  const safeId = artifactId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
  const resolved = path.resolve(ARTIFACT_BASE_DIR, safeId, safeName);
  if (!resolved.startsWith(ARTIFACT_BASE_DIR + path.sep)) {
    throw new Error('Invalid artifact storage path.');
  }
  return resolved;
}

export function persistArtifactFiles(
  artifactId: string,
  files: {
    format: 'docx' | 'pdf' | 'xlsx';
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }[]
): ArtifactFileInfo[] {
  const safeDir = path.resolve(
    ARTIFACT_BASE_DIR,
    artifactId.replace(/[^a-zA-Z0-9_-]/g, '')
  );
  if (!safeDir.startsWith(ARTIFACT_BASE_DIR + path.sep)) {
    throw new Error('Invalid artifact directory.');
  }
  fs.mkdirSync(safeDir, { recursive: true });

  return files.map((f) => {
    const filePath = safeResolveArtifactPath(artifactId, f.filename);
    fs.writeFileSync(filePath, f.buffer);
    const sha256 = crypto.createHash('sha256').update(f.buffer).digest('hex');
    return {
      format: f.format,
      filename: path.basename(filePath),
      mimeType: f.mimeType,
      byteSize: f.buffer.length,
      sha256,
      downloadUrl: `/api/factory/artifacts/${encodeURIComponent(artifactId)}/download?format=${f.format}`,
    };
  });
}

export function registerArtifactRecord(record: GeneratedArtifactRecord) {
  artifactRegistry.set(record.artifactId, record);
  flushRegistryToTmp();
}

export function getArtifactRecord(artifactId: string): GeneratedArtifactRecord | undefined {
  return artifactRegistry.get(artifactId);
}

export function listArtifactsForDeal(dealId?: string): GeneratedArtifactRecord[] {
  const all = Array.from(artifactRegistry.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  return dealId ? all.filter((a) => a.dealId === dealId) : all;
}

export function readPersistedArtifactBuffer(
  artifactId: string,
  format: 'docx' | 'pdf' | 'xlsx'
): { buffer: Buffer; fileInfo: ArtifactFileInfo } | null {
  const record = artifactRegistry.get(artifactId);
  if (!record || !record.qaPassed) return null;
  const fileInfo = record.files.find((f) => f.format === format);
  if (!fileInfo) return null;

  const filePath = safeResolveArtifactPath(artifactId, fileInfo.filename);
  if (!fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  const actualSha = crypto.createHash('sha256').update(buffer).digest('hex');
  if (actualSha !== fileInfo.sha256) {
    return null;
  }

  return {
    buffer,
    fileInfo,
  };
}

export function getArtifactCount(): number {
  return artifactRegistry.size;
}
