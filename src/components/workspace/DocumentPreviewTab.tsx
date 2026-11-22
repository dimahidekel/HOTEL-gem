import React from 'react';
import { AlertCircle, CheckCircle2, Download, FileText } from 'lucide-react';
import {
  buildExecutiveSummarySections,
  buildFullIcMemoSections,
} from '../../data/memoGenerator';
import { HotelDeal } from '../../types/underwriting';
import {
  DocumentType,
  GeneratedArtifactRecord,
  MasterPreflightResult,
} from '../../types/factory';
import { DealSummaryMetrics } from '../../utils/financials';
import { InvestmentDecisionScreen } from './InvestmentDecisionScreen';

export const DocumentPreviewTab: React.FC<{
  deal: HotelDeal;
  summary: DealSummaryMetrics;
  mode: DocumentType;
  artifacts?: GeneratedArtifactRecord[];
  masterPreflight?: MasterPreflightResult | null;
  isGenerating?: DocumentType | null;
  onGenerate?: (docType: DocumentType, reuseSnapshotId?: string) => void;
}> = ({
  deal,
  summary,
  mode,
  artifacts = [],
  masterPreflight = null,
  isGenerating = null,
  onGenerate,
}) => {
  const isEs = mode === 'executive-summary';
  const reportLabel = isEs ? 'ES PDF' : 'Full IC PDF';
  const sections = isEs
    ? buildExecutiveSummarySections(deal, summary)
    : buildFullIcMemoSections(deal, summary);

  const matchingLatest = artifacts.find(
    (a) => a.dealId === deal.id && a.docType === mode && a.qaPassed
  );
  const matchingPdf =
    matchingLatest?.files.find((f) => f.format === 'pdf') ?? null;

  const liveMasterStatus =
    matchingLatest?.masterProvenance.complianceStatus ??
    masterPreflight?.status ??
    'MASTER_ACCESS_BLOCKED';
  // Preflight is not PDF compliance; Stage A PDFs cannot be certified Master-compliant.
  const isVerified = false;

  return (
    <div className="space-y-6">
      {/* Report Status & Single Primary PDF Action Bar */}
      <div className="bg-slate-900 text-slate-100 rounded-md p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          {isVerified ? (
            <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="text-sm">
            <div className="font-semibold text-white">
              {isVerified
                ? `${isEs ? 'Executive Summary' : 'Full IC Memo'} — Canonical Master Verified (${masterPreflight?.tuple.masterVersion ? `v${masterPreflight.tuple.masterVersion}` : 'Live Drive'})`
                : `${liveMasterStatus === 'MASTER_VERIFIED' ? 'MASTER_PREFLIGHT_ONLY' : liveMasterStatus} — Synthetic Underwriting Preview`}
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              {isVerified
                ? `Resolved read-only from Manifest ${masterPreflight?.tuple.manifestId ?? ''} (${sections.length} numbered sections). Generating produces one downloadable ${reportLabel} while internal DOCX, XLSX, snapshot, and QA deliverables are archived.`
                : masterPreflight?.blockReason ||
                  `This ${isEs ? 'Executive Summary (10 numbered sections)' : 'Full IC Memo (19 numbered sections)'} is generated from synthetic hotel data. Private Google Drive access to the canonical Master & templates is unavailable.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {matchingPdf && (
            <a
              href={matchingPdf.downloadUrl}
              download={matchingPdf.filename}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#0D7377] hover:bg-[#0A5C60] text-white rounded focus-visible:outline-2 focus-visible:outline-teal-400 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Download {reportLabel} ({(matchingPdf.byteSize / 1024).toFixed(1)} KB)
              </span>
            </a>
          )}

          {onGenerate && (
            <button
              type="button"
              disabled={isGenerating !== null}
              onClick={() => onGenerate(mode)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded focus-visible:outline-2 focus-visible:outline-teal-400 disabled:opacity-50 whitespace-nowrap"
            >
              {isGenerating === mode
                ? 'Generating & Running QA...'
                : matchingPdf
                  ? `Regenerate ${reportLabel}`
                  : `Generate ${reportLabel}`}
            </button>
          )}
        </div>
      </div>

      {/* Document Shell */}
      <article className="bg-white border border-slate-200 rounded-md shadow-xs">
        {/* Document Masthead */}
        <header className="px-8 py-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isEs ? 'EXECUTIVE SUMMARY' : 'FULL INVESTMENT COMMITTEE MEMORANDUM'}</span>
              <span aria-hidden="true">·</span>
              <span>{sections.length} NUMBERED SECTIONS</span>
            </div>
            <h2 className="mt-1.5 text-2xl font-semibold text-slate-900 tracking-tight">
              {deal.name} ({deal.id})
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {deal.location} · {deal.rooms} Keys · {deal.brand} · Synthetic Demonstration File
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 sm:text-right">
            <div>Prepared: {deal.createdAt}</div>
            <div>Status: {liveMasterStatus}</div>
          </div>
        </header>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Unnumbered Investment Decision Screen */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-3">
              Unnumbered Cover Schedule · Investment Decision Screen
            </div>
            <InvestmentDecisionScreen deal={deal} summary={summary} embeddedInDocument />
          </div>

          {/* Section Jump Index for Full IC Memo */}
          {!isEs && (
            <nav
              aria-label="IC Memo Section Index"
              className="bg-slate-50 border border-slate-200 rounded-md p-5"
            >
              <div className="text-xs font-semibold text-slate-700 mb-2.5">
                Memorandum Table of Contents (19 Numbered Sections)
              </div>
              <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-xs text-slate-600">
                {sections.map((sec) => (
                  <li key={sec.number}>
                    <a
                      href={`#ic-section-${sec.number}`}
                      className="hover:text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
                    >
                      <span className="font-mono font-semibold text-slate-800 mr-1.5">
                        {sec.number}.
                      </span>
                      {sec.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Numbered Sections */}
          <div className="divide-y divide-slate-200">
            {sections.map((sec) => (
              <section
                key={sec.number}
                id={`ic-section-${sec.number}`}
                className="py-6 first:pt-2 last:pb-2 space-y-3"
              >
                <h3 className="text-base font-semibold text-slate-900">
                  <span className="font-mono text-teal-800 mr-2">{sec.number}.</span>
                  {sec.title}
                </h3>

                {sec.keyMetrics && sec.keyMetrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
                    {sec.keyMetrics.map((m) => (
                      <div
                        key={m.label}
                        className="bg-slate-50 border border-slate-200 rounded px-3.5 py-2.5"
                      >
                        <div className="text-[11px] text-slate-500">{m.label}</div>
                        <div className="mt-0.5 text-sm font-semibold font-mono tabular-nums text-slate-900">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sec.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-sm text-slate-700 leading-relaxed max-w-4xl">
                    {p}
                  </p>
                ))}

                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside max-w-4xl pt-1">
                    {sec.bullets.map((b, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
};
