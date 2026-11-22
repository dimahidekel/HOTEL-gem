import {
  AnnualOperatingInput,
  ComputedAnnualOperating,
  HotelDeal,
  ScenarioParameters,
} from '../types/underwriting';

const DAYS_PER_YEAR = 365;

export function computeAnnualOperating(
  rooms: number,
  input: AnnualOperatingInput
): ComputedAnnualOperating {
  const roomsAvailableNights = Math.max(0, rooms) * DAYS_PER_YEAR;
  const occ = input.occupancyPct;
  const adr = input.adr;

  const canComputeRoomsFromDrivers =
    occ !== null && adr !== null && occ >= 0 && adr >= 0 && roomsAvailableNights > 0;

  const revPAR = canComputeRoomsFromDrivers ? adr * (occ / 100) : null;
  const occupiedRoomNights = canComputeRoomsFromDrivers
    ? Math.round(roomsAvailableNights * (occ / 100))
    : null;

  const roomsRevenue =
    input.explicitRoomsRevenue !== undefined
      ? input.explicitRoomsRevenue
      : revPAR !== null
        ? Math.round(roomsAvailableNights * revPAR)
        : null;

  if (roomsRevenue === null) {
    return {
      period: input.period,
      roomsAvailableNights,
      occupiedRoomNights,
      occupancyPct: occ,
      adr,
      revPAR,
      roomsRevenue: null,
      fbRevenue: input.fbRevenue,
      otherRevenue: input.otherRevenue,
      totalRevenue: null,
      departmentalExpenses: null,
      undistributedExpenses: null,
      gop: null,
      gopMarginPct: null,
      managementFee: null,
      franchiseFee: null,
      propertyTaxesAndInsurance: input.propertyTaxesAndInsurance,
      ffeReserve: null,
      noi: null,
      noiMarginPct: null,
    };
  }

  const totalRevenue = roomsRevenue + input.fbRevenue + input.otherRevenue;
  const departmentalExpenses = Math.round(
    totalRevenue * (input.departmentalExpenseRatioPct / 100)
  );
  const undistributedExpenses = Math.round(
    totalRevenue * (input.undistributedExpenseRatioPct / 100)
  );
  const gop = totalRevenue - departmentalExpenses - undistributedExpenses;
  const gopMarginPct = totalRevenue > 0 ? (gop / totalRevenue) * 100 : null;

  const managementFee = Math.round(totalRevenue * (input.managementFeePct / 100));
  const franchiseFee = Math.round(roomsRevenue * (input.franchiseFeePctOfRooms / 100));
  const ffeReserve = Math.round(totalRevenue * (input.ffeReservePct / 100));

  const noi =
    gop -
    managementFee -
    franchiseFee -
    input.propertyTaxesAndInsurance -
    ffeReserve;

  const noiMarginPct = totalRevenue > 0 ? (noi / totalRevenue) * 100 : null;

  return {
    period: input.period,
    roomsAvailableNights,
    occupiedRoomNights,
    occupancyPct: occ,
    adr,
    revPAR,
    roomsRevenue,
    fbRevenue: input.fbRevenue,
    otherRevenue: input.otherRevenue,
    totalRevenue,
    departmentalExpenses,
    undistributedExpenses,
    gop,
    gopMarginPct,
    managementFee,
    franchiseFee,
    propertyTaxesAndInsurance: input.propertyTaxesAndInsurance,
    ffeReserve,
    noi,
    noiMarginPct,
  };
}

export interface DealSummaryMetrics {
  t12: ComputedAnnualOperating;
  historical: ComputedAnnualOperating[];
  pricePerKey: number | null;
  indicativeCapRatePct: number | null;
  totalPipExposure: number;
  pipPerKey: number | null;
  allInBasis: number | null;
  allInBasisPerKey: number | null;
  allInCapRatePct: number | null;
  indicativeGrossValueAtTargetCap: number | null;
  indicativeNetMaoUnverified: number | null;
  criticalBlockerCount: number;
  highBlockerCount: number;
  conflictCount: number;
  finalMaoWithheld: boolean;
  breakEvenOccupancyPct: number | null;
}

