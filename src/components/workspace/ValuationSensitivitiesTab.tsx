import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { HotelDeal, ScenarioParameters } from '../../types/underwriting';
import {
  computeScenarioProjection,
  DealSummaryMetrics,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../../utils/financials';

export const ValuationSensitivitiesTab: React.FC<{
  deal: HotelDeal;
  summary: DealSummaryMetrics;
}> = ({ deal, summary }) => {
  const [scenario, setScenario] = useState<ScenarioParameters>({
    occupancyDeltaPctPts: 0,
    adrDeltaPct: 0,
    expenseDeltaPctPts: 0,
    targetCapRatePct: deal.targetCapRatePct,
    pipExposureOverride: summary.totalPipExposure,
    closingCostsPct: 1.5,
  });

  // Reset controls when switching deals
  useEffect(() => {
    setScenario({
      occupancyDeltaPctPts: 0,
      adrDeltaPct: 0,
      expenseDeltaPctPts: 0,
      targetCapRatePct: deal.targetCapRatePct,
      pipExposureOverride: summary.totalPipExposure,
      closingCostsPct: 1.5,
    });
  }, [deal.id, deal.targetCapRatePct, summary.totalPipExposure]);

  const result = computeScenarioProjection(deal, scenario);

  const capSteps = [
    Math.max(5.5, Number((scenario.targetCapRatePct - 1.0).toFixed(2))),
    Math.max(6.0, Number((scenario.targetCapRatePct - 0.5).toFixed(2))),
    Number(scenario.targetCapRatePct.toFixed(2)),
    Number((scenario.targetCapRatePct + 0.5).toFixed(2)),
    Number((scenario.targetCapRatePct + 1.0).toFixed(2)),
  ];

  const noiShockPcts = [-15, -7.5, 0, 7.5, 15];

  return (
    <div className="space-y-6">
      {summary.finalMaoWithheld && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-5 py-3.5 text-sm text-amber-950">
          <strong className="font-semibold">Governance Hold Active:</strong> Interactive scenario
          outputs below represent unverified analytical sensitivities only. Final MAO and binding
          acquisition approval remain <strong>WITHHELD</strong> due to{' '}
          {summary.criticalBlockerCount + summary.highBlockerCount} unresolved evidence blocker(s).
        </div>
      )}

      {/* Scenario Controls + Live Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Deterministic Scenario Drivers
            </h3>
            <button
              type="button"
              onClick={() =>
                setScenario({
                  occupancyDeltaPctPts: 0,
                  adrDeltaPct: 0,
                  expenseDeltaPctPts: 0,
                  targetCapRatePct: deal.targetCapRatePct,
                  pipExposureOverride: summary.totalPipExposure,
                  closingCostsPct: 1.5,
                })
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset T12 Baseline</span>
            </button>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="occ-delta" className="font-medium text-slate-700">
                  Occupancy Adjustment (pts vs. T12)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {scenario.occupancyDeltaPctPts >= 0 ? '+' : ''}
                  {scenario.occupancyDeltaPctPts.toFixed(1)} pts
                </span>
              </div>
              <input
                id="occ-delta"
                type="range"
                min={-15}
                max={20}
                step={0.5}
                value={scenario.occupancyDeltaPctPts}
                onChange={(e) =>
                  setScenario((s) => ({ ...s, occupancyDeltaPctPts: Number(e.target.value) }))
                }
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="adr-delta" className="font-medium text-slate-700">
                  ADR Adjustment (% vs. T12)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {scenario.adrDeltaPct >= 0 ? '+' : ''}
                  {scenario.adrDeltaPct.toFixed(1)}%
                </span>
              </div>
              <input
                id="adr-delta"
                type="range"
                min={-20}
                max={25}
                step={0.5}
                value={scenario.adrDeltaPct}
                onChange={(e) =>
                  setScenario((s) => ({ ...s, adrDeltaPct: Number(e.target.value) }))
                }
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="exp-delta" className="font-medium text-slate-700">
                  Operating Expense Ratio Shift (pts)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {scenario.expenseDeltaPctPts >= 0 ? '+' : ''}
                  {scenario.expenseDeltaPctPts.toFixed(1)} pts
                </span>
              </div>
              <input
                id="exp-delta"
                type="range"
                min={-8}
                max={8}
                step={0.5}
                value={scenario.expenseDeltaPctPts}
                onChange={(e) =>
                  setScenario((s) => ({ ...s, expenseDeltaPctPts: Number(e.target.value) }))
                }
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="cap-rate" className="font-medium text-slate-700">
                  Target Capitalization Rate (%)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {scenario.targetCapRatePct.toFixed(2)}%
                </span>
              </div>
              <input
                id="cap-rate"
                type="range"
                min={6.0}
                max={12.0}
                step={0.25}
                value={scenario.targetCapRatePct}
                onChange={(e) =>
                  setScenario((s) => ({ ...s, targetCapRatePct: Number(e.target.value) }))
                }
                className="w-full accent-teal-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label htmlFor="pip-override" className="font-medium text-slate-700">
                  PIP / Capital Deduction ($)
                </label>
                <span className="font-mono tabular-nums text-slate-900">
                  {formatCurrency(scenario.pipExposureOverride)}
                </span>
              </div>
              <input
                id="pip-override"
                type="range"
                min={0}
                max={Math.max(15000000, summary.totalPipExposure * 1.5)}
                step={100000}
                value={scenario.pipExposureOverride}
                onChange={(e) =>
                  setScenario((s) => ({ ...s, pipExposureOverride: Number(e.target.value) }))
                }
                className="w-full accent-teal-700"
              />
            </div>
          </div>
        </div>

        {/* Scenario Outputs */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Pro Forma Valuation Readout (Unverified Model)
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Closing Friction: {scenario.closingCostsPct.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 border-b border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-4">
              <div className="text-xs text-slate-500">Scenario RevPAR</div>
              <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                {formatCurrencyExact(result.proFormaRevPAR)}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                {formatPercent(result.proFormaOccupancyPct)} @{' '}
                {formatCurrencyExact(result.proFormaAdr)}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-500">Scenario NOI</div>
              <div
                className={`mt-1 text-lg font-semibold font-mono tabular-nums ${
                  result.proFormaNoi !== null && result.proFormaNoi < 0
                    ? 'text-red-700'
                    : 'text-slate-900'
                }`}
              >
                {formatCurrency(result.proFormaNoi)}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                Margin: {formatPercent(result.proFormaNoiMarginPct)}
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs text-slate-500">Implied Gross Value</div>
              <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
                {result.impliedGrossValue !== null
                  ? formatCurrency(result.impliedGrossValue)
                  : 'N/A'}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                {result.impliedGrossPerKey !== null
                  ? `${formatCurrency(result.impliedGrossPerKey)} / key`
                  : result.proFormaNoi === null
                    ? 'Missing operating inputs'
                    : 'Non-positive NOI'}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Less: PIP &amp; Capital Deduction</span>
              <span className="font-mono tabular-nums text-slate-800">
                ({formatCurrency(scenario.pipExposureOverride)})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                Less: Estimated Closing &amp; Transfer Costs ({scenario.closingCostsPct.toFixed(1)}%)
              </span>
              <span className="font-mono tabular-nums text-slate-800">
                {result.impliedGrossValue !== null
                  ? `(${formatCurrency(result.impliedGrossValue * (scenario.closingCostsPct / 100))})`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 font-semibold text-slate-900">
              <span>Indicative Net Value After PIP (Unverified)</span>
              <span className="font-mono tabular-nums text-base">
                {result.impliedNetMaoAfterPipAndClosing !== null
                  ? `${formatCurrency(result.impliedNetMaoAfterPipAndClosing)} (${formatCurrency(result.impliedNetPerKey)}/key)`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Spread vs. Seller Asking Price ({formatCurrency(deal.askingPrice)})</span>
              <span
                className={`font-mono tabular-nums font-medium ${
                  result.spreadVsAsking !== null && result.spreadVsAsking < 0
                    ? 'text-red-700'
                    : 'text-teal-800'
                }`}
              >
                {result.spreadVsAsking !== null
                  ? `${result.spreadVsAsking >= 0 ? '+' : ''}${formatCurrency(result.spreadVsAsking)}`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cap Rate Sensitivity Matrix */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Cap Rate &amp; NOI Valuation Sensitivity Grid (Gross Asset Value)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rows test NOI stress relative to current scenario NOI ({formatCurrency(result.proFormaNoi)}); columns test exit/going-in cap rates.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">Values shown as Total / Per-Key</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse tabular-nums">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 text-left">NOI Stress Case</th>
                {capSteps.map((cap) => (
                  <th
                    key={cap}
                    className={`py-3 px-4 text-right font-mono ${
                      Math.abs(cap - scenario.targetCapRatePct) < 0.01
                        ? 'text-teal-800 bg-teal-50/50'
                        : ''
                    }`}
                  >
                    {cap.toFixed(2)}% Cap
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {noiShockPcts.map((shock) => {
                const shockedNoi =
                  result.proFormaNoi !== null ? result.proFormaNoi * (1 + shock / 100) : null;
                const isBaseRow = shock === 0;
                return (
                  <tr key={shock} className={isBaseRow ? 'bg-slate-50/80 font-medium' : ''}>
                    <td className="py-3 px-4 text-slate-800 whitespace-nowrap">
                      <span>{shock > 0 ? `+${shock}%` : `${shock}%`} NOI</span>
                      <span className="ml-2 text-xs font-mono text-slate-500">
                        ({formatCurrency(shockedNoi, true)})
                      </span>
                    </td>
                    {capSteps.map((cap) => {
                      const val =
                        shockedNoi !== null && shockedNoi > 0 ? shockedNoi / (cap / 100) : null;
                      const perKey = val !== null && deal.rooms > 0 ? val / deal.rooms : null;
                      const isCenter =
                        isBaseRow && Math.abs(cap - scenario.targetCapRatePct) < 0.01;
                      return (
                        <td
                          key={cap}
                          className={`py-3 px-4 text-right font-mono ${
                            isCenter ? 'bg-teal-50 text-teal-900 font-semibold' : 'text-slate-800'
                          }`}
                        >
                          {val !== null ? (
                            <div>
                              <div>{formatCurrency(val, true)}</div>
                              <div className="text-[11px] text-slate-500">
                                {formatCurrency(perKey, true)}/key
                              </div>
                            </div>
                          ) : (
                            <span className="text-red-700 text-xs">
                              {shockedNoi === null ? 'N/A' : 'N/A (NOI ≤ 0)'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIP & Capex Schedule */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Identified PIP &amp; Deferred Capital Schedule
          </h3>
          <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
            Total: {formatCurrency(summary.totalPipExposure)} ({formatCurrency(summary.pipPerKey)}/key)
          </span>
        </div>
        {deal.pipItems.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No itemized PIP line items logged for this property.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Item</th>
                  <th className="py-2.5 px-4">Scope Description</th>
                  <th className="py-2.5 px-4">Timing</th>
                  <th className="py-2.5 px-4">Quote Basis</th>
                  <th className="py-2.5 px-4 text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deal.pipItems.map((pip) => (
                  <tr key={pip.id}>
                    <td className="py-3 px-4 font-medium text-slate-900">{pip.category}</td>
                    <td className="py-3 px-4 text-slate-600">{pip.scopeDescription}</td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{pip.timing}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{pip.quoteBasis}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatCurrency(pip.estimatedCost)}
                    </td>
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
