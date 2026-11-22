import React, { useEffect, useState } from 'react';
import {
  Download,
  Edit3,
  FileCheck2,
  FileText,
} from 'lucide-react';
import { HotelDeal, WorkspaceTab } from '../types/underwriting';
import {
  DocumentType,
  GeneratedArtifactRecord,
  MasterPreflightResult,
} from '../types/factory';
import { computeDealSummary, formatCurrency } from '../utils/financials';
import { PostureLabel } from './ui/PostureText';
import { InvestmentDecisionScreen } from './workspace/InvestmentDecisionScreen';
import { FinancialPerformanceTab } from './workspace/FinancialPerformanceTab';
import { ValuationSensitivitiesTab } from './workspace/ValuationSensitivitiesTab';
import { MarketLocationTab } from './workspace/MarketLocationTab';
import { RisksEvidenceTab } from './workspace/RisksEvidenceTab';
import { DocumentPreviewTab } from './workspace/DocumentPreviewTab';
import { DocumentsQaTab } from './workspace/DocumentsQaTab';
import { DocumentFactoryPanel } from './workspace/DocumentFactoryPanel';
import { UpdateDealEvidenceDrawer } from './workspace/UpdateDealEvidenceDrawer';

/** A calm four-destination navigation; the existing eight analytical views
 * remain available as contextual secondary choices, not eight equal tabs. */
const WORKSPACE_GROUPS: { label: string; primary: WorkspaceTab; tabs: WorkspaceTab[] }[] = [
  { label: 'Overview', primary: 'decision-screen', tabs: ['decision-screen'] },
  { label: 'Data & Evidence', primary: 'risks-evidence', tabs: ['risks-evidence'] },
  { label: 'Analysis', primary: 'financials', tabs: ['financials', 'valuation', 'market'] },
  { label: 'Documents', primary: 'documents-qa', tabs: ['documents-qa', 'executive-summary', 'full-ic-memo'] },
];

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'decision-screen', label: 'Investment Decision Screen' },
  { id: 'financials', label: 'Financial Performance' },
  { id: 'valuation', label: 'Valuation & Sensitivities' },
  { id: 'market', label: 'Market & Location' },
  { id: 'risks-evidence', label: 'Risks, Evidence & Conflicts' },
  { id: 'executive-summary', label: 'Executive Summary' },
  { id: 'full-ic-memo', label: 'Full IC Memo' },
  { id: 'documents-qa', label: 'Documents & QA' },
];

interface DealWorkspaceViewProps {
  deals: HotelDeal[];
  selectedDealId: string;
  activeTab: WorkspaceTab;
  onSelectDeal: (dealId: string) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onUpdateDeal: (updated: HotelDeal, summaryText: string) => void;
  driveAuthToken: string | null;
  masterPreflight: MasterPreflightResult | null;
}

