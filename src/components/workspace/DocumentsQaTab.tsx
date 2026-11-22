import React, { useState } from 'react';
import { DocumentVerificationStatus, HotelDeal } from '../../types/underwriting';
import { DealSummaryMetrics } from '../../utils/financials';
import { DocStatusLabel } from '../ui/PostureText';

export const DocumentsQaTab: React.FC<{
  deal: HotelDeal;
  summary: DealSummaryMetrics;
}> = ({ deal, summary }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentVerificationStatus>('ALL');

  const filteredDocs =
    statusFilter === 'ALL'
      ? deal.sourceRegister
      : deal.sourceRegister.filter((d) => d.status === statusFilter);

  const missingCount = deal.sourceRegister.filter((d) => d.status === 'Missing').length;
  const conflictedCount = deal.sourceRegister.filter((d) => d.status === 'Conflicted').length;
  const unverifiedCount = deal.sourceRegister.filter(
    (d) => d.status === 'Received — Unverified'
  ).length;

  return (
    <div className="space-y-6">
      {/* QA Governance Summary */}
      <div className="bg-white border border-slate-200 rounded-md">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Evidence Quality Assurance &amp; Source Verification Register
          </h3>
          <span className="text-xs font-mono text-slate-600">
            Verified Docs: 0 / {deal.sourceRegister.length} · Unsupported assumptions never marked verified
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-4">
            <div className="text-xs text-slate-500">Received — Unverified</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-slate-900">
              {unverifiedCount}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Missing Required Files</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-red-700">
              {missingCount}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Conflicted Sources</div>
            <div className="mt-1 text-xl font-semibold font-mono tabular-nums text-amber-800">
              {conflictedCount}
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Final MAO Gate</div>
            <div className="mt-1 text-sm font-semibold font-mono text-red-800">
              {summary.finalMaoWithheld ? 'LOCKED (WITHHELD)' : 'OPEN'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Source Register Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Source Document Register</h3>
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                'ALL',
                'Received — Unverified',
                'Missing',
                'Conflicted',
              ] as const
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? `All (${deal.sourceRegister.length})` : status}
              </button>
            ))}
          </div>
        </div>

        {filteredDocs.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No documents match the selected status filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4">Doc ID</th>
                  <th className="py-2.5 px-4">Document Title</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">QA Status</th>
                  <th className="py-2.5 px-4">Diligence Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {doc.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{doc.title}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{doc.category}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {doc.periodCovered}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{doc.provider}</td>
                    <td className="py-3 px-4">
                      <DocStatusLabel status={doc.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">{doc.notes}</td>
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
