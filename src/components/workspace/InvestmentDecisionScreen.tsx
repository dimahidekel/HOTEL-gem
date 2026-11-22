import React from 'react';
import { HotelDeal, WorkspaceTab } from '../../types/underwriting';
import {
  DealSummaryMetrics,
  formatCapRate,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../../utils/financials';
import { PostureLabel, SeverityLabel } from '../ui/PostureText';

interface InvestmentDecisionScreenProps {
  deal: HotelDeal;
  summary: DealSummaryMetrics;
  embeddedInDocument?: boolean;
  onNavigateTab?: (tab: WorkspaceTab) => void;
}

export const InvestmentDecisionScreen: React.FC<InvestmentDecisionScreenProps> = ({
  deal,
  summary,
  embeddedInDocument = false,
  onNavigateTab,
}) => {
  const { t12 } = summary;
  const capRateDisplay = formatCapRate(summary.indicativeCapRatePct, t12?.noi);
  const allInCapDisplay = formatCapRate(summary.allInCapRatePct, t12?.noi);

  return (
    <section
      aria-label="Investment Decision Screen"
      className="bg-white border border-slate-200 rounded-md"
    >
      {/* Header Band */}
      <div className="px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-2">
            <span>Investment Decision Screen</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{deal.id}</span>
            <span aria-hidden="true">·</span>
            <span>{deal.assetClass}</span>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 tracking-tight">
            {deal.name}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {deal.location} · {deal.submarket} · {deal.rooms} Keys · {deal.brand}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:text-right">
          <div>
            <div className="text-xs text-slate-500">Investment Posture</div>
            <div className="mt-0.5">
              <PostureLabel posture={deal.posture} />
            </div>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <div className="text-xs text-slate-500">Final MAO &amp; Binding Approval</div>
            <div className="mt-0.5 text-xs font-semibold tracking-wide text-red-800 whitespace-nowrap">
              {summary.finalMaoWithheld
                ? 'WITHHELD — CRITICAL EVIDENCE MISSING'
                : 'ELIGIBLE FOR IC REVIEW'}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">Asking Price &amp; Key Basis</div>
          <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {formatCurrency(deal.askingPrice)}
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
            {formatCurrency(summary.pricePerKey)} / key · {deal.rooms} keys
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">T12 Revenue &amp; RevPAR</div>
          <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {formatCurrency(t12?.totalRevenue)}
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
            RevPAR {formatCurrencyExact(t12?.revPAR)} ({formatPercent(t12?.occupancyPct)} @{' '}
            {formatCurrencyExact(t12?.adr)})
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">T12 USALI NOI &amp; Margin</div>
          <div
            className={`mt-1.5 text-xl font-semibold font-mono tabular-nums ${
              t12?.noi !== null && t12.noi < 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatCurrency(t12?.noi)}
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
            NOI Margin: {formatPercent(t12?.noiMarginPct)} · GOP {formatPercent(t12?.gopMarginPct)}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">Indicative Cap Rate (Ask)</div>
          <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-slate-900">
            {capRateDisplay}
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
            {t12?.noi !== null && t12.noi <= 0
              ? 'N/A — Negative operating NOI'
              : `All-in Cap w/ PIP: ${allInCapDisplay}`}
          </div>
        </div>
      </div>

      {/* Valuation, Capital Exposure, & Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="lg:col-span-7 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Investment Recommendation &amp; Rationale
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {deal.postureRationale}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Critical Evidence Blockers ({deal.blockers.length})
            </h3>
            {deal.blockers.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                No critical blockers recorded.
              </p>
            ) : (
              <ul className="mt-2.5 space-y-2.5">
                {deal.blockers.map((blocker) => (
                  <li
                    key={blocker.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-sm pb-2.5 border-b border-slate-100 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{blocker.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {blocker.impactOnUnderwriting}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <SeverityLabel severity={blocker.severity} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 p-6 space-y-5 bg-slate-50/60">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Indicative Valuation &amp; PIP Exposure
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">Identified PIP / Capex Exposure</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(summary.totalPipExposure)} ({formatCurrency(summary.pipPerKey)}/key)
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">All-In Basis (Ask + PIP)</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(summary.allInBasis)} ({formatCurrency(summary.allInBasisPerKey)}/key)
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-600">
                  Target Cap Benchmark ({formatPercent(deal.targetCapRatePct, 2)})
                </dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900">
                  {formatCurrency(summary.indicativeGrossValueAtTargetCap)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <dt className="font-medium text-slate-900">
                  Unverified Net Residual (Less PIP)
                </dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {summary.indicativeNetMaoUnverified !== null
                    ? formatCurrency(summary.indicativeNetMaoUnverified)
                    : 'N/A'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-900">Binding IC Final MAO</dt>
                <dd className="font-mono tabular-nums font-semibold text-red-800">
                  {summary.finalMaoWithheld ? 'WITHHELD' : formatCurrency(summary.indicativeNetMaoUnverified)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Required Next Actions</h3>
            <ol className="mt-2.5 space-y-1.5 text-xs text-slate-700 list-decimal list-inside">
              {deal.nextActions.map((action, idx) => (
                <li key={idx} className="leading-relaxed">
                  {action}
                </li>
              ))}
            </ol>
          </div>

          {!embeddedInDocument && onNavigateTab && (
            <div className="pt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('financials')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap"
              >
                Inspect P&amp;L &amp; Waterfall
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('risks-evidence')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap"
              >
                Review Evidence Blockers
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Attribution */}
      <div className="px-6 py-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          Evidence Status: <strong className="font-medium text-slate-700">{deal.evidenceStatus}</strong>
          {' · '}
          {summary.conflictCount} documented source conflict(s)
        </span>
        <span className="font-mono tabular-nums">
          Synthetic Underwriting File · Updated {deal.createdAt}
        </span>
      </div>
    </section>
  );
};
