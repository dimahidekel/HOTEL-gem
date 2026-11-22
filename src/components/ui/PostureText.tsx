import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  XCircle,
} from 'lucide-react';
import {
  DocumentVerificationStatus,
  InvestmentPosture,
  SeverityLevel,
} from '../../types/underwriting';

export const PostureLabel: React.FC<{ posture: InvestmentPosture }> = ({ posture }) => {
  switch (posture) {
    case 'CONDITIONAL BUY':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-teal-800 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" aria-hidden="true" />
          <span>CONDITIONAL BUY</span>
        </span>
      );
    case 'FURTHER DILIGENCE':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-800 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
          <span>FURTHER DILIGENCE</span>
        </span>
      );
    case 'HOLD / KILL':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-red-800 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 text-red-700 shrink-0" aria-hidden="true" />
          <span>HOLD / KILL</span>
        </span>
      );
    case 'PENDING INTAKE':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-700 whitespace-nowrap">
          <FileWarning className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
          <span>PENDING INTAKE</span>
        </span>
      );
  }
};

export const SeverityLabel: React.FC<{ severity: SeverityLevel }> = ({ severity }) => {
  const colorClass =
    severity === 'Critical'
      ? 'text-red-800'
      : severity === 'High'
        ? 'text-amber-800'
        : severity === 'Moderate'
          ? 'text-slate-700'
          : 'text-teal-800';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${colorClass}`}>
      {severity === 'Critical' || severity === 'High' ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : null}
      <span>{severity}</span>
    </span>
  );
};

export const DocStatusLabel: React.FC<{ status: DocumentVerificationStatus }> = ({ status }) => {
  const colorClass =
    status === 'Missing' || status === 'Conflicted'
      ? 'text-red-800'
      : status === 'Pending Third-Party'
        ? 'text-amber-800'
        : 'text-slate-700';

  return (
    <span className={`text-xs font-medium whitespace-nowrap ${colorClass}`}>
      {status}
    </span>
  );
};
