import React from 'react';
import { CheckCircle2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { MasterPreflightResult } from '../../types/factory';

interface GoogleDriveAuthBarProps {
  preflight: MasterPreflightResult | null;
  userEmail: string | null;
  isChecking: boolean;
  authError: string | null;
  onSignIn: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

export const GoogleDriveAuthBar: React.FC<GoogleDriveAuthBarProps> = ({
  preflight,
  userEmail,
  isChecking,
  authError,
  onSignIn,
  onRefresh,
  onSignOut,
}) => {
  const status = preflight?.status ?? 'MASTER_ACCESS_BLOCKED';
  const isVerified = status === 'MASTER_VERIFIED';
  const isMismatch = status === 'BLOCKED_RELEASE_MISMATCH';

  return (
    <div
      className={`border rounded-md px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs ${
        isVerified
          ? 'bg-teal-50/60 border-teal-200 text-slate-800'
          : isMismatch
            ? 'bg-red-50 border-red-200 text-red-950'
            : 'bg-amber-50/70 border-amber-200 text-slate-800'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {isVerified ? (
          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <ShieldAlert
            className={`w-4 h-4 shrink-0 mt-0.5 ${isMismatch ? 'text-red-700' : 'text-amber-700'}`}
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                isVerified
                  ? 'bg-teal-100 text-teal-900'
                  : isMismatch
                    ? 'bg-red-100 text-red-900'
                    : 'bg-amber-100 text-amber-900'
              }`}
            >
              {status}
            </span>
            <span className="font-semibold text-slate-900">
              Canonical Master Control Plane &amp; Registered Templates (Read-Only Drive)
            </span>
            {userEmail && (
              <span className="font-mono text-slate-600">· Signed in: {userEmail}</span>
            )}
          </div>

          {isVerified && preflight?.tuple ? (
            <div className="space-y-1">
              <div className="font-mono text-[11px] text-slate-700">
                Master {preflight.tuple.masterVersion ? `v${preflight.tuple.masterVersion}` : 'live'} (
                {preflight.tuple.masterId}, rev {preflight.tuple.masterRevision ?? 'unknown'}) · Manifest{' '}
                {preflight.tuple.manifestId} (rev {preflight.tuple.manifestRevision ?? 'unknown'})
              </div>
              <div className="font-mono text-[11px] text-slate-600">
                ES rev {preflight.tuple.esTemplateRevision ?? '—'} · IC rev{' '}
                {preflight.tuple.icTemplateRevision ?? '—'} · Methodology rev{' '}
                {preflight.tuple.methodologyRevision ?? '—'} · Scope:{' '}
                {preflight.oauthScopeVerified ?? 'drive.readonly'}
              </div>
              {preflight.backendComplianceChecks && preflight.backendComplianceChecks.length > 0 && (
                <div className="text-[11px] text-slate-700">
                  {preflight.backendComplianceChecks
                    .map((c) => `${c.id}: ${c.status} (${c.detail})`)
                    .join(' | ')}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 text-slate-700">
              {preflight?.tuple?.masterId && (
                <div className="font-mono text-[11px] text-slate-600">
                  Known Master ID: {preflight.tuple.masterId} · Live Drive Revision: NOT VERIFIED
                </div>
              )}
              <div>
                {authError ||
                  preflight?.blockReason ||
                  'MASTER_ACCESS_BLOCKED — Connect private Google Drive in read-only mode (drive.readonly) so the private backend can verify live Master and Manifest revisions.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {!userEmail ? (
          <button
            type="button"
            disabled={isChecking}
            onClick={onSignIn}
            className="inline-flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded shadow-2xs hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-4 h-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            <span>{isChecking ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={isChecking}
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Re-verify Master</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Disconnect</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
