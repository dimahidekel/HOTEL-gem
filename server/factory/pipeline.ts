import { HotelDeal } from '../../src/types/underwriting.ts';
import {
  DocumentType,
  GeneratedArtifactRecord,
  MasterPreflightResult,
} from '../../src/types/factory.ts';
import { buildMasterProvenance, freezeOrReuseSnapshot } from './snapshotStore.ts';
import { generateDocxArtifact } from './docxGenerator.ts';
import { generatePdfArtifact } from './pdfGenerator.ts';
import { generateXlsxWorkbook } from './xlsxGenerator.ts';
import { runArtifactQa } from './artifactQa.ts';
import {
  nextArtifactVersion,
  persistArtifactFiles,
  registerArtifactRecord,
} from './artifactStore.ts';

export async function runStageADocumentPipeline(params: {
  deal: HotelDeal;
  docType: DocumentType;
  requestedSnapshotId?: string;
  masterPreflight?: MasterPreflightResult;
}): Promise<GeneratedArtifactRecord> {
  const { deal, docType, requestedSnapshotId, masterPreflight } = params;

  // 1. Freeze or reuse immutable underwriting snapshot
  const { snapshot: commonSnapshot, reused } = freezeOrReuseSnapshot(
    deal,
    docType,
    requestedSnapshotId,
    masterPreflight
  );
  // Report-specific labeling is a derived view, not part of the immutable
  // analytical identity shared by ES and Full IC.
  const snapshot = {
    ...commonSnapshot,
    masterProvenance: buildMasterProvenance(docType, masterPreflight),
  };

  // 2. Render internal DOCX + primary PDF (+ live-formula XLSX workbook for Full IC)
  const [{ buffer: docxBuffer, paragraphCount }, { buffer: pdfBuffer, pageCount }] =
    await Promise.all([
      generateDocxArtifact(snapshot, docType),
      generatePdfArtifact(snapshot, docType),
    ]);

  let xlsxBuffer: Buffer | undefined;
  let xlsxFormulaCount = 0;
  if (docType === 'full-ic-memo') {
    const xlsxRes = await generateXlsxWorkbook(snapshot);
    xlsxBuffer = xlsxRes.buffer;
    xlsxFormulaCount = xlsxRes.formulaCount;
  }

  // 3. Numerical, DOCX OOXML, PDF coordinate/layout, and XLSX formula QA
  const qa = await runArtifactQa({
    snapshot,
    docType,
    docxBuffer,
    pdfBuffer,
    xlsxBuffer,
  });

  // 4. Version & persist ALL internal + primary deliverables (block release if QA failed)
  const version = nextArtifactVersion(deal.id, docType);
  const prefix = docType === 'executive-summary' ? 'ES' : 'IC';
  const artifactId = `${prefix}-${deal.id}-v${version}-${snapshot.snapshotHash.slice(0, 6).toUpperCase()}`;
  const statusTag = snapshot.masterProvenance.complianceStatus;

  const filesToWrite: {
    format: 'docx' | 'pdf' | 'xlsx';
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }[] = [
    {
      format: 'docx',
      filename: `${artifactId}_${statusTag}.docx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxBuffer,
    },
    {
      format: 'pdf',
      filename: `${artifactId}_${statusTag}.pdf`,
      mimeType: 'application/pdf',
      buffer: pdfBuffer,
    },
  ];

  if (xlsxBuffer) {
    filesToWrite.push({
      format: 'xlsx',
      filename: `${artifactId}_MODEL_${statusTag}.xlsx`,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: xlsxBuffer,
    });
  }

  const persistedFiles = qa.qaPassed
    ? persistArtifactFiles(artifactId, filesToWrite)
    : [];

  const releaseStatus: GeneratedArtifactRecord['releaseStatus'] = !qa.qaPassed
    ? 'BLOCKED_QA_FAILED'
    : statusTag === 'MASTER_PREFLIGHT_ONLY'
        ? 'SYNTHETIC_QA_PASSED_NOT_MASTER_COMPLIANT'
        : 'MASTER_ACCESS_BLOCKED_SYNTHETIC_QA_PASSED';

  const record: GeneratedArtifactRecord = {
    artifactId,
    snapshotId: snapshot.snapshotId,
    snapshotHash: snapshot.snapshotHash,
    dealId: deal.id,
    dealName: deal.name,
    docType,
    version,
    createdAt: new Date().toISOString(),
    reusedFrozenSnapshot: reused,
    masterProvenance: snapshot.masterProvenance,
    releaseStatus,
    qaPassed: qa.qaPassed,
    qaChecks: qa.qaChecks,
    pdfPageCount: qa.pdfPageCount || pageCount,
    docxParagraphCount: paragraphCount,
    xlsxFormulaCount,
    files: persistedFiles,
  };

  registerArtifactRecord(record);
  return record;
}