export const DealWorkspaceView: React.FC<DealWorkspaceViewProps> = ({
  deals,
  selectedDealId,
  activeTab,
  onSelectDeal,
  onSelectTab,
  onUpdateDeal,
  driveAuthToken,
  masterPreflight,
}) => {
  const deal = deals.find((d) => d.id === selectedDealId) ?? deals[0];
  const [artifacts, setArtifacts] = useState<GeneratedArtifactRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState<DocumentType | null>(null);
  const [factoryError, setFactoryError] = useState<string | null>(null);
  const [showUpdateDrawer, setShowUpdateDrawer] = useState(false);
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setUpdateNotice(null);
    setShowUpdateDrawer(false);
    fetch(`/api/factory/artifacts?dealId=${encodeURIComponent(deal?.id ?? '')}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { artifacts?: GeneratedArtifactRecord[] } | null) => {
        if (active && data?.artifacts) {
          setArtifacts(data.artifacts);
        }
      })
      .catch(() => {
        // Ignore network errors during static checks
      });
    return () => {
      active = false;
    };
  }, [deal?.id]);

  if (!deal) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-sm text-slate-600">
        No hotel deals available in the current session.
      </div>
    );
  }

  const summary = computeDealSummary(deal);
  const latestEs = artifacts.find(
    (a) => a.dealId === deal.id && a.docType === 'executive-summary' && a.qaPassed
  );
  const latestIc = artifacts.find(
    (a) => a.dealId === deal.id && a.docType === 'full-ic-memo' && a.qaPassed
  );
  const latestEsPdf = latestEs?.files.find((f) => f.format === 'pdf') ?? null;
  const latestIcPdf = latestIc?.files.find((f) => f.format === 'pdf') ?? null;

  const handleGenerateDocument = async (
    docType: DocumentType,
    reuseSnapshotId?: string
  ) => {
    setIsGenerating(docType);
    setFactoryError(null);
    setUpdateNotice(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (driveAuthToken) {
        headers.Authorization = `Bearer ${driveAuthToken}`;
      }

      const response = await fetch('/api/factory/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dealId: deal.id,
          docType,
          snapshotId: reuseSnapshotId,
        }),
      });
      const payload = (await response.json()) as GeneratedArtifactRecord & {
        error?: string;
      };
      if (!response.ok && !payload.artifactId) {
        throw new Error(payload.error || 'Document generation failed.');
      }
      setArtifacts((prev) => [payload, ...prev.filter((a) => a.artifactId !== payload.artifactId)]);
      if (!payload.qaPassed) {
        setFactoryError(
          `QA gate blocked release for ${payload.artifactId}. Inspect failed checks below.`
        );
      }
      onSelectTab(docType === 'executive-summary' ? 'executive-summary' : 'full-ic-memo');
    } catch (err) {
      setFactoryError(
        err instanceof Error ? err.message : 'Unable to reach Document Factory API.'
      );
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Deal Header & Streamlined 3-Step Underwriting Journey */}
      <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{deal.id}</span>
              <span aria-hidden="true">·</span>
              <span>{deal.location}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{deal.rooms} keys</span>
              <span aria-hidden="true">·</span>
              <span>Ask: {formatCurrency(deal.askingPrice)}</span>
              {deal.isSessionCreated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-teal-800 font-medium">Session Intake Deal</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                {deal.name}
              </h1>
              <PostureLabel posture={deal.posture} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="workspace-deal-select" className="text-xs font-medium text-slate-600">
              Active Deal
            </label>
            <select
              id="workspace-deal-select"
              value={deal.id}
              onChange={(e) => onSelectDeal(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700 max-w-[260px]"
            >
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} — {d.name} ({d.posture})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3-Step User Workflow Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          {/* Step 1: Add / Update Data */}
          <div className="bg-slate-50 border border-slate-200 rounded px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                1. Add / Update Data
              </div>
              <div className="text-xs font-medium text-slate-800 truncate">
                Edit inputs or log diligence evidence
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowUpdateDrawer((prev) => !prev)}
              aria-expanded={showUpdateDrawer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{showUpdateDrawer ? 'Hide Editor' : 'Update Data / Evidence'}</span>
            </button>
          </div>

          {/* Step 2: Generate ES or Full IC */}
          <div className="bg-slate-50 border border-slate-200 rounded px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                2. Generate Report
              </div>
              <div className="text-xs font-medium text-slate-800 truncate">
                ES (10s) or Full IC (19s)
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={isGenerating !== null}
                onClick={() => handleGenerateDocument('executive-summary')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0D7377] hover:bg-[#0A5C60] rounded disabled:opacity-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Generate Executive Summary</span>
              </button>
              <button
                type="button"
                disabled={isGenerating !== null}
                onClick={() => handleGenerateDocument('full-ic-memo')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded disabled:opacity-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
              >
                <FileCheck2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Generate Full IC</span>
              </button>
            </div>
          </div>

          {/* Step 3: Review / Download PDF */}
          <div className="bg-slate-50 border border-slate-200 rounded px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                3. Review / Download PDF
              </div>
              <div className="text-xs font-medium text-slate-800 truncate">
                {latestEsPdf || latestIcPdf
                  ? 'Primary PDF deliverables ready'
                  : 'Run Step 2 to generate PDF'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {latestEsPdf && (
                <a
                  href={latestEsPdf.downloadUrl}
                  download={latestEsPdf.filename}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0D7377] hover:bg-[#0A5C60] rounded whitespace-nowrap"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>ES PDF</span>
                </a>
              )}
              {latestIcPdf && (
                <a
                  href={latestIcPdf.downloadUrl}
                  download={latestIcPdf.filename}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded whitespace-nowrap"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  <span>Full IC PDF</span>
                </a>
              )}
              {!latestEsPdf && !latestIcPdf && (
                <span className="text-[11px] font-mono text-slate-500">No PDF yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 Collapsible Drawer */}
      {showUpdateDrawer && (
        <UpdateDealEvidenceDrawer
          deal={deal}
          onSaveDealUpdate={(updated, summaryText) => {
            onUpdateDeal(updated, summaryText);
            setUpdateNotice(summaryText);
          }}
          onClose={() => setShowUpdateDrawer(false)}
        />
      )}

      {updateNotice && (
        <div
          role="status"
          className="bg-teal-50 border border-teal-200 text-teal-950 rounded-md px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <span>{updateNotice}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isGenerating !== null}
              onClick={() => handleGenerateDocument('executive-summary')}
              className="font-medium text-teal-900 underline hover:text-teal-700"
            >
              Regenerate ES PDF
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              disabled={isGenerating !== null}
              onClick={() => handleGenerateDocument('full-ic-memo')}
              className="font-medium text-teal-900 underline hover:text-teal-700"
            >
              Regenerate Full IC PDF
            </button>
          </div>
        </div>
      )}

      {/* Document Factory Status, Single Primary PDF Deliverable & Version History */}
      <DocumentFactoryPanel
        dealId={deal.id}
        artifacts={artifacts}
        masterPreflight={masterPreflight}
        isGenerating={isGenerating}
        error={factoryError}
        onGenerate={handleGenerateDocument}
      />

      {/* Four primary destinations. Advanced analysis/document views are
          disclosed only in the currently selected destination. */}
      <nav aria-label="Deal workspace" className="space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 pb-2">
          {WORKSPACE_GROUPS.map((group) => {
            const selected = group.tabs.includes(activeTab);
            return (
              <button
                key={group.label}
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => onSelectTab(group.primary)}
                className={`rounded px-3 py-2.5 text-sm font-medium text-left focus-visible:outline-2 focus-visible:outline-teal-700 ${
                  selected
                    ? 'bg-teal-50 border border-teal-300 text-teal-900'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {group.label}
              </button>
            );
          })}
        </div>
        {WORKSPACE_GROUPS.filter((group) =>
          group.tabs.includes(activeTab) && group.tabs.length > 1
        ).map((group) => (
          <div key={group.label} className="flex flex-wrap gap-2" aria-label={`${group.label} views`}>
            {group.tabs.map((tabId) => {
              const tab = WORKSPACE_TABS.find((item) => item.id === tabId)!;
              return (
                <button
                  key={tabId}
                  type="button"
                  aria-current={activeTab === tabId ? 'page' : undefined}
                  onClick={() => onSelectTab(tabId)}
                  className={`px-3 py-1.5 rounded border text-xs font-medium focus-visible:outline-2 focus-visible:outline-teal-700 ${
                    activeTab === tabId
                      ? 'border-teal-300 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Tab Content Panel */}
      <div aria-label="Selected deal workspace view">
        {activeTab === 'decision-screen' && (
          <InvestmentDecisionScreen
            deal={deal}
            summary={summary}
            onNavigateTab={onSelectTab}
          />
        )}
        {activeTab === 'financials' && (
          <FinancialPerformanceTab deal={deal} summary={summary} />
        )}
        {activeTab === 'valuation' && (
          <ValuationSensitivitiesTab deal={deal} summary={summary} />
        )}
        {activeTab === 'market' && <MarketLocationTab deal={deal} />}
        {activeTab === 'risks-evidence' && (
          <RisksEvidenceTab deal={deal} summary={summary} />
        )}
        {activeTab === 'executive-summary' && (
          <DocumentPreviewTab
            deal={deal}
            summary={summary}
            mode="executive-summary"
            artifacts={artifacts}
            masterPreflight={masterPreflight}
            isGenerating={isGenerating}
            onGenerate={handleGenerateDocument}
          />
        )}
        {activeTab === 'full-ic-memo' && (
          <DocumentPreviewTab
            deal={deal}
            summary={summary}
            mode="full-ic-memo"
            artifacts={artifacts}
            masterPreflight={masterPreflight}
            isGenerating={isGenerating}
            onGenerate={handleGenerateDocument}
          />
        )}
        {activeTab === 'documents-qa' && (
          <DocumentsQaTab deal={deal} summary={summary} />
        )}
      </div>
    </div>
  );
};
