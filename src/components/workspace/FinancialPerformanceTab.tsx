import React from 'react';
import { HotelDeal } from '../../types/underwriting';
import {
  DealSummaryMetrics,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../../utils/financials';
import {
  NoiWaterfallChart,
  RevenueNoiBarChart,
  RevparTrendChart,
} from '../charts/UnderwritingCharts';

export const FinancialPerformanceTab: React.FC<{
  deal: HotelDeal;
  summary: DealSummaryMetrics;
}> = ({ deal, summary }) => {
  const { historical, t12 } = summary;
  const ffeCoverage =
    t12 && t12.noi !== null && t12.ffeReserve !== null && t12.ffeReserve > 0
      ? (t12.noi + t12.ffeReserve) / t12.ffeReserve
      : null;

  const roomsSharePct =
    t12 && t12.roomsRevenue !== null && t12.totalRevenue !== null && t12.totalRevenue > 0
      ? (t12.roomsRevenue / t12.totalRevenue) * 100
      : null;

  const capexToAskPct =
    deal.askingPrice !== null && deal.askingPrice > 0
      ? (summary.totalPipExposure / deal.askingPrice) * 100
      : null;

  return (
    <div className="space-y-6">
      {/* Financial Risk Indicators Strip */}
      <div className="bg-white border border-slate-200 rounded-md">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Financial Risk &amp; Operating Efficiency Indicators ({t12?.period ?? 'T12'})
          </h3>
          <span className="text-xs text-slate-500">
            Deterministic USALI ratios · 365-day annualization
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-4">
            <div className="text-xs text-slate-500">T12 NOI Margin</div>
            <div
              className={`mt-1 text-lg font-semibold font-mono tabular-nums ${
                t12?.noiMarginPct !== null && t12.noiMarginPct < 0
                  ? 'text-red-700'
                  : 'text-slate-900'
              }`}
            >
              {formatPercent(t12?.noiMarginPct)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">After 4.0% FF&amp;E reserve</div>
          </div>

          <div className="p-4">
            <div className="text-xs text-slate-500">Est. Break-Even Occupancy</div>
            <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {formatPercent(summary.breakEvenOccupancyPct)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Current Occ: {formatPercent(t12?.occupancyPct)}
            </div>
          </div>

          <div className="p-4">
            <div className="text-xs text-slate-500">FF&amp;E Reserve Coverage</div>
            <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {ffeCoverage !== null ? `${ffeCoverage.toFixed(2)}x` : 'N/A'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">EBITDA before FF&amp;E / Reserve</div>
          </div>

          <div className="p-4">
            <div className="text-xs text-slate-500">Rooms Revenue Mix</div>
            <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {formatPercent(roomsSharePct)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">F&amp;B / Other balance</div>
          </div>

          <div className="p-4">
            <div className="text-xs text-slate-500">PIP / Asking Price Ratio</div>
            <div className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900">
              {formatPercent(capexToAskPct)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {formatCurrency(summary.totalPipExposure)} total PIP
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Historical Total Revenue &amp; USALI NOI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hover bars to inspect period revenue, NOI, and margin.
            </p>
          </div>
          <RevenueNoiBarChart data={historical} />
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Occupancy, ADR &amp; RevPAR Trajectory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              RevPAR = ADR × Occupancy% across observed historical periods.
            </p>
          </div>
          <RevparTrendChart data={historical} />
        </div>
      </div>

      {/* NOI Bridge / Waterfall */}
      <div className="bg-white border border-slate-200 rounded-md p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              T12 NOI Bridge / Waterfall ({t12?.period ?? 'T12'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Step-down from gross operating revenue through departmental, undistributed, fixed charges, and 4.0% FF&amp;E reserve.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-700">
            Net Operating Income:{' '}
            <strong className={t12?.noi !== null && t12.noi < 0 ? 'text-red-700' : 'text-teal-800'}>
              {formatCurrency(t12?.noi)}
            </strong>
          </div>
        </div>
        <NoiWaterfallChart t12={t12} />
      </div>

      {/* Historical Operating Statement Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            USALI Operating Summary Schedule
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Line Item</th>
                {historical.map((h) => (
                  <th key={h.period} className="py-3 px-4 text-right whitespace-nowrap">
                    {h.period}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Occupancy (%)</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatPercent(h.occupancyPct)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">ADR ($)</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatCurrencyExact(h.adr)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/60">
                <td className="py-2.5 px-4 font-medium text-slate-900">RevPAR ($)</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono font-medium">
                    {formatCurrencyExact(h.revPAR)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Rooms Revenue</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatCurrency(h.roomsRevenue)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">F&amp;B / Banquet Revenue</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatCurrency(h.fbRevenue)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Other Operated &amp; Parking</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatCurrency(h.otherRevenue)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="py-2.5 px-4">Total Operating Revenue</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatCurrency(h.totalRevenue)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Departmental Expenses</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono text-slate-600">
                    ({formatCurrency(h.departmentalExpenses)})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Undistributed Expenses</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono text-slate-600">
                    ({formatCurrency(h.undistributedExpenses)})
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50/70 font-medium text-slate-900">
                <td className="py-2.5 px-4">Gross Operating Profit (GOP)</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono">
                    {formatCurrency(h.gop)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Management &amp; Franchise Fees</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono text-slate-600">
                    {h.managementFee !== null && h.franchiseFee !== null
                      ? `(${formatCurrency(h.managementFee + h.franchiseFee)})`
                      : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">Property Taxes &amp; Insurance</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono text-slate-600">
                    ({formatCurrency(h.propertyTaxesAndInsurance)})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-700">FF&amp;E Reserve (4.0%)</td>
                {historical.map((h) => (
                  <td key={h.period} className="py-2.5 px-4 text-right font-mono text-slate-600">
                    ({formatCurrency(h.ffeReserve)})
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-100 font-semibold text-slate-900 border-t border-slate-300">
                <td className="py-3 px-4">Net Operating Income (NOI)</td>
                {historical.map((h) => (
                  <td
                    key={h.period}
                    className={`py-3 px-4 text-right font-mono ${
                      h.noi !== null && h.noi < 0 ? 'text-red-700' : 'text-teal-900'
                    }`}
                  >
                    {formatCurrency(h.noi)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 px-4 text-slate-600 text-xs">NOI Margin (%)</td>
                {historical.map((h) => (
                  <td
                    key={h.period}
                    className={`py-2.5 px-4 text-right font-mono text-xs ${
                      h.noiMarginPct !== null && h.noiMarginPct < 0
                        ? 'text-red-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatPercent(h.noiMarginPct)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