export function computeDealSummary(deal: HotelDeal): DealSummaryMetrics {
  const historical = deal.historicalInputs.map((item) =>
    computeAnnualOperating(deal.rooms, item)
  );
  const t12 = historical[historical.length - 1];

  const pricePerKey =
    deal.askingPrice !== null && deal.askingPrice > 0 && deal.rooms > 0
      ? deal.askingPrice / deal.rooms
      : null;

  // NEVER display a positive cap rate for negative or zero NOI, or missing asking price
  const indicativeCapRatePct =
    deal.askingPrice !== null &&
    deal.askingPrice > 0 &&
    t12?.noi !== null &&
    t12.noi > 0
      ? (t12.noi / deal.askingPrice) * 100
      : null;

  const totalPipExposure = deal.pipItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const pipPerKey = deal.rooms > 0 ? totalPipExposure / deal.rooms : null;

  const allInBasis =
    deal.askingPrice !== null && deal.askingPrice > 0
      ? deal.askingPrice + totalPipExposure
      : null;
  const allInBasisPerKey =
    allInBasis !== null && deal.rooms > 0 ? allInBasis / deal.rooms : null;

  const allInCapRatePct =
    allInBasis !== null && allInBasis > 0 && t12?.noi !== null && t12.noi > 0
      ? (t12.noi / allInBasis) * 100
      : null;

  const indicativeGrossValueAtTargetCap =
    t12?.noi !== null && t12.noi > 0 && deal.targetCapRatePct > 0
      ? t12.noi / (deal.targetCapRatePct / 100)
      : null;

  const indicativeNetMaoUnverified =
    indicativeGrossValueAtTargetCap !== null
      ? Math.max(0, indicativeGrossValueAtTargetCap - totalPipExposure)
      : null;

  const criticalBlockerCount = deal.blockers.filter((b) => b.severity === 'Critical').length;
  const highBlockerCount = deal.blockers.filter((b) => b.severity === 'High').length;
  const finalMaoWithheld = deal.blockers.some((b) => b.blocksFinalMao);

  // Break-even occupancy estimation:
  // Fixed burden = taxes&insurance + undistributedExpenses (partially fixed ~70%) vs rooms contribution margin
  let breakEvenOccupancyPct: number | null = null;
  const t12Input = deal.historicalInputs[deal.historicalInputs.length - 1];
  if (
    t12 &&
    t12.totalRevenue !== null &&
    t12.totalRevenue > 0 &&
    t12.adr !== null &&
    t12.adr > 0 &&
    t12.occupancyPct !== null &&
    t12.occupancyPct > 0 &&
    t12.noi !== null
  ) {
    // Approximate contribution ratio after variable departmental + mgmt + franchise + FF&E
    const variablePct =
      (t12Input.departmentalExpenseRatioPct +
        t12Input.managementFeePct +
        t12Input.ffeReservePct +
        t12Input.franchiseFeePctOfRooms * 0.75) /
      100;
    const contributionMargin = Math.max(0.15, 1 - variablePct);
    const fixedCosts =
      (t12.undistributedExpenses ?? 0) + t12Input.propertyTaxesAndInsurance;
    const breakEvenRevenue = fixedCosts / contributionMargin;
    const nonRoomRev = t12.fbRevenue + t12.otherRevenue;
    const neededRoomRev = Math.max(0, breakEvenRevenue - nonRoomRev);
    const maxRoomRevAt100Occ = deal.rooms * DAYS_PER_YEAR * t12.adr;
    if (maxRoomRevAt100Occ > 0) {
      breakEvenOccupancyPct = Math.min(100, Math.max(0, (neededRoomRev / maxRoomRevAt100Occ) * 100));
    }
  }

  return {
    t12,
    historical,
    pricePerKey,
    indicativeCapRatePct,
    totalPipExposure,
    pipPerKey,
    allInBasis,
    allInBasisPerKey,
    allInCapRatePct,
    indicativeGrossValueAtTargetCap,
    indicativeNetMaoUnverified,
    criticalBlockerCount,
    highBlockerCount,
    conflictCount: deal.conflicts.length,
    finalMaoWithheld,
    breakEvenOccupancyPct,
  };
}

