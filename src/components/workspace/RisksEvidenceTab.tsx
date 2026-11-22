import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { HotelDeal } from '../../types/underwriting';
import { DealSummaryMetrics } from '../../utils/financials';
import { SeverityLabel } from '../ui/PostureText';

export const RisksEvidenceTab: React.FC<{
  deal: HotelDeal;
  summary: DealSummaryMetrics;
}> = ({ deal, summary }) => {
  return (
    <div className="space-y-6">
      {/* MAO Governance Banner */}
      <div
        className={`border rounded-md p-5 flex items-start gap-3.5 ${
          summary.finalMaoWithheld
            ? 'bg-red-50/80 border-red-200 text-red-950'
            : 'bg-teal-50 border-teal-200 text-teal-950'
        }`}
      >
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-700" aria-hidden="true" />
        <div className="text-sm">
          <div className="font-semibold">
            {summary.finalMaoWithheld
              ? 'Final MAO & Binding Investment Approval WITHHELD'
              : 'No Blocking Evidence Flags Active'}
          </div>
          <p className="mt-1 text-slate-700 leading-relaxed">
            {summary.finalMaoWithheld
              ? `Underwriting governance prohibits releasing a binding Maximum Allowable Offer while ${summary.criticalBlockerCount} critical and ${summary.highBlockerCount} high-severity evidence gaps remain open. Unsupported assumptions are never marked as verified.`
              : 'All required gating evidence items are resolved.'}
          </p>
        </div>
      </div>

      {/* Missing Evidence & Investment Blockers */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Missing Evidence &amp; Investment Blockers ({deal.blockers.length})
          </h3>
          <span className="text-xs text-slate-500">Gating items prior to Final MAO</span>
        </div>
        {deal.blockers.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No missing evidence blockers logged.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deal.blockers.map((b) => (
              <div key={b.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-500">{b.id}</span>
                    <span className="text-sm font-semibold text-slate-900">{b.title}</span>
                  </div>
                  <p className="text-sm text-slate-700">{b.impactOnUnderwriting}</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Required Resolution:</span>{' '}
                    {b.requiredAction}
                  </p>
                </div>
                <div className="flex md:flex-col items-end justify-between gap-2 shrink-0">
                  <SeverityLabel severity={b.severity} />
                  <span className="text-xs font-mono text-slate-600 whitespace-nowrap">
                    {b.blocksFinalMao ? 'Blocks Final MAO: YES' : 'Blocks Final MAO: NO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Financial Conflicts */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Cross-Source Financial Conflicts ({deal.conflicts.length})
          </h3>
          <span className="text-xs text-slate-500">Seller OM vs. P&amp;L / Bank / Engineering</span>
        </div>
        {deal.conflicts.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No cross-document financial conflicts logged yet. Primary statements remain unverified.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Metric / Subject</th>
                  <th className="py-2.5 px-4">Source A</th>
                  <th className="py-2.5 px-4 text-right">Value A</th>
                  <th className="py-2.5 px-4">Source B</th>
                  <th className="py-2.5 px-4 text-right">Value B</th>
                  <th className="py-2.5 px-4">Severity</th>
                  <th className="py-2.5 px-4">Variance Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deal.conflicts.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4 font-medium text-slate-900">{c.metric}</td>
                    <td className="py-3 px-4 text-slate-600">{c.sourceA}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{c.valueA}</td>
                    <td className="py-3 px-4 text-slate-600">{c.sourceB}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{c.valueB}</td>
                    <td className="py-3 px-4">
                      <SeverityLabel severity={c.severity} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.varianceNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Risk Register */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Underwriting Risk Register ({deal.risks.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Domain</th>
                <th className="py-2.5 px-4">Risk Factor</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Mitigant / Current Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deal.risks.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{r.domain}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{r.title}</td>
                  <td className="py-3 px-4">
                    <SeverityLabel severity={r.severity} />
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.description}</td>
                  <td className="py-3 px-4 text-slate-700">{r.mitigantOrStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
