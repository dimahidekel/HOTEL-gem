import React from 'react';
import { Lock } from 'lucide-react';

const PLANNED_ROLES = [
  {
    role: 'IC Chair / Managing Director',
    permissions: 'Release Final MAO, approve LOI pricing, override evidence holdbacks with logged rationale.',
    seats: 'Planned (Disabled)',
  },
  {
    role: 'Senior Underwriter',
    permissions: 'Create/edit deal models, run scenario sensitivities, draft Executive Summaries & IC Memos.',
    seats: 'Planned (Disabled)',
  },
  {
    role: 'Diligence & QA Reviewer',
    permissions: 'Audit source register documents, flag cross-source conflicts, lock/unlock evidence blockers.',
    seats: 'Planned (Disabled)',
  },
  {
    role: 'Read-Only Observer / LP',
    permissions: 'View approved Investment Decision Screens and published demonstration memos only.',
    seats: 'Planned (Disabled)',
  },
];

export const AdminUsersView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Admin &amp; User Governance (Future State)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Role-based access control (RBAC) architecture preview for future authenticated deployment.
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-300 rounded cursor-not-allowed whitespace-nowrap self-start sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Invite User (Disabled)</span>
        </button>
      </div>

      {/* Explicit Disabled Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-md p-5 flex items-start gap-3.5">
        <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm">
          <div className="font-semibold text-white">
            ADMINISTRATION DISABLED — Authentication &amp; RBAC Backend Not Implemented in v1
          </div>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Per security requirements for this first static SPA milestone, user provisioning,
            identity federation (SSO), and role assignment controls are intentionally disabled until
            secure authentication and server-side RBAC enforcement are implemented.
          </p>
        </div>
      </div>

      {/* Planned RBAC Matrix */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden opacity-85">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Planned Role-Based Access Control Matrix (Read-Only Specification)
          </h2>
          <span className="text-xs font-mono text-slate-500">Status: Disabled</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Role Name</th>
                <th className="py-3 px-4">Intended Underwriting Permissions</th>
                <th className="py-3 px-4 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PLANNED_ROLES.map((r) => (
                <tr key={r.role}>
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {r.role}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{r.permissions}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                    {r.seats}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disabled Policy Controls */}
      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Governance Policy Toggles (Locked Pending Auth Backend)
        </h2>
        <div className="space-y-3 text-sm">
          <label className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 text-slate-600">
            <span>Require dual-reviewer sign-off on Phase I ESA &amp; PIP quotes prior to MAO release</span>
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              className="h-4 w-4 accent-slate-500 cursor-not-allowed"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 text-slate-600">
            <span>Block external binary document export until Master QA audit status is verified</span>
            <input
              type="checkbox"
              checked
              disabled
              readOnly
              className="h-4 w-4 accent-slate-500 cursor-not-allowed"
            />
          </label>
          <label className="flex items-center justify-between gap-4 py-2 text-slate-600">
            <span>Enforce SSO / OIDC session expiry (15-minute idle timeout)</span>
            <input
              type="checkbox"
              disabled
              readOnly
              className="h-4 w-4 accent-slate-500 cursor-not-allowed"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
