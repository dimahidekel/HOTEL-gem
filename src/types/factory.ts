import { HotelDeal } from './underwriting';
import { DealSummaryMetrics } from '../utils/financials';
import { MemoSection } from '../data/memoGenerator';

export type DocumentType = 'executive-summary' | 'full-ic-memo';

export type MasterComplianceStatus =
  | 'MASTER_VERIFIED'
  | 'MASTER_PREFLIGHT_ONLY'
  | 'MASTER_ACCESS_BLOCKED'
  | 'BLOCKED_RELEASE_MISMATCH';

export interface MasterPreflightTuple {
  manifestId: string;
  manifestName: string | null;
  manifestVersion: string | null;
  manifestRevision: string | null;
  manifestDigest?: string | null;
  masterId: string | null;
  masterName: string | null;
  masterVersion: string | null;
  masterRevision: string | null;
  masterDigest?: string | null;
  esTemplateId: string;
  esTemplateRevision: string | null;
  esTemplateDigest: string | null;
  icTemplateId: string;
  icTemplateRevision: string | null;
  icTemplateDigest: string | null;
  methodologyId: string;
  methodologyRevision: string | null;
  methodologyDigest?: string | null;
  executionQaId?: string;
  executionQaRevision?: string | null;
  calcHelperId?: string;
  calcHelperRevision?: string | null;
  continuityId?: string;
  continuityRevision?: string | null;
  detroitProfileId?: string;
  detroitProfileRevision?: string | null;
  pipelineDocId?: string | null;
  pipelineDocRevision?: string | null;
  checkedAt: string;
}

export interface BackendComplianceCheck {
  id: string;
  label: string;
  status: 'MATCH' | 'GAP' | 'UNVERIFIED';
  detail: string;
}

export interface MasterPreflightResult {
  status: MasterComplianceStatus;
  driveConnected: boolean;
  oauthScopeVerified?: string | null;
  blockReason: string | null;
  userEmail?: string | null;
  tuple: MasterPreflightTuple;
  esTemplateHeadings?: string[];
  icTemplateHeadings?: string[];
  backendComplianceChecks?: BackendComplianceCheck[];
}

export interface MasterProvenance {
  masterRevision: string;
  runtimeManifestStatus: MasterComplianceStatus | 'UNRESOLVED';
  templateId: string;
  driveConnected: boolean;
  complianceStatus: MasterComplianceStatus;
  blockReason: string | null;
  preflightTuple?: MasterPreflightTuple;
  disclaimer: string;
}

export interface FrozenUnderwritingSnapshot {
  snapshotId: string;
  snapshotHash: string;
  createdAt: string;
  dealId: string;
  dealName: string;
  deal: HotelDeal;
  summary: DealSummaryMetrics;
  esSections: MemoSection[];
  icSections: MemoSection[];
  masterProvenance: MasterProvenance;
}

export interface QaCheckResult {
  id: string;
  category: 'Numerical' | 'DOCX Structure' | 'PDF Layout' | 'XLSX Formula' | 'Governance';
  label: string;
  passed: boolean;
  detail: string;
}

export interface ArtifactFileInfo {
  format: 'docx' | 'pdf' | 'xlsx';
  filename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  downloadUrl: string;
}

export interface GeneratedArtifactRecord {
  artifactId: string;
  snapshotId: string;
  snapshotHash: string;
  dealId: string;
  dealName: string;
  docType: DocumentType;
  version: number;
  createdAt: string;
  reusedFrozenSnapshot: boolean;
  masterProvenance: MasterProvenance;
  releaseStatus:
    | 'MASTER_VERIFIED_QA_PASSED'
    | 'SYNTHETIC_QA_PASSED_NOT_MASTER_COMPLIANT'
    | 'MASTER_ACCESS_BLOCKED_SYNTHETIC_QA_PASSED'
    | 'BLOCKED_QA_FAILED';
  qaPassed: boolean;
  qaChecks: QaCheckResult[];
  pdfPageCount: number;
  docxParagraphCount: number;
  xlsxFormulaCount: number;
  files: ArtifactFileInfo[];
}

export interface FactoryRuntimeStatus {
  stage: 'MASTER_DRIVE_READY' | 'STAGE_A_SYNTHETIC';
  driveIntegration: 'GOOGLE_DRIVE_READONLY_OAUTH';
  masterAccessStatus: MasterComplianceStatus;
  masterRevision: string;
  masterComplianceStatus: MasterComplianceStatus;
  snapshotCount: number;
  artifactCount: number;
  supportedFormats: ('docx' | 'pdf' | 'xlsx')[];
}
