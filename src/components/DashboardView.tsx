import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  DealActivityItem,
  HotelDeal,
  InvestmentPosture,
  NavRoute,
  WorkspaceTab,
} from '../types/underwriting';
import {
  computeDealSummary,
  formatCapRate,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../utils/financials';
import { PostureLabel } from './ui/PostureText';

interface DashboardViewProps {
  deals: HotelDeal[];
  activityLog: DealActivityItem[];
  onOpenDeal: (dealId: string, tab?: WorkspaceTab) => void;
  onNavigate: (route: NavRoute) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  deals,
  activityLog,
  onOpenDeal,
  onNavigate,
}) => {
  const summaries = deals.map((deal) => ({
    deal,
    summary: computeDealSummary(deal),
  }));

  const totalKeys = deals.reduce((acc, d) => acc + d.rooms, 0);
  const pricedDeals = deals.filter((d) => d.askingPrice !== null && d.askingPrice > 0);
  const totalAskingVolume = pricedDeals.reduce((acc, d) => acc + (d.askingPrice ?? 0), 0);
  const totalPricedKeys = pricedDeals.reduce((acc, d) => acc + d.rooms, 0);
  const weightedAskPerKey = totalPricedKeys > 0 ? totalAskingVolume / totalPricedKeys : null;

  const totalCriticalBlockers = summaries.reduce(
    (acc, s) => acc + s.summary.criticalBlockerCount,
    0
  );
  const withheldCount = summaries.filter((s) => s.summary.finalMaoWithheld).length;

  const postures: { posture: InvestmentPosture; color: string; count: number }[] = [
    {
      posture: 'CONDITIONAL BUY',
      color: 'bg-[#0D7377]',
      count: deals.filter((d) => d.posture === 'CONDITIONAL BUY').length,
    },
    {
      posture: 'FURTHER DILIGENCE',
      color: 'bg-amber-600',
      count: deals.filter((d) => d.posture === 'FURTHER DILIGENCE').length,
    },
    {
      posture: 'HOLD / KILL',
      color: 'bg-red-700',
      count: deals.filter((d) => d.posture === 'HOLD / KILL').length,
    },
    {
      posture: 'PENDING INTAKE',
      color: 'bg-slate-500',
      count: deals.filter((d) => d.posture === 'PENDING INTAKE').length,
    },
  ];

  const allBlockers = summaries.flatMap(({ deal, summary: _s }) =>
    deal.blockers
      .filter((b) => b.severity === 'Critical')
      .map((b) => ({ deal, blocker: b }))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight text-balance">
            Acquisition Pipeline Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Synthetic hotel underwriting portfolio · Deterministic USALI metrics &amp; IC governance tracking
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('deals')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
          >
            View All Deals
          </button>
          <button
            type="button"
            onClick={() => onNavigate('new-deal')}
            className="px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded whitespace-nowrap"
          >
            Log New Synthetic Deal
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">Active Synthetic Pipeline</div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {deals.length} Deals
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
            {totalKeys.toLocaleString('en-US')} total guestrooms
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">Total Asking Volume</div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {formatCurrency(totalAskingVolume, true)}
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-slate-600">
            Weighted avg: {formatCurrency(weightedAskPerKey)} / key
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">Critical Evidence Blockers</div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-red-700">
            {totalCriticalBlockers} Open
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Across {withheldCount} of {deals.length} deals (MAO withheld)
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">Conditional Buy Candidates</div>
          <div className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-teal-800">
            {postures[0].count}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Subject to gating diligence clearance
          </div>
        </div>
      </div>

      {/* Middle Row: Decision Distribution + Critical Blockers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Decision Distribution */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Investment Decision Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current IC posture breakdown across active pipeline deals
            </p>

            {/* Stacked Proportional Bar */}
            <div
              className="mt-5 h-3 w-full bg-slate-100 rounded-sm overflow-hidden flex"
              role="img"
              aria-label="Investment decision distribution bar"
            >
              {postures.map((p) =>
                p.count > 0 ? (
                  <div
                    key={p.posture}
                    className={`${p.color} h-full`}
                    style={{ width: `${(p.count / Math.max(deals.length, 1)) * 100}%` }}
                    title={`${p.posture}: ${p.count}`}
                  />
                ) : null
              )}
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {postures.map((p) => (
                <div key={p.posture} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 inline-block ${p.color}`} aria-hidden="true" />
                    <span className="font-medium text-slate-800">{p.posture}</span>
                  </div>
                  <div className="font-mono tabular-nums text-slate-700">
                    {p.count} ({deals.length > 0 ? Math.round((p.count / deals.length) * 100) : 0}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Governance rule: Binding IC approval is withheld while critical evidence blockers exist.
          </div>
        </div>

        {/* Critical Evidence Blockers Queue */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Active Critical Evidence Blockers ({allBlockers.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Items preventing Final MAO release across pipeline properties
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {allBlockers.slice(0, 6).map(({ deal, blocker }) => (
              <div
                key={`${deal.id}-${blocker.id}`}
                className="px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">{deal.id}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{deal.name}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 mt-0.5">{blocker.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{blocker.requiredAction}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDeal(deal.id, 'risks-evidence')}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:text-teal-950 whitespace-nowrap"
                >
                  <span>Inspect</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Financial Summary Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Pipeline Financial &amp; Valuation Summary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any property row to launch its 8-tab Deal Workspace
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Deal</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Keys</th>
                <th className="py-3 px-4 text-right">Asking Price</th>
                <th className="py-3 px-4 text-right">Ask / Key</th>
                <th className="py-3 px-4 text-right">T12 RevPAR</th>
                <th className="py-3 px-4 text-right">T12 NOI</th>
                <th className="py-3 px-4 text-right">Cap Rate</th>
                <th className="py-3 px-4 text-right">PIP Est.</th>
                <th className="py-3 px-4">Posture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {summaries.map(({ deal, summary }) => (
                <tr
                  key={deal.id}
                  onClick={() => onOpenDeal(deal.id, 'decision-screen')}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{deal.name}</div>
                    <div className="text-xs font-mono text-slate-500">{deal.id} · {deal.brand}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{deal.location}</td>
                  <td className="py-3 px-4 text-right font-mono">{deal.rooms}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatCurrency(deal.askingPrice, true)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatCurrency(summary.pricePerKey, true)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatCurrencyExact(summary.t12?.revPAR)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono font-medium ${
                      summary.t12?.noi !== null && summary.t12.noi < 0
                        ? 'text-red-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(summary.t12?.noi, true)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatCapRate(summary.indicativeCapRatePct, summary.t12?.noi)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {formatCurrency(summary.totalPipExposure, true)}
                  </td>
                  <td className="py-3 px-4">
                    <PostureLabel posture={deal.posture} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Underwriting Activity */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent Underwriting Activity Log
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {activityLog.map((act) => (
            <div
              key={act.id}
              className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs font-semibold text-slate-600 mr-2">
                  {act.dealId}
                </span>
                <span className="font-medium text-slate-900 mr-2">{act.dealName}</span>
                <span className="text-slate-600">— {act.summary}</span>
              </div>
              <div className="text-xs font-mono text-slate-500 whitespace-nowrap shrink-0">
                {act.date} · {act.actor}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
