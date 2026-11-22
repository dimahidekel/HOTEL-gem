import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import {
  EvidenceStatusSummary,
  HotelDeal,
  InvestmentPosture,
  NavRoute,
  WorkspaceTab,
} from '../types/underwriting';
import {
  computeDealSummary,
  formatCapRate,
  formatCurrency,
} from '../utils/financials';
import { PostureLabel } from './ui/PostureText';

type SortField =
  | 'name'
  | 'location'
  | 'rooms'
  | 'askingPrice'
  | 'pricePerKey'
  | 'revenue'
  | 'noi'
  | 'capRate'
  | 'posture';

interface AllDealsViewProps {
  deals: HotelDeal[];
  onOpenDeal: (dealId: string, tab?: WorkspaceTab) => void;
  onNavigate: (route: NavRoute) => void;
}

export const AllDealsView: React.FC<AllDealsViewProps> = ({
  deals,
  onOpenDeal,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [postureFilter, setPostureFilter] = useState<'ALL' | InvestmentPosture>('ALL');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | EvidenceStatusSummary>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const enriched = deals.map((deal) => ({
      deal,
      summary: computeDealSummary(deal),
    }));

    const filtered = enriched.filter(({ deal }) => {
      if (postureFilter !== 'ALL' && deal.posture !== postureFilter) return false;
      if (evidenceFilter !== 'ALL' && deal.evidenceStatus !== evidenceFilter) return false;
      if (!q) return true;
      return (
        deal.name.toLowerCase().includes(q) ||
        deal.id.toLowerCase().includes(q) ||
        deal.location.toLowerCase().includes(q) ||
        deal.brand.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const getVal = (item: typeof a): string | number => {
        switch (sortField) {
          case 'name':
            return item.deal.name;
          case 'location':
            return item.deal.location;
          case 'rooms':
            return item.deal.rooms;
          case 'askingPrice':
            return item.deal.askingPrice ?? -1;
          case 'pricePerKey':
            return item.summary.pricePerKey ?? -1;
          case 'revenue':
            return item.summary.t12?.totalRevenue ?? -1;
          case 'noi':
            return item.summary.t12?.noi ?? -999999999;
          case 'capRate':
            return item.summary.indicativeCapRatePct ?? -1;
          case 'posture':
            return item.deal.posture;
        }
      };

      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });

    return filtered;
  }, [deals, searchQuery, postureFilter, evidenceFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' || field === 'location' || field === 'posture' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 inline ml-1" aria-hidden="true" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-teal-800 inline ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3 h-3 text-teal-800 inline ml-1" aria-hidden="true" />
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">All Deals</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, sort, and filter synthetic hotel acquisition files ({rows.length} of {deals.length} shown)
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('new-deal')}
          className="px-4 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded whitespace-nowrap self-start sm:self-auto"
        >
          New Synthetic Deal
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by property name, Deal ID, city, or brand..."
            aria-label="Search hotel deals"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-teal-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={postureFilter}
            onChange={(e) => setPostureFilter(e.target.value as 'ALL' | InvestmentPosture)}
            aria-label="Filter by investment posture"
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800"
          >
            <option value="ALL">All Postures</option>
            <option value="CONDITIONAL BUY">CONDITIONAL BUY</option>
            <option value="FURTHER DILIGENCE">FURTHER DILIGENCE</option>
            <option value="HOLD / KILL">HOLD / KILL</option>
            <option value="PENDING INTAKE">PENDING INTAKE</option>
          </select>

          <select
            value={evidenceFilter}
            onChange={(e) => setEvidenceFilter(e.target.value as 'ALL' | EvidenceStatusSummary)}
            aria-label="Filter by evidence status"
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800"
          >
            <option value="ALL">All Evidence States</option>
            <option value="Partial — Critical Blockers">Partial — Critical Blockers</option>
            <option value="Incomplete — Critical Blockers">Incomplete — Critical Blockers</option>
            <option value="Critical Deficiencies">Critical Deficiencies</option>
            <option value="Intake Unverified">Intake Unverified</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="text-sm font-medium text-slate-800">
              No synthetic deals match your current search or filter criteria.
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setPostureFilter('ALL');
                setEvidenceFilter('ALL');
              }}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('name')} className="hover:text-slate-900">
                      Property {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('location')} className="hover:text-slate-900">
                      Location {renderSortIcon('location')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button type="button" onClick={() => toggleSort('rooms')} className="hover:text-slate-900">
                      Keys {renderSortIcon('rooms')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button type="button" onClick={() => toggleSort('askingPrice')} className="hover:text-slate-900">
                      Asking Price {renderSortIcon('askingPrice')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button type="button" onClick={() => toggleSort('pricePerKey')} className="hover:text-slate-900">
                      Price / Key {renderSortIcon('pricePerKey')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button type="button" onClick={() => toggleSort('revenue')} className="hover:text-slate-900">
                      T12 Revenue {renderSortIcon('revenue')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button type="button" onClick={() => toggleSort('noi')} className="hover:text-slate-900">
                      T12 NOI {renderSortIcon('noi')}
                    </button>
                  </th>
                  <th className="py-3 px-4 text-right">
                    <button type="button" onClick={() => toggleSort('capRate')} className="hover:text-slate-900">
                      Cap Rate {renderSortIcon('capRate')}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('posture')} className="hover:text-slate-900">
                      Posture {renderSortIcon('posture')}
                    </button>
                  </th>
                  <th className="py-3 px-4">Evidence Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map(({ deal, summary }) => (
                  <tr
                    key={deal.id}
                    onClick={() => onOpenDeal(deal.id, 'decision-screen')}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{deal.name}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {deal.id} · {deal.brand}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{deal.location}</td>
                    <td className="py-3 px-4 text-right font-mono">{deal.rooms}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(deal.askingPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(summary.pricePerKey)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(summary.t12?.totalRevenue)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-medium ${
                        summary.t12?.noi !== null && summary.t12.noi < 0
                          ? 'text-red-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(summary.t12?.noi)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCapRate(summary.indicativeCapRatePct, summary.t12?.noi)}
                    </td>
                    <td className="py-3 px-4">
                      <PostureLabel posture={deal.posture} />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {deal.evidenceStatus}
                    </td>
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
