import React, { useState } from 'react';
import { ComputedAnnualOperating } from '../../types/underwriting';
import { formatCurrency, formatCurrencyExact, formatPercent } from '../../utils/financials';

export const RevenueNoiBarChart: React.FC<{
  data: ComputedAnnualOperating[];
}> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const valid = data.filter((d) => d.totalRevenue !== null && d.noi !== null);
  if (valid.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Insufficient historical operating data to render Revenue &amp; NOI chart.
      </div>
    );
  }

  const maxRev = Math.max(...valid.map((d) => d.totalRevenue ?? 0), 1);
  const minNoi = Math.min(...valid.map((d) => d.noi ?? 0), 0);
  const maxVal = maxRev * 1.12;
  const minVal = minNoi < 0 ? minNoi * 1.25 : 0;
  const range = maxVal - minVal || 1;

  const width = 620;
  const height = 240;
  const padLeft = 64;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yPos = (val: number) => padTop + ((maxVal - val) / range) * plotH;
  const zeroY = yPos(0);

  const groupW = plotW / valid.length;
  const barW = Math.min(34, groupW * 0.28);

  const gridTicks = [maxVal, maxVal * 0.5, 0, ...(minVal < 0 ? [minVal] : [])];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 bg-[#0F294A] inline-block" aria-hidden="true" />
            <span>Total Revenue</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 bg-[#0D7377] inline-block" aria-hidden="true" />
            <span>Positive NOI</span>
          </span>
          {minNoi < 0 && (
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 bg-red-700 inline-block" aria-hidden="true" />
              <span>Negative NOI</span>
            </span>
          )}
        </div>
        {hoveredIdx !== null && valid[hoveredIdx] && (
          <div className="text-xs font-mono tabular-nums text-slate-700">
            {valid[hoveredIdx].period}: Rev {formatCurrency(valid[hoveredIdx].totalRevenue)} · NOI{' '}
            {formatCurrency(valid[hoveredIdx].noi)} ({formatPercent(valid[hoveredIdx].noiMarginPct)})
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Historical Revenue and Net Operating Income comparison chart"
      >
        {gridTicks.map((tick, i) => {
          const y = yPos(tick);
          return (
            <g key={i}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
                strokeWidth={tick === 0 ? 1.25 : 1}
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {formatCurrency(tick, true)}
              </text>
            </g>
          );
        })}

        {valid.map((item, idx) => {
          const rev = item.totalRevenue ?? 0;
          const noi = item.noi ?? 0;
          const cx = padLeft + groupW * idx + groupW / 2;
          const revX = cx - barW - 3;
          const noiX = cx + 3;
          const revTop = yPos(Math.max(0, rev));
          const revH = Math.max(1, zeroY - revTop);

          const noiTop = noi >= 0 ? yPos(noi) : zeroY;
          const noiH = Math.max(2, Math.abs(yPos(noi) - zeroY));
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={item.period}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              {isHovered && (
                <rect
                  x={cx - groupW * 0.42}
                  y={padTop}
                  width={groupW * 0.84}
                  height={plotH}
                  fill="#F1F5F9"
                />
              )}
              <rect
                x={revX}
                y={revTop}
                width={barW}
                height={revH}
                fill="#0F294A"
                rx={1}
              />
              <rect
                x={noiX}
                y={noiTop}
                width={barW}
                height={noiH}
                fill={noi >= 0 ? '#0D7377' : '#B91C1C'}
                rx={1}
              />
              <text
                x={cx}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-700 text-[11px] font-medium"
              >
                {item.period}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const RevparTrendChart: React.FC<{
  data: ComputedAnnualOperating[];
}> = ({ data }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const valid = data.filter(
    (d) => d.occupancyPct !== null && d.adr !== null && d.revPAR !== null
  );

  if (valid.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-slate-200 bg-slate-50 text-sm text-slate-500">
        Occupancy, ADR, and RevPAR drivers are not yet populated.
      </div>
    );
  }

  const width = 620;
  const height = 240;
  const padLeft = 54;
  const padRight = 50;
  const padTop = 22;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxRate = Math.max(...valid.map((d) => d.adr ?? 0), 100) * 1.15;
  const xFor = (i: number) =>
    valid.length === 1
      ? padLeft + plotW / 2
      : padLeft + (i / (valid.length - 1)) * plotW;

  const yRate = (val: number) => padTop + ((maxRate - val) / maxRate) * plotH;
  const yOcc = (occ: number) => padTop + ((100 - occ) / 100) * plotH;

  const adrPoints = valid.map((d, i) => `${xFor(i)},${yRate(d.adr ?? 0)}`).join(' ');
  const revparPoints = valid.map((d, i) => `${xFor(i)},${yRate(d.revPAR ?? 0)}`).join(' ');
  const occPoints = valid.map((d, i) => `${xFor(i)},${yOcc(d.occupancyPct ?? 0)}`).join(' ');

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#0F294A] inline-block" aria-hidden="true" />
            <span>ADR ($)</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#0D7377] inline-block" aria-hidden="true" />
            <span>RevPAR ($)</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" aria-hidden="true" />
            <span>Occupancy (%)</span>
          </span>
        </div>
        {activeIdx !== null && valid[activeIdx] && (
          <div className="text-xs font-mono tabular-nums text-slate-700">
            {valid[activeIdx].period}: Occ {formatPercent(valid[activeIdx].occupancyPct)} · ADR{' '}
            {formatCurrencyExact(valid[activeIdx].adr)} · RevPAR{' '}
            {formatCurrencyExact(valid[activeIdx].revPAR)}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Occupancy, ADR, and RevPAR historical trend chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padTop + plotH * (1 - ratio);
          return (
            <g key={idx}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="#E2E8F0" />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                ${Math.round(maxRate * ratio)}
              </text>
              <text
                x={width - padRight + 8}
                y={y + 4}
                textAnchor="start"
                className="fill-amber-700 text-[10px] font-mono tabular-nums"
              >
                {Math.round(ratio * 100)}%
              </text>
            </g>
          );
        })}

        {valid.length > 1 && (
          <>
            <polyline fill="none" stroke="#0F294A" strokeWidth="2.25" points={adrPoints} />
            <polyline fill="none" stroke="#0D7377" strokeWidth="2.25" points={revparPoints} />
            <polyline
              fill="none"
              stroke="#D97706"
              strokeWidth="2"
              strokeDasharray="5 4"
              points={occPoints}
            />
          </>
        )}

        {valid.map((d, idx) => {
          const x = xFor(idx);
          return (
            <g
              key={d.period}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={yRate(d.adr ?? 0)} r={4} fill="#0F294A" />
              <circle cx={x} cy={yRate(d.revPAR ?? 0)} r={4} fill="#0D7377" />
              <circle cx={x} cy={yOcc(d.occupancyPct ?? 0)} r={4} fill="#D97706" />
              <text
                x={x}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-700 text-[11px] font-medium"
              >
                {d.period}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const NoiWaterfallChart: React.FC<{
  t12: ComputedAnnualOperating;
}> = ({ t12 }) => {
  if (
    t12.totalRevenue === null ||
    t12.departmentalExpenses === null ||
    t12.undistributedExpenses === null ||
    t12.gop === null ||
    t12.managementFee === null ||
    t12.franchiseFee === null ||
    t12.ffeReserve === null ||
    t12.noi === null
  ) {
    return (
      <div className="h-64 flex items-center justify-center border border-slate-200 bg-slate-50 text-sm text-slate-500">
        NOI Waterfall unavailable until revenue and expense ratios are provided.
      </div>
    );
  }

  const fixedAndFees =
    t12.managementFee + t12.franchiseFee + t12.propertyTaxesAndInsurance;

  interface Step {
    label: string;
    start: number;
    end: number;
    value: number;
    kind: 'total' | 'deduct' | 'subtotal' | 'final';
  }

  const afterDept = t12.totalRevenue - t12.departmentalExpenses;
  const afterFixed = t12.gop - fixedAndFees;

  const steps: Step[] = [
    {
      label: 'Total Rev',
      start: 0,
      end: t12.totalRevenue,
      value: t12.totalRevenue,
      kind: 'total',
    },
    {
      label: 'Dept Exp',
      start: afterDept,
      end: t12.totalRevenue,
      value: -t12.departmentalExpenses,
      kind: 'deduct',
    },
    {
      label: 'Undist. Exp',
      start: t12.gop,
      end: afterDept,
      value: -t12.undistributedExpenses,
      kind: 'deduct',
    },
    {
      label: 'GOP',
      start: 0,
      end: t12.gop,
      value: t12.gop,
      kind: 'subtotal',
    },
    {
      label: 'Fees & Tax/Ins',
      start: afterFixed,
      end: t12.gop,
      value: -fixedAndFees,
      kind: 'deduct',
    },
    {
      label: 'FF&E (4%)',
      start: t12.noi,
      end: afterFixed,
      value: -t12.ffeReserve,
      kind: 'deduct',
    },
    {
      label: 'T12 NOI',
      start: t12.noi >= 0 ? 0 : t12.noi,
      end: t12.noi >= 0 ? t12.noi : 0,
      value: t12.noi,
      kind: 'final',
    },
  ];

  const allValues = steps.flatMap((s) => [s.start, s.end, 0]);
  const maxVal = Math.max(...allValues) * 1.12;
  const minVal = Math.min(...allValues) < 0 ? Math.min(...allValues) * 1.25 : 0;
  const range = maxVal - minVal || 1;

  const width = 720;
  const height = 260;
  const padLeft = 64;
  const padRight = 16;
  const padTop = 26;
  const padBottom = 42;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yPos = (val: number) => padTop + ((maxVal - val) / range) * plotH;
  const zeroY = yPos(0);
  const colW = plotW / steps.length;
  const barW = Math.min(54, colW * 0.62);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="T12 NOI Waterfall Bridge"
    >
      <line x1={padLeft} x2={width - padRight} y1={zeroY} y2={zeroY} stroke="#94A3B8" strokeWidth="1.25" />
      <text
        x={padLeft - 8}
        y={zeroY + 4}
        textAnchor="end"
        className="fill-slate-500 text-[10px] font-mono tabular-nums"
      >
        $0
      </text>
      <line
        x1={padLeft}
        x2={width - padRight}
        y1={yPos(maxVal / 1.12)}
        y2={yPos(maxVal / 1.12)}
        stroke="#E2E8F0"
      />
      <text
        x={padLeft - 8}
        y={yPos(maxVal / 1.12) + 4}
        textAnchor="end"
        className="fill-slate-500 text-[10px] font-mono tabular-nums"
      >
        {formatCurrency(maxVal / 1.12, true)}
      </text>

      {steps.map((s, idx) => {
        const cx = padLeft + idx * colW + colW / 2;
        const x = cx - barW / 2;
        const topVal = Math.max(s.start, s.end);
        const botVal = Math.min(s.start, s.end);
        const yTop = yPos(topVal);
        const yBot = yPos(botVal);
        const h = Math.max(3, yBot - yTop);

        let fill = '#0F294A';
        if (s.kind === 'deduct') fill = '#64748B';
        if (s.kind === 'subtotal') fill = '#1E3A5F';
        if (s.kind === 'final') fill = s.value >= 0 ? '#0D7377' : '#B91C1C';

        return (
          <g key={s.label}>
            <rect x={x} y={yTop} width={barW} height={h} fill={fill} rx={1} />
            <text
              x={cx}
              y={s.value < 0 && s.kind === 'final' ? yBot + 14 : yTop - 6}
              textAnchor="middle"
              className="fill-slate-800 text-[10px] font-mono font-semibold tabular-nums"
            >
              {formatCurrency(s.value, true)}
            </text>
            <text
              x={cx}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-600 text-[10.5px] font-medium"
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
