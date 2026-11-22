import React from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  DocumentType,
  GeneratedArtifactRecord,
  MasterPreflightResult,
} from '../../types/factory';

interface DocumentFactoryPanelProps {
  dealId: string;
  artifacts: GeneratedArtifactRecord[];
  masterPreflight: MasterPreflightResult | null;
  isGenerating: DocumentType | null;
  error: string | null;
  onGenerate: (docType: DocumentType, reuseSnapshotId?: string) => void;
}

export const DocumentFactoryPanel: React.FC<DocumentFactoryPanelProps> = ({
  dealId,
  artifacts,
  masterPreflight,
  isGenerating,
  error,
  onGenerate,
}) => {
  const dealArtifacts = artifacts.filter((a) => a.dealId === dealId);
  const latest = dealArtifacts[0] ?? null;

  const latestPdf = latest?.files.find((f) => f.format === 'pdf') ?? null;
  const masterStatus =
    latest?.masterProvenance.complianceStatus ??
    masterPreflight?.status ??
    'MASTER_ACCESS_BLOCKED';
  // Only a full content/financial/visual compliance audit could certify report fidelity.
  const isMasterVerified = false; // No PDF parity certification has been implemented.
  const preflightVerified = masterPreflight?.status === 'MASTER_VERIFIED';

  const docTitleLabel = (docType: DocumentType) =>
    docType === 'executive-summary' ? 'ES PDF' : 'Full IC PDF';

  return (
    <section
      aria-label="Report Deliverables, Version History, and Internal QA"
      className="bg-white border border-slate-200 rounded-md overflow-hidden"
    >
      {/* Provenance & Internal Archive Header */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-slate-900">
            Document Factory &amp; PDF Deliverables
          </span>
          <span aria-hidden="true">·</span>
          <span
            className={`font-mono font-semibold ${
              isMasterVerified
                ? 'text-teal-800'
                : masterStatus === 'BLOCKED_RELEASE_MISMATCH'
                  ? 'text-red-800'
                  : 'text-amber-800'
            }`}
          >
            {masterStatus}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-600">
            {isMasterVerified
              ? `Master ${latest?.masterProvenance.masterRevision ?? masterPreflight?.tuple.masterVersion ?? 'Verified'}`
              : masterStatus === 'MASTER_PREFLIGHT_ONLY'
                ? 'Live Master read; this PDF has NOT passed canonical content and visual parity QA'
                : preflightVerified
                  ? 'Live Master connected; this earlier PDF remains a synthetic, non-compliant preview'
                  : 'Master access not verified for this PDF — synthetic demonstration only'}
          </span>
        </div>

        <div className="font-mono text-slate-600">
          PDF Versions ({dealId}): {dealArtifacts.length}
        </div>
      </div>

      {/* Live Generation Progress */}
      {isGenerating && (
        <div
          role="status"
          className="px-5 py-3.5 bg-teal-50/70 border-b border-teal-200 flex items-center gap-3 text-sm text-teal-950"
        >
          <RefreshCw className="w-4 h-4 text-teal-700 animate-spin shrink-0" aria-hidden="true" />
          <div>
            <span className="font-medium">
              Generating{' '}
              {isGenerating === 'executive-summary'
                ? 'Executive Summary PDF (10 sections)'
                : 'Full IC Memo PDF (19 sections)'}
              :
            </span>{' '}
            <span className="text-slate-700">
              Freezing snapshot → Building internal DOCX/XLSX/Source Register → Rendering PDF → Running QA gate...
            </span>
          </div>
        </div>
      )}

      {/* Server / Gate Error */}
      {error && (
        <div
          role="alert"
          className="px-5 py-3.5 bg-red-50 border-b border-red-200 text-sm text-red-900 flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="font-semibold">Document Factory Gate Notice:</strong> {error}
          </div>
        </div>
      )}

      {/* Active Deliverable Card (ONE Primary Downloadable PDF) */}
      {latest ? (
        <div className="p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-600">
                <span className="font-semibold text-slate-900">{latest.artifactId}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {docTitleLabel(latest.docType)} v{latest.version}
                </span>
                <span aria-hidden="true">·</span>
                <span>Snapshot {latest.snapshotId}</span>
                {latest.reusedFrozenSnapshot && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-teal-800 font-medium">Frozen Snapshot Reused</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{latest.pdfPageCount} PDF pages</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                {latest.qaPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
                )}
                <span className="font-semibold text-slate-900">
                  {latest.qaPassed
                    ? `${docTitleLabel(latest.docType)} Ready — All ${latest.qaChecks.length} QA Checks Passed`
                    : 'QA Release Gate Blocked — Primary PDF Download Withheld'}
                </span>
              </div>

              <div className="text-xs text-slate-600">
                Internal Master Deliverables Archived:{' '}
                <span className="font-mono text-slate-800">
                  DOCX ({latest.docxParagraphCount} paragraphs)
                  {latest.xlsxFormulaCount > 0
                    ? ` · XLSX (${latest.xlsxFormulaCount} live formulas)`
                    : ''}
                  {' · '}Snapshot Hash {latest.snapshotHash.slice(0, 10)} · Source Register &amp; QA Log
                </span>
              </div>
            </div>

            {/* Single Primary PDF Download + Regenerate */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {latestPdf ? (
                <a
                  href={latestPdf.downloadUrl}
                  download={latestPdf.filename}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Download {docTitleLabel(latest.docType)} (
                    {(latestPdf.byteSize / 1024).toFixed(1)} KB)
                  </span>
                </a>
              ) : (
                <span className="text-xs font-mono text-red-700 font-semibold">
                  PDF Download Blocked by QA
                </span>
              )}

              <button
                type="button"
                disabled={isGenerating !== null}
                onClick={() => onGenerate(latest.docType)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Regenerate {docTitleLabel(latest.docType)}</span>
              </button>
            </div>
          </div>

          {/* QA Checks Table */}
          <div className="border border-slate-200 rounded overflow-hidden overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2 px-3">Check ID</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">QA Verification</th>
                  <th className="py-2 px-3">Observed Evidence</th>
                  <th className="py-2 px-3 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latest.qaChecks.map((qc) => (
                  <tr key={qc.id}>
                    <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{qc.id}</td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{qc.category}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{qc.label}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{qc.detail}</td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        qc.passed ? 'text-teal-800' : 'text-red-700'
                      }`}
                    >
                      {qc.passed ? 'PASS' : 'FAIL'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PDF Version History */}
          {dealArtifacts.length > 1 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2">
                PDF Version History ({dealId})
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded">
                {dealArtifacts.slice(1).map((art) => {
                  const pdfFile = art.files.find((f) => f.format === 'pdf');
                  return (
                    <div
                      key={art.artifactId}
                      className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="font-mono text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-slate-900">{art.artifactId}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {docTitleLabel(art.docType)} v{art.version}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{art.pdfPageCount}p</span>
                        <span aria-hidden="true">·</span>
                        <span>{art.snapshotId}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            art.masterProvenance.complianceStatus === 'MASTER_VERIFIED'
                              ? 'text-teal-800'
                              : 'text-amber-800'
                          }
                        >
                          {art.masterProvenance.complianceStatus}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={art.qaPassed ? 'text-teal-800' : 'text-red-700'}>
                          {art.qaPassed ? 'QA PASS' : 'BLOCKED'}
                        </span>
                      </div>
                      <div>
                        {pdfFile ? (
                          <a
                            href={pdfFile.downloadUrl}
                            download={pdfFile.filename}
                            className="inline-flex items-center gap-1 text-teal-800 hover:underline font-mono font-medium"
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            <span>Download PDF</span>
                          </a>
                        ) : (
                          <span className="font-mono text-slate-400">Blocked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 py-4 text-xs text-slate-600 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span>
            No PDF deliverables generated for <strong>{dealId}</strong> in this session yet. Step 1: update data or evidence if needed; Step 2: click{' '}
            <strong>Generate Executive Summary</strong> or <strong>Generate Full IC</strong> to produce a primary downloadable PDF while archiving internal DOCX, XLSX, snapshot, and QA files.
          </span>
        </div>
      )}
    </section>
  );
};
