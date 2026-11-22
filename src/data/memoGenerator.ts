import { HotelDeal } from '../types/underwriting';
import {
  computeScenarioProjection,
  DealSummaryMetrics,
  formatCapRate,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../utils/financials';

export interface MemoSection {
  number: number;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  keyMetrics?: { label: string; value: string }[];
}

function buildAlternativeRescueSummary(
  deal: HotelDeal,
  summary: DealSummaryMetrics,
  compact: boolean
): string {
  const t12Noi = summary.t12?.noi;
  const pipNote =
    summary.totalPipExposure > 0
      ? `${formatCurrency(summary.totalPipExposure)} unverified PIP/CapEx`
      : 'unpriced PIP/CapEx';

  if (t12Noi !== null && t12Noi <= 0) {
    const baseText =
      `Alternative / Rescue Strategy: (A) Viability requires a substantially lower purchase basis, seller credits or non-refundable deposit protection, verifiable operational restructuring (labor, utilities, room restoration), and independent PIP scoping to offset negative T12 NOI (${formatCurrency(t12Noi)}) and ${pipNote}. Reflagging/brand conversion remains CANDIDATE ONLY / NOT APPROVED pending written property-specific franchisor eligibility and fee-vs-lift economics. (B) Necessary proof: audited T12 P&L, itemized GMP PIP quote, franchise transfer terms, and Tier 1 safety clearance. (C) Decision: PURSUE CONDITIONAL (information-only) / PASS on unadjusted basis.`;
    return compact ? baseText : `${baseText} No numeric MAO is supportable until normalized NOI turns demonstrably positive after management, franchise, tax, insurance, and FF&E deductions.`;
  }

  if (summary.finalMaoWithheld) {
    const baseText =
      `Alternative / Rescue Strategy: (A) Under current unverified inputs, pursuit requires price/credit protection (basis discount for ${pipNote}), verification of trailing departmental margins and post-transfer property tax/insurance resets, and retention or selective soft-brand evaluation only where incremental RevPAR exceeds net franchise fee and PIP burden. (B) Necessary proof: verified T12 P&L, binding PIP/engineering inspection, franchise relicensing letter, and municipal safety review. (C) Decision: PURSUE CONDITIONAL — NOT YET DETERMINABLE for binding commitment.`;
    return compact ? baseText : `${baseText} Absent verifiable cost/lift documentation, brand changes cannot be assumed to lift net NOI.`;
  }

  return `Alternative / Rescue Strategy: (A) Base underwriting relies on negotiated purchase basis, disciplined departmental cost control, and documented CapEx execution. (B) Necessary proof: final third-party confirmations prior to hard deposit. (C) Decision: PURSUE CONDITIONAL.`;
}

function buildSafetyGateDisclosure(deal: HotelDeal): string {
  return `Tier 1 Micro-Location, Crime & Guest-Safety Gate (§7A/§7B): Result = NOT VERIFIED (synthetic demonstration scope). Coverage & Date Limits: Immediate neighbor inventory (3 nearest lodging peers), exact-address police/municipal adverse incident search for ${deal.location} (${deal.submarket}), and recent 24–36 month local safety reviews have not been executed against live municipal portals; imagery capture dates vs. access dates are UNKNOWN. Decision Consequence: Blocking for FINAL approval, final MAO, and hard deposit.`;
}

export function buildExecutiveSummarySections(
  deal: HotelDeal,
  summary: DealSummaryMetrics
): MemoSection[] {
  const { t12 } = summary;
  const t12Input = deal.historicalInputs[deal.historicalInputs.length - 1];
  const capDisplay = formatCapRate(summary.indicativeCapRatePct, t12?.noi);
  const allInCapDisplay = formatCapRate(summary.allInCapRatePct, t12?.noi);
  const noiPreFfe =
    t12?.noi !== null && t12?.ffeReserve !== null ? t12.noi + t12.ffeReserve : null;
  const maoStatus = summary.finalMaoWithheld
    ? `WITHHELD (${summary.criticalBlockerCount + summary.highBlockerCount} blocker${summary.criticalBlockerCount + summary.highBlockerCount === 1 ? '' : 's'})`
    : formatCurrency(summary.indicativeNetMaoUnverified);

  const histSummary = summary.historical
    .map(
      (yr) =>
        `${yr.period}: Occ ${formatPercent(yr.occupancyPct)}, ADR ${formatCurrencyExact(yr.adr)}, RevPAR ${formatCurrencyExact(yr.revPAR)}, Total Rev ${formatCurrency(yr.totalRevenue)}, USALI NOI ${formatCurrency(yr.noi)}`
    )
    .join('; ');

  return [
    {
      number: 1,
      title: 'Investment Decision & Thesis',
      paragraphs: [
        `IC Decision Posture: ${deal.posture} (NOT FINAL / NO HARD DEPOSIT). ${deal.postureRationale}`,
        `${deal.investmentThesis}`,
      ],
      keyMetrics: [
        { label: 'Asking Price', value: formatCurrency(deal.askingPrice) },
        { label: 'Price / Key', value: formatCurrency(summary.pricePerKey) },
        { label: 'Indicative Cap Rate', value: capDisplay },
        { label: 'Final MAO Gate', value: summary.finalMaoWithheld ? 'WITHHELD' : 'ELIGIBLE' },
      ],
    },
    {
      number: 2,
      title: 'Property / Transaction Snapshot',
      paragraphs: [
        `${deal.name} (${deal.id}) is a ${deal.rooms}-key ${deal.assetClass.toLowerCase()} property in ${deal.location} (${deal.submarket}), operating under ${deal.brand}${deal.yearBuilt ? ` (built ${deal.yearBuilt}` : ''}${deal.lastRenovated ? `, renovated ${deal.lastRenovated})` : deal.yearBuilt ? ')' : ''}.`,
        `Asking price is ${deal.askingPrice !== null ? `${formatCurrency(deal.askingPrice)} (${formatCurrency(summary.pricePerKey)}/key)` : 'UNPRICED / N/A'}. Known PIP/capital allowance totals ${summary.totalPipExposure > 0 ? `${formatCurrency(summary.totalPipExposure)} (${formatCurrency(summary.pipPerKey)}/key)` : 'UNPRICED / PENDING PCA'}, implying an all-in basis of ${formatCurrency(summary.allInBasis)} (${formatCurrency(summary.allInBasisPerKey)}/key).`,
      ],
    },
    {
      number: 3,
      title: 'Current Financial Picture',
      paragraphs: [
        `Broker-to-Supported Historical Bridge (${t12?.period ?? 'T12'} — NOT normalized NOI): Total operating revenue is ${formatCurrency(t12?.totalRevenue)} on ${formatPercent(t12?.occupancyPct)} occupancy, ${formatCurrencyExact(t12?.adr)} ADR, and ${formatCurrencyExact(t12?.revPAR)} RevPAR. After ${formatPercent(t12Input?.departmentalExpenseRatioPct, 1)} departmental and ${formatPercent(t12Input?.undistributedExpenseRatioPct, 1)} undistributed ratios, GOP is ${formatCurrency(t12?.gop)} (${formatPercent(t12?.gopMarginPct)}); Normalized NOI Pre-FF&E is ${formatCurrency(noiPreFfe)}, and USALI NOI Post-FF&E (after ${t12Input?.ffeReservePct.toFixed(1) ?? '4.0'}% FF&E reserve of ${formatCurrency(t12?.ffeReserve)}) is ${formatCurrency(t12?.noi)} (${formatPercent(t12?.noiMarginPct)} margin). Separate YTD-vs-T12 verification remains pending seller GL backup.`,
        `Multi-year trajectory: ${histSummary || 'No multi-year historical series provided at intake.'}`,
      ],
      keyMetrics: [
        { label: 'T12 Occupancy', value: formatPercent(t12?.occupancyPct) },
        { label: 'T12 RevPAR', value: formatCurrencyExact(t12?.revPAR) },
        { label: 'T12 NOI Pre-FF&E', value: formatCurrency(noiPreFfe) },
        { label: 'T12 USALI NOI Post-FF&E', value: formatCurrency(t12?.noi) },
      ],
    },
    {
      number: 4,
      title: 'Pricing / Valuation Read',
      paragraphs: [
        `At the asking price of ${formatCurrency(deal.askingPrice)}, going-in cap rate is ${capDisplay} and all-in cap rate (Ask + PIP) is ${allInCapDisplay}.`,
        summary.indicativeGrossValueAtTargetCap !== null
          ? `An unverified benchmark sensitivity at ${formatPercent(deal.targetCapRatePct, 2)} on T12 USALI NOI yields ${formatCurrency(summary.indicativeGrossValueAtTargetCap)} gross (${formatCurrency(summary.indicativeNetMaoUnverified)} net less PIP). Because critical evidence blockers remain open, Final MAO / Strike Price is ${maoStatus}.`
          : `Because T12 NOI is negative or non-calculable (${formatCurrency(t12?.noi)}), income capitalization yields N/A and a positive cap-rate valuation is blocked pending distressed recovery and basis verification.`,
      ],
    },
    {
      number: 5,
      title: 'Value-Creation Opportunity',
      paragraphs: [
        `Principal supportable value driver centers on ${deal.investmentThesis} Subject-property uplift depends on verified ADR/occupancy capture, departmental expense discipline, and audited PIP execution rather than unverified pro-forma projections.`,
      ],
      bullets: [
        `Break-even occupancy threshold under current fixed burden is estimated at ${formatPercent(summary.breakEvenOccupancyPct)} (unverified baseline).`,
        `Tracked Comp Set Indices — Occ Index: ${deal.marketOverview.occupancyIndex ?? 'UNKNOWN'}, ADR Index: ${deal.marketOverview.adrIndex ?? 'UNKNOWN'}, RevPAR Index: ${deal.marketOverview.revparIndex ?? 'UNKNOWN'} (parity = 100).`,
      ],
    },
    {
      number: 6,
      title: 'Physical Condition / PIP / Franchise',
      paragraphs: [
        `Capital scope totals ${summary.totalPipExposure > 0 ? `${formatCurrency(summary.totalPipExposure)} (${formatCurrency(summary.pipPerKey)}/key)` : 'UNPRICED ($0 itemized)'} across ${deal.pipItems.length} item(s). Brand affiliation (${deal.brand}) eligibility, transfer terms, deferred maintenance, structural/MEP/life-safety exposure, and renovation room-downtime remain UNVERIFIED without a Property Condition Assessment and franchisor relicensing letter.`,
      ],
      bullets:
        deal.pipItems.length > 0
          ? deal.pipItems.map(
              (p) =>
                `${p.category} (${p.timing} · ${p.quoteBasis}): ${formatCurrency(p.estimatedCost)} — ${p.scopeDescription}`
            )
          : ['No detailed PIP schedule uploaded; independent Property Condition Assessment required.'],
    },
    {
      number: 7,
      title: 'Market & Location',
      paragraphs: [
        `${deal.marketOverview.airliftAndAccess} ${deal.marketOverview.strCompSetNote}`,
        buildSafetyGateDisclosure(deal),
        deal.supplyPipeline.length > 0
          ? `Tracked supply pipeline totals ${deal.supplyPipeline.reduce((acc, s) => acc + s.keys, 0)} keys across ${deal.supplyPipeline.length} project(s), led by ${deal.supplyPipeline[0].projectName} (${deal.supplyPipeline[0].keys} keys, ${deal.supplyPipeline[0].status}, ${deal.supplyPipeline[0].expectedDelivery}).`
          : `No verified competitive supply pipeline projects have been logged yet for this submarket.`,
      ],
      bullets: deal.marketOverview.demandDrivers,
    },
    {
      number: 8,
      title: 'Key Risks / Missing Evidence',
      paragraphs: [
        `Evidence status: "${deal.evidenceStatus}". There are ${summary.criticalBlockerCount} critical blocker(s), ${summary.highBlockerCount} high-priority blocker(s), and ${summary.conflictCount} documented financial conflict(s). All unverified items preserve kind=user_input/evidence and remain blocking for FINAL status.`,
      ],
      bullets: [
        ...deal.blockers.map(
          (b) => `[${b.severity} Blocker — ${b.id}] ${b.title}: ${b.impactOnUnderwriting}`
        ),
        ...deal.conflicts.map(
          (c) =>
            `[${c.severity} Conflict — ${c.metric}] ${c.sourceA} (${c.valueA}) vs. ${c.sourceB} (${c.valueB}): ${c.varianceNote}`
        ),
        ...deal.risks.map(
          (r) => `[${r.severity} Risk · ${r.domain}] ${r.title}: ${r.description}`
        ),
      ],
    },
    {
      number: 9,
      title: 'Recommendation / Price Posture / Next Steps',
      paragraphs: [
        `Recommendation: ${deal.posture} (NOT FINAL / NO HARD DEPOSIT). Final MAO & Strike Price remain ${maoStatus}.`,
        buildAlternativeRescueSummary(deal, summary, true),
      ],
      bullets: deal.nextActions,
    },
    {
      number: 10,
      title: 'Sources / Compact QA',
      paragraphs: [
        `Source Register tracks ${deal.sourceRegister.length} file(s); 0 sources are independently verified in synthetic demonstration scope. EXTERNAL_INDEPENDENT_REVIEW: NOT RUN.`,
      ],
      bullets: deal.sourceRegister.map(
        (d) => `[${d.status}] ${d.id} · ${d.title} (${d.category} · ${d.periodCovered} · ${d.provider})`
      ),
    },
  ];
}

export function buildFullIcMemoSections(
  deal: HotelDeal,
  summary: DealSummaryMetrics
): MemoSection[] {
  const { t12 } = summary;
  const t12Input = deal.historicalInputs[deal.historicalInputs.length - 1];
  const capDisplay = formatCapRate(summary.indicativeCapRatePct, t12?.noi);
  const allInCapDisplay = formatCapRate(summary.allInCapRatePct, t12?.noi);
  const totalCompKeys = deal.compSet.reduce((s, c) => s + c.keys, 0);
  const totalSupplyKeys = deal.supplyPipeline.reduce((s, c) => s + c.keys, 0);

  const downside = computeScenarioProjection(deal, {
    occupancyDeltaPctPts: -5,
    adrDeltaPct: -6,
    expenseDeltaPctPts: 2.5,
    targetCapRatePct: deal.targetCapRatePct + 0.75,
    pipExposureOverride: summary.totalPipExposure,
    closingCostsPct: 1.5,
  });
  const baseCase = computeScenarioProjection(deal, {
    occupancyDeltaPctPts: 0,
    adrDeltaPct: 0,
    expenseDeltaPctPts: 0,
    targetCapRatePct: deal.targetCapRatePct,
    pipExposureOverride: summary.totalPipExposure,
    closingCostsPct: 1.5,
  });
  const stabilized = computeScenarioProjection(deal, {
    occupancyDeltaPctPts: 4,
    adrDeltaPct: 6,
    expenseDeltaPctPts: -1.5,
    targetCapRatePct: Math.max(6, deal.targetCapRatePct - 0.5),
    pipExposureOverride: summary.totalPipExposure,
    closingCostsPct: 1.5,
  });

  const noiPreFfe =
    t12?.noi !== null && t12?.ffeReserve !== null ? t12.noi + t12.ffeReserve : null;

  return [
    {
      number: 1,
      title: 'Executive Summary',
      paragraphs: [
        `This Full Investment Committee Memorandum evaluates the proposed acquisition of ${deal.name} (${deal.id}), a ${deal.rooms}-key ${deal.assetClass.toLowerCase()} hotel in ${deal.location} (${deal.submarket}) affiliated with ${deal.brand}. Current IC Posture: ${deal.posture} (NOT FINAL / NO HARD DEPOSIT).`,
        `${deal.investmentThesis} ${deal.postureRationale}`,
        buildAlternativeRescueSummary(deal, summary, false),
      ],
      keyMetrics: [
        { label: 'Asking Price', value: formatCurrency(deal.askingPrice) },
        { label: 'T12 USALI NOI', value: formatCurrency(t12?.noi) },
        { label: 'Indicative Cap Rate', value: capDisplay },
        { label: 'Final MAO Status', value: summary.finalMaoWithheld ? 'WITHHELD' : 'ELIGIBLE' },
      ],
    },
    {
      number: 2,
      title: 'Transaction Overview',
      paragraphs: [
        `Seller asking price is ${deal.askingPrice !== null ? `${formatCurrency(deal.askingPrice)} (${formatCurrency(summary.pricePerKey)}/key)` : 'UNPRICED / N/A'}. Known PIP/CapEx allowance is ${formatCurrency(summary.totalPipExposure)} (${formatCurrency(summary.pipPerKey)}/key), establishing an all-in basis of ${formatCurrency(summary.allInBasis)} (${formatCurrency(summary.allInBasisPerKey)}/key).`,
        `No executed Purchase and Sale Agreement (PSA), deed consideration schedule, or binding closing date exists in the intake file.`,
      ],
    },
    {
      number: 3,
      title: 'Evidence and Verification Status',
      paragraphs: [
        `Aggregate evidence status is "${deal.evidenceStatus}". Under Master §3 three-axis provenance rules, seller/broker materials retain kind=reported_fact/user_input, verification=unverified (or conflicting/missing), and decision_effect=blocking where critical gaps remain.`,
        `Active counts: ${summary.criticalBlockerCount} Critical blocker(s), ${summary.highBlockerCount} High-priority blocker(s), and ${summary.conflictCount} documented numerical conflict(s).`,
      ],
    },
    {
      number: 4,
      title: 'Property Description and Physical Condition',
      paragraphs: [
        `${deal.name} comprises ${deal.rooms} guestrooms${deal.yearBuilt ? `, constructed in ${deal.yearBuilt}` : ''}${deal.lastRenovated ? ` and renovated in ${deal.lastRenovated}` : ''}. Physical diligence separates brand PIP, deferred maintenance, structural/MEP/life-safety items, and renovation downtime; none currently carry binding GMP contracts or verified PCA clearance.`,
        `Identified PIP/CapEx items total ${formatCurrency(summary.totalPipExposure)} (${formatCurrency(summary.pipPerKey)}/key). Current brand (${deal.brand}) franchise eligibility, transfer terms, and room-closure schedule remain UNVERIFIED.`,
      ],
      bullets:
        deal.pipItems.length > 0
          ? deal.pipItems.map(
              (p) =>
                `${p.id} · ${p.category}: ${formatCurrency(p.estimatedCost)} (${p.timing} | ${p.quoteBasis}) — ${p.scopeDescription}`
            )
          : ['No PIP schedule itemized yet; placeholder allowance pending PCA walk.'],
    },
    {
      number: 5,
      title: 'Location and Market',
      paragraphs: [
        `${deal.marketOverview.airliftAndAccess} ${deal.marketOverview.strCompSetNote}`,
        buildSafetyGateDisclosure(deal),
        deal.compSet.length > 0
          ? `Tracked competitive set covers ${deal.compSet.length} direct peer assets (${totalCompKeys} keys). Supply pipeline tracks ${totalSupplyKeys} keys across ${deal.supplyPipeline.length} project(s).`
          : `No direct comp set or supply pipeline entries have been verified yet.`,
      ],
      bullets: [
        ...deal.marketOverview.demandDrivers,
        ...deal.compSet.map(
          (c) =>
            `[Comp] ${c.name} (${c.chainScale}, ${c.keys} keys, ${c.distanceMiles} mi): Est. Occ ${formatPercent(c.estOccupancyPct)}, Est. ADR ${formatCurrencyExact(c.estAdr)} — ${c.conditionNote}`
        ),
        ...deal.supplyPipeline.map(
          (s) =>
            `[Supply] ${s.projectName} (${s.brand}) — ${s.keys} keys at ${s.distanceMiles} mi · Status: ${s.status} · Delivery: ${s.expectedDelivery}`
        ),
      ],
    },
    {
      number: 6,
      title: 'Historical Financial Analysis',
      paragraphs: [
        `Trailing 12-month (${t12?.period ?? 'T12'}) performance reflects ${formatPercent(t12?.occupancyPct)} occupancy, ${formatCurrencyExact(t12?.adr)} ADR, and ${formatCurrencyExact(t12?.revPAR)} RevPAR, generating ${formatCurrency(t12?.roomsRevenue)} Rooms Revenue, ${formatCurrency(t12?.fbRevenue)} F&B, and ${formatCurrency(t12?.otherRevenue)} Other Revenue for Total Revenue of ${formatCurrency(t12?.totalRevenue)}.`,
        `Departmental (${t12Input ? formatPercent(t12Input.departmentalExpenseRatioPct, 1) : 'N/A'}) and undistributed (${t12Input ? formatPercent(t12Input.undistributedExpenseRatioPct, 1) : 'N/A'}) costs leave GOP of ${formatCurrency(t12?.gop)} (${formatPercent(t12?.gopMarginPct)}). YTD-vs-T12 seasonality verification requires monthly seller general-ledger extracts.`,
      ],
      bullets: summary.historical.map(
        (h) =>
          `${h.period}: Occ ${formatPercent(h.occupancyPct)} · ADR ${formatCurrencyExact(h.adr)} · RevPAR ${formatCurrencyExact(h.revPAR)} · Total Rev ${formatCurrency(h.totalRevenue)} · GOP ${formatCurrency(h.gop)} · USALI NOI ${formatCurrency(h.noi)}`
      ),
    },
    {
      number: 7,
      title: 'Normalization',
      paragraphs: [
        `Distinct Cash-Flow Measures (${t12?.period ?? 'T12'} — Unverified Baseline): GOP = ${formatCurrency(t12?.gop)}; Management Fee (${t12Input?.managementFeePct.toFixed(2) ?? 'N/A'}%) = ${formatCurrency(t12?.managementFee)}; Franchise Fee (${t12Input?.franchiseFeePctOfRooms.toFixed(2) ?? 'N/A'}% of rooms) = ${formatCurrency(t12?.franchiseFee)}; Taxes & Insurance = ${formatCurrency(t12?.propertyTaxesAndInsurance)}; Normalized NOI Pre-FF&E = ${formatCurrency(noiPreFfe)}; FF&E Reserve (${t12Input?.ffeReservePct.toFixed(1) ?? '4.0'}%) = ${formatCurrency(t12?.ffeReserve)}; Normalized NOI Post-FF&E = ${formatCurrency(t12?.noi)}.`,
        `Expense-Overlap & Normalization Guardrail: Seller schedule exclusions, post-transfer property tax reassessment, and coastal/regional insurance repricing remain UNVERIFIED. No synthetic add-backs or unsupported percentages are applied without source backup.`,
      ],
    },
    {
      number: 8,
      title: 'Operating Scenarios and Detailed Pro Forma',
      paragraphs: [
        `Three reproducible scenarios (explicit ASSUMPTION / UNVERIFIED — NOT normalized actuals) test operating leverage from the ${t12?.period ?? 'T12'} baseline; room-closure downtime during PIP cannot be netted until dated construction phasing is supplied.`,
      ],
      bullets: [
        `Downside (-5.0pp Occ, -6.0% ADR, +2.5pp Exp): Occ ${formatPercent(downside.proFormaOccupancyPct)}, ADR ${formatCurrencyExact(downside.proFormaAdr)}, RevPAR ${formatCurrencyExact(downside.proFormaRevPAR)}, Total Rev ${formatCurrency(downside.proFormaTotalRevenue)}, NOI ${formatCurrency(downside.proFormaNoi)} (${formatPercent(downside.proFormaNoiMarginPct)}).`,
        `Base Case (0.0pp Occ, 0.0% ADR, 0.0pp Exp): Occ ${formatPercent(baseCase.proFormaOccupancyPct)}, ADR ${formatCurrencyExact(baseCase.proFormaAdr)}, RevPAR ${formatCurrencyExact(baseCase.proFormaRevPAR)}, Total Rev ${formatCurrency(baseCase.proFormaTotalRevenue)}, NOI ${formatCurrency(baseCase.proFormaNoi)} (${formatPercent(baseCase.proFormaNoiMarginPct)}).`,
        `Stabilized (+4.0pp Occ, +6.0% ADR, -1.5pp Exp): Occ ${formatPercent(stabilized.proFormaOccupancyPct)}, ADR ${formatCurrencyExact(stabilized.proFormaAdr)}, RevPAR ${formatCurrencyExact(stabilized.proFormaRevPAR)}, Total Rev ${formatCurrency(stabilized.proFormaTotalRevenue)}, NOI ${formatCurrency(stabilized.proFormaNoi)} (${formatPercent(stabilized.proFormaNoiMarginPct)}).`,
      ],
    },
    {
      number: 9,
      title: 'Sources and Uses and Capital Plan',
      paragraphs: [
        `Illustrative Uses at Seller Ask: Acquisition Basis ${formatCurrency(deal.askingPrice)} + Identified PIP/CapEx ${formatCurrency(summary.totalPipExposure)} = All-In Basis ${formatCurrency(summary.allInBasis)} (${formatCurrency(summary.allInBasisPerKey)}/key), excluding unverified closing costs (est. ~1.5% placeholder) and working capital reserves (UNKNOWN).`,
        `Sources (Senior Debt vs. Sponsor Equity) remain UNKNOWN — no executed lender term sheets or PIP escrow agreements are present in the record. Funded PIP escrow treatment (PIP_ESCROW_PREFUNDED_AT_CLOSE) is not assumed.`,
      ],
    },
    {
      number: 10,
      title: 'Financing Analysis',
      paragraphs: [
        `Unlevered Baseline Only: No binding debt quotes, interest rates, IO periods, amortization schedules, DSCR covenants, or debt-yield minimums have been received (Lender Terms = UNKNOWN).`,
        t12?.noi !== null && t12.noi <= 0
          ? `Because T12 NOI is negative (${formatCurrency(t12.noi)}), conventional stabilized mortgage debt sizing is infeasible; any acquisition would require 100% equity or bespoke bridge financing.`
          : `Any prospective senior financing will be constrained by binding LTV, LTC, minimum DSCR, and lender-mandated PIP holdbacks once audited NOI and engineering quotes are obtained.`,
      ],
    },
    {
      number: 11,
      title: 'Valuation',
      paragraphs: [
        `Asking Price (${formatCurrency(deal.askingPrice)} | ${formatCurrency(summary.pricePerKey)}/key) implies an indicative cap rate of ${capDisplay} and all-in cap rate of ${allInCapDisplay}.`,
        summary.indicativeGrossValueAtTargetCap !== null
          ? `At the benchmark ${formatPercent(deal.targetCapRatePct, 2)} cap rate on unverified T12 USALI NOI, gross value is ${formatCurrency(summary.indicativeGrossValueAtTargetCap)} and net residual less PIP is ${formatCurrency(summary.indicativeNetMaoUnverified)} (${formatCurrency(baseCase.impliedNetMaoAfterPipAndClosing)} after 1.5% illustrative closing costs).`
          : `Income capitalization yields N/A due to non-positive T12 NOI (${formatCurrency(t12?.noi)}). Valuation is restricted to distressed basis/replacement-cost framing.`,
      ],
    },
    {
      number: 12,
      title: 'Strike Price and MAO',
      paragraphs: [
        `Governance Determination: Final MAO & Strike Price = ${summary.finalMaoWithheld ? 'WITHHELD (BLOCKED BY OPEN CRITICAL/HIGH GATES)' : formatCurrency(summary.indicativeNetMaoUnverified)}.`,
        summary.finalMaoWithheld
          ? `Master §8 and §31 P0 strictly prohibit issuing a binding numerical Final MAO, Strike Price, or hard-deposit recommendation while critical NOI, PIP, franchise, tax/insurance, financing, or safety verifications remain unresolved.`
          : `All gating blockers resolved; indicative net MAO eligible for final committee vote.`,
      ],
    },
    {
      number: 13,
      title: 'Return Analysis and Sensitivities',
      paragraphs: [
        `Levered / Unlevered Multi-Year IRR & Equity Multiple: BLOCKED / NOT SUPPORTED from verified evidence (debt terms, timed PIP drawdown, exit cap evidence, and tax resets remain UNKNOWN).`,
        `Unverified Scenario Cap-Rate Sensitivity Net Residuals (Less PIP & 1.5% Illustrative Closing Costs): Downside @ ${formatPercent(deal.targetCapRatePct + 0.75, 2)} = ${formatCurrency(downside.impliedNetMaoAfterPipAndClosing)}; Base @ ${formatPercent(deal.targetCapRatePct, 2)} = ${formatCurrency(baseCase.impliedNetMaoAfterPipAndClosing)}; Stabilized @ ${formatPercent(Math.max(6, deal.targetCapRatePct - 0.5), 2)} = ${formatCurrency(stabilized.impliedNetMaoAfterPipAndClosing)}.`,
      ],
    },
    {
      number: 14,
      title: 'Capital Stack and Waterfall',
      paragraphs: [
        `Capital Stack & JV Waterfall: NOT APPLICABLE / UNVERIFIED. No executed operating agreement, preferred return hurdle, catch-up, or promote waterfall exists in this single-asset underwriting file. Signed legal terms are never inferred without executed documentation.`,
      ],
    },
    {
      number: 15,
      title: 'Exit Analysis',
      paragraphs: [
        `Exit Analysis Status: ASSUMPTION / UNVERIFIED. Stabilized exit valuation depends on verified post-PIP RevPAR penetration, normalized post-FF&E NOI, prevailing exit cap rates, and remaining franchise term; no binding exit multiple is asserted.`,
      ],
    },
    {
      number: 16,
      title: 'Risks, Conflicts, and Missing Information',
      paragraphs: [
        `Underwriting identifies ${deal.blockers.length} gating evidence blocker(s), ${deal.conflicts.length} numerical source conflict(s), and ${deal.risks.length} risk item(s) across five diligence domains.`,
      ],
      bullets: [
        ...deal.blockers.map(
          (b) => `[${b.severity} Blocker — ${b.id}] ${b.title}: ${b.impactOnUnderwriting} (Action: ${b.requiredAction})`
        ),
        ...deal.conflicts.map(
          (c) => `[${c.severity} Conflict] ${c.metric}: ${c.sourceA} (${c.valueA}) vs. ${c.sourceB} (${c.valueB}) — ${c.varianceNote}`
        ),
        ...deal.risks.map(
          (r) => `[${r.severity} · ${r.domain}] ${r.title}: ${r.description} (Status: ${r.mitigantOrStatus})`
        ),
      ],
    },
    {
      number: 17,
      title: 'Action Plan and Conditions',
      paragraphs: [
        `Advancement of ${deal.id} (${deal.name}) is conditional on clearing every gating action below prior to releasing hard capital or finalizing MAO.`,
        `Session Diligence Notes: ${deal.investmentNotes}`,
      ],
      bullets: deal.nextActions,
    },
    {
      number: 18,
      title: 'Detailed Sources and Provenance',
      paragraphs: [
        `All ${deal.sourceRegister.length} tracked documents remain unverified, conflicted, or missing in this synthetic workspace; 0 unsupported inputs are marked verified.`,
      ],
      bullets: deal.sourceRegister.map(
        (d) => `[${d.status}] ${d.id} · ${d.title} (${d.category} · ${d.periodCovered} · ${d.provider}) — ${d.notes}`
      ),
    },
    {
      number: 19,
      title: 'Final Quality Gate and Status',
      paragraphs: [
        `Investment Eligibility Status: NOT FINAL (${deal.posture}). Final MAO = ${summary.finalMaoWithheld ? 'WITHHELD' : 'ELIGIBLE FOR REVIEW'}. EXTERNAL_INDEPENDENT_REVIEW: NOT RUN.`,
        `Technical QA Gate inspects canonical 19-section structure, Decision Screen completeness, numerical T12/negative-NOI/scenario checks, embedded fonts, PDF coordinate margins, and live-formula XLSX cross-reconciliation (with external Excel/LibreOffice recalculation parity explicitly disclosed as NOT VERIFIED where LibreOffice/Excel is absent).`,
      ],
    },
  ];
}
