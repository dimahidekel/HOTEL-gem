import React from 'react';
import { HotelDeal } from '../../types/underwriting';
import { formatCurrencyExact, formatPercent } from '../../utils/financials';

export const MarketLocationTab: React.FC<{ deal: HotelDeal }> = ({ deal }) => {
  const { marketOverview, compSet, supplyPipeline } = deal;

  return (
    <div className="space-y-6">
      {/* Location & Demand Overview */}
      <div className="bg-white border border-slate-200 rounded-md p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Submarket Context &amp; Accessibility
              </h3>
              <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                {deal.location} · {deal.submarket}
              </p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {marketOverview.airliftAndAccess}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Primary Lodging Demand Drivers
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700 list-disc list-inside">
                {marketOverview.demandDrivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-md p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Synthetic STR-Style Benchmark Indexes
              </h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                {marketOverview.strCompSetNote}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-200">
              <div>
                <div className="text-xs text-slate-500">MPI (Occ)</div>
                <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                  {marketOverview.occupancyIndex !== null
                    ? marketOverview.occupancyIndex.toFixed(1)
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">ARI (ADR)</div>
                <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                  {marketOverview.adrIndex !== null
                    ? marketOverview.adrIndex.toFixed(1)
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">RGI (RevPAR)</div>
                <div
                  className={`mt-1 text-lg font-semibold font-mono tabular-nums ${
                    marketOverview.revparIndex !== null && marketOverview.revparIndex < 90
                      ? 'text-red-700'
                      : 'text-teal-800'
                  }`}
                >
                  {marketOverview.revparIndex !== null
                    ? marketOverview.revparIndex.toFixed(1)
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Set */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Competitive Set Properties ({compSet.length})
          </h3>
          <span className="text-xs text-slate-500">Synthetic peer benchmarks</span>
        </div>
        {compSet.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No competitive set benchmarks have been entered for this property yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Property</th>
                  <th className="py-2.5 px-4">Chain Scale</th>
                  <th className="py-2.5 px-4 text-right">Keys</th>
                  <th className="py-2.5 px-4 text-right">Distance</th>
                  <th className="py-2.5 px-4 text-right">Est. Occ</th>
                  <th className="py-2.5 px-4 text-right">Est. ADR</th>
                  <th className="py-2.5 px-4 text-right">Est. RevPAR</th>
                  <th className="py-2.5 px-4">Condition Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {compSet.map((c) => {
                  const revpar = c.estAdr * (c.estOccupancyPct / 100);
                  return (
                    <tr key={c.name}>
                      <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-slate-600">{c.chainScale}</td>
                      <td className="py-3 px-4 text-right font-mono">{c.keys}</td>
                      <td className="py-3 px-4 text-right font-mono">{c.distanceMiles.toFixed(1)} mi</td>
                      <td className="py-3 px-4 text-right font-mono">{formatPercent(c.estOccupancyPct)}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrencyExact(c.estAdr)}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatCurrencyExact(revpar)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.conditionNote}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supply Pipeline */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Tracked Competitive Supply Pipeline ({supplyPipeline.length})
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-600">
            Total Pipeline Keys: {supplyPipeline.reduce((acc, s) => acc + s.keys, 0)}
          </span>
        </div>
        {supplyPipeline.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No new supply pipeline entries tracked for this deal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Project Name</th>
                  <th className="py-2.5 px-4">Brand / Positioning</th>
                  <th className="py-2.5 px-4 text-right">Keys</th>
                  <th className="py-2.5 px-4 text-right">Distance</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Expected Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {supplyPipeline.map((s) => (
                  <tr key={s.projectName}>
                    <td className="py-3 px-4 font-medium text-slate-900">{s.projectName}</td>
                    <td className="py-3 px-4 text-slate-600">{s.brand}</td>
                    <td className="py-3 px-4 text-right font-mono">{s.keys}</td>
                    <td className="py-3 px-4 text-right font-mono">{s.distanceMiles.toFixed(1)} mi</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{s.status}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{s.expectedDelivery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