export interface ScenarioResult {
  proFormaOccupancyPct: number | null;
  proFormaAdr: number | null;
  proFormaRevPAR: number | null;
  proFormaTotalRevenue: number | null;
  proFormaGop: number | null;
  proFormaNoi: number | null;
  proFormaNoiMarginPct: number | null;
  impliedGrossValue: number | null;
  impliedGrossPerKey: number | null;
  impliedNetMaoAfterPipAndClosing: number | null;
  impliedNetPerKey: number | null;
  spreadVsAsking: number | null;
}

export function computeScenarioProjection(
  deal: HotelDeal,
  scenario: ScenarioParameters
): ScenarioResult {
  const t12Input = deal.historicalInputs[deal.historicalInputs.length - 1];
  if (
    !t12Input ||
    t12Input.occupancyPct === null ||
    t12Input.adr === null
  ) {
    return {
      proFormaOccupancyPct: null,
      proFormaAdr: null,
      proFormaRevPAR: null,
      proFormaTotalRevenue: null,
      proFormaGop: null,
      proFormaNoi: null,
      proFormaNoiMarginPct: null,
      impliedGrossValue: null,
      impliedGrossPerKey: null,
      impliedNetMaoAfterPipAndClosing: null,
      impliedNetPerKey: null,
      spreadVsAsking: null,
    };
  }

  const adjOcc = Math.min(95, Math.max(15, t12Input.occupancyPct + scenario.occupancyDeltaPctPts));
  const adjAdr = Math.max(40, t12Input.adr * (1 + scenario.adrDeltaPct / 100));
  const adjInput: AnnualOperatingInput = {
    ...t12Input,
    period: 'Pro Forma',
    occupancyPct: adjOcc,
    adr: adjAdr,
    explicitRoomsRevenue: undefined,
    departmentalExpenseRatioPct: Math.max(
      12,
      t12Input.departmentalExpenseRatioPct + scenario.expenseDeltaPctPts * 0.55
    ),
    undistributedExpenseRatioPct: Math.max(
      10,
      t12Input.undistributedExpenseRatioPct + scenario.expenseDeltaPctPts * 0.45
    ),
  };

  const computed = computeAnnualOperating(deal.rooms, adjInput);
  const impliedGrossValue =
    computed.noi !== null && computed.noi > 0 && scenario.targetCapRatePct > 0
      ? computed.noi / (scenario.targetCapRatePct / 100)
      : null;

  const closingCosts =
    impliedGrossValue !== null ? impliedGrossValue * (scenario.closingCostsPct / 100) : 0;

  const impliedNetMaoAfterPipAndClosing =
    impliedGrossValue !== null
      ? Math.max(0, impliedGrossValue - scenario.pipExposureOverride - closingCosts)
      : null;

  const impliedGrossPerKey =
    impliedGrossValue !== null && deal.rooms > 0 ? impliedGrossValue / deal.rooms : null;
  const impliedNetPerKey =
    impliedNetMaoAfterPipAndClosing !== null && deal.rooms > 0
      ? impliedNetMaoAfterPipAndClosing / deal.rooms
      : null;

  const spreadVsAsking =
    impliedNetMaoAfterPipAndClosing !== null && deal.askingPrice !== null
      ? impliedNetMaoAfterPipAndClosing - deal.askingPrice
      : null;

  return {
    proFormaOccupancyPct: computed.occupancyPct,
    proFormaAdr: computed.adr,
    proFormaRevPAR: computed.revPAR,
    proFormaTotalRevenue: computed.totalRevenue,
    proFormaGop: computed.gop,
    proFormaNoi: computed.noi,
    proFormaNoiMarginPct: computed.noiMarginPct,
    impliedGrossValue,
    impliedGrossPerKey,
    impliedNetMaoAfterPipAndClosing,
    impliedNetPerKey,
    spreadVsAsking,
  };
}

export function formatCurrency(value: number | null | undefined, compact = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    }
  }
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

export function formatCurrencyExact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(decimals)}%`;
}

export function formatCapRate(
  capRatePct: number | null | undefined,
  noi: number | null | undefined
): string {
  if (noi !== null && noi !== undefined && noi <= 0) {
    return 'N/A';
  }
  if (capRatePct === null || capRatePct === undefined || capRatePct <= 0 || Number.isNaN(capRatePct)) {
    return 'N/A';
  }
  return `${capRatePct.toFixed(2)}%`;
}
