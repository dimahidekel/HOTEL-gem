export type NavRoute =
  | 'dashboard'
  | 'deals'
  | 'new-deal'
  | 'workspace'
  | 'admin';

export type WorkspaceTab =
  | 'decision-screen'
  | 'financials'
  | 'valuation'
  | 'market'
  | 'risks-evidence'
  | 'executive-summary'
  | 'full-ic-memo'
  | 'documents-qa';

export type InvestmentPosture =
  | 'CONDITIONAL BUY'
  | 'FURTHER DILIGENCE'
  | 'HOLD / KILL'
  | 'PENDING INTAKE';

export type EvidenceStatusSummary =
  | 'Partial — Critical Blockers'
  | 'Incomplete — Critical Blockers'
  | 'Critical Deficiencies'
  | 'Intake Unverified';

export type DocumentVerificationStatus =
  | 'Received — Unverified'
  | 'Missing'
  | 'Conflicted'
  | 'Pending Third-Party';

export type SeverityLevel = 'Critical' | 'High' | 'Moderate' | 'Low';

export interface AnnualOperatingInput {
  period: string;
  occupancyPct: number | null;
  adr: number | null;
  fbRevenue: number;
  otherRevenue: number;
  departmentalExpenseRatioPct: number; // % of total revenue
  undistributedExpenseRatioPct: number; // % of total revenue
  managementFeePct: number; // % of total revenue
  franchiseFeePctOfRooms: number; // % of rooms revenue
  propertyTaxesAndInsurance: number;
  ffeReservePct: number; // % of total revenue
  /** Optional explicit override when historical revenue/expenses are fixed or missing rooms breakdown */
  explicitRoomsRevenue?: number;
}

export interface ComputedAnnualOperating {
  period: string;
  roomsAvailableNights: number;
  occupiedRoomNights: number | null;
  occupancyPct: number | null;
  adr: number | null;
  revPAR: number | null;
  roomsRevenue: number | null;
  fbRevenue: number;
  otherRevenue: number;
  totalRevenue: number | null;
  departmentalExpenses: number | null;
  undistributedExpenses: number | null;
  gop: number | null;
  gopMarginPct: number | null;
  managementFee: number | null;
  franchiseFee: number | null;
  propertyTaxesAndInsurance: number;
  ffeReserve: number | null;
  noi: number | null;
  noiMarginPct: number | null;
}

export interface PipCapexItem {
  id: string;
  category: string;
  scopeDescription: string;
  estimatedCost: number;
  timing: 'Immediate / Year 0' | 'Year 1' | 'Year 2' | 'Life-Safety Urgent' | 'Unscheduled / Unverified';
  quoteBasis: 'Vendor Quote (Unverified)' | 'Sponsor Estimate' | 'Engineering Rough Order';
}

export interface CompProperty {
  name: string;
  chainScale: string;
  keys: number;
  distanceMiles: number;
  estOccupancyPct: number;
  estAdr: number;
  conditionNote: string;
}

export interface SupplyPipelineItem {
  projectName: string;
  brand: string;
  keys: number;
  distanceMiles: number;
  status: 'Under Construction' | 'Permitted' | 'Proposed';
  expectedDelivery: string;
}

export interface SourceDocumentItem {
  id: string;
  title: string;
  category: 'Financials' | 'Franchise / Brand' | 'Physical / Engineering' | 'Environmental / Legal' | 'Market / STR';
  periodCovered: string;
  provider: string;
  status: DocumentVerificationStatus;
  notes: string;
}

export interface MissingEvidenceBlocker {
  id: string;
  title: string;
  severity: 'Critical' | 'High';
  impactOnUnderwriting: string;
  requiredAction: string;
  blocksFinalMao: boolean;
}

export interface FinancialConflictItem {
  id: string;
  metric: string;
  sourceA: string;
  valueA: string;
  sourceB: string;
  valueB: string;
  varianceNote: string;
  severity: SeverityLevel;
}

export interface RiskItem {
  id: string;
  domain: 'Market & Supply' | 'Physical / Capex' | 'Financial / P&L' | 'Franchise & Labor' | 'Environmental / Code';
  title: string;
  severity: SeverityLevel;
  description: string;
  mitigantOrStatus: string;
}

export interface DealActivityItem {
  id: string;
  dealId: string;
  dealName: string;
  date: string;
  actor: string;
  summary: string;
}

export interface HotelDeal {
  id: string;
  name: string;
  location: string;
  submarket: string;
  assetClass: string;
  brand: string;
  yearBuilt: number | null;
  lastRenovated: number | null;
  rooms: number;
  askingPrice: number | null;
  targetCapRatePct: number;
  posture: InvestmentPosture;
  evidenceStatus: EvidenceStatusSummary;
  isSessionCreated?: boolean;
  createdAt: string;
  investmentThesis: string;
  postureRationale: string;
  nextActions: string[];
  historicalInputs: AnnualOperatingInput[]; // ordered oldest -> T12 (last item is T12)
  pipItems: PipCapexItem[];
  marketOverview: {
    demandDrivers: string[];
    airliftAndAccess: string;
    strCompSetNote: string;
    occupancyIndex: number | null;
    adrIndex: number | null;
    revparIndex: number | null;
  };
  compSet: CompProperty[];
  supplyPipeline: SupplyPipelineItem[];
  sourceRegister: SourceDocumentItem[];
  blockers: MissingEvidenceBlocker[];
  conflicts: FinancialConflictItem[];
  risks: RiskItem[];
  investmentNotes: string;
}

export interface ScenarioParameters {
  occupancyDeltaPctPts: number; // e.g. -5 to +10
  adrDeltaPct: number; // e.g. -10 to +15
  expenseDeltaPctPts: number; // e.g. -3 to +5
  targetCapRatePct: number; // e.g. 6.0 to 12.0
  pipExposureOverride: number;
  closingCostsPct: number; // e.g. 1.5%
}
