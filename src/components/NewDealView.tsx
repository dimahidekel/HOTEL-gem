import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { buildNewSyntheticDeal } from '../data/syntheticDeals';
import { HotelDeal } from '../types/underwriting';
import {
  computeDealSummary,
  formatCapRate,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
} from '../utils/financials';

interface NewDealViewProps {
  nextIndex: number;
  onCreateDeal: (deal: HotelDeal) => void;
  onCancel: () => void;
}

export const NewDealView: React.FC<NewDealViewProps> = ({
  nextIndex,
  onCreateDeal,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [rooms, setRooms] = useState('150');
  const [brand, setBrand] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [occupancyPct, setOccupancyPct] = useState('70.0');
  const [adr, setAdr] = useState('175.00');
  const [fbAndOtherRevenue, setFbAndOtherRevenue] = useState('750000');
  const [estimatedPip, setEstimatedPip] = useState('2500000');
  const [investmentNotes, setInvestmentNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedRooms = Number(rooms);
  const parsedAsk = askingPrice.trim() === '' ? null : Number(askingPrice);
  const parsedOcc = occupancyPct.trim() === '' ? null : Number(occupancyPct);
  const parsedAdr = adr.trim() === '' ? null : Number(adr);
  const parsedOtherRev = fbAndOtherRevenue.trim() === '' ? 0 : Number(fbAndOtherRevenue);
  const parsedPip = estimatedPip.trim() === '' ? 0 : Number(estimatedPip);

  const livePreview = useMemo(() => {
    if (!Number.isFinite(parsedRooms) || parsedRooms <= 0) return null;
    const draft = buildNewSyntheticDeal(
      {
        name: name || 'Draft Property',
        location: location || 'Target Market',
        rooms: Math.round(parsedRooms),
        brand: brand || 'Independent',
        askingPrice: parsedAsk !== null && Number.isFinite(parsedAsk) && parsedAsk > 0 ? parsedAsk : null,
        occupancyPct: parsedOcc !== null && Number.isFinite(parsedOcc) ? parsedOcc : null,
        adr: parsedAdr !== null && Number.isFinite(parsedAdr) ? parsedAdr : null,
        fbAndOtherRevenue: Number.isFinite(parsedOtherRev) && parsedOtherRev >= 0 ? parsedOtherRev : 0,
        estimatedPip: Number.isFinite(parsedPip) && parsedPip >= 0 ? parsedPip : 0,
        investmentNotes,
      },
      nextIndex
    );
    return { deal: draft, summary: computeDealSummary(draft) };
  }, [
    name,
    location,
    parsedRooms,
    brand,
    parsedAsk,
    parsedOcc,
    parsedAdr,
    parsedOtherRev,
    parsedPip,
    investmentNotes,
    nextIndex,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Property Name is required.');
      return;
    }
    if (!location.trim()) {
      setError('Location (City, State) is required.');
      return;
    }
    if (!Number.isFinite(parsedRooms) || parsedRooms < 10 || parsedRooms > 5000) {
      setError('Room count must be a valid integer between 10 and 5,000.');
      return;
    }
    if (parsedAsk !== null && (!Number.isFinite(parsedAsk) || parsedAsk <= 0)) {
      setError('Optional Asking Price must be greater than $0 if supplied.');
      return;
    }
    if (parsedOcc !== null && (!Number.isFinite(parsedOcc) || parsedOcc < 0 || parsedOcc > 100)) {
      setError('T12 Occupancy must be between 0% and 100%.');
      return;
    }
    if (parsedAdr !== null && (!Number.isFinite(parsedAdr) || parsedAdr <= 0)) {
      setError('T12 ADR must be greater than $0 if supplied.');
      return;
    }

    setError(null);
    const created = buildNewSyntheticDeal(
      {
        name: name.trim(),
        location: location.trim(),
        rooms: Math.round(parsedRooms),
        brand: brand.trim() || 'Independent',
        askingPrice: parsedAsk,
        occupancyPct: parsedOcc,
        adr: parsedAdr,
        fbAndOtherRevenue: Number.isFinite(parsedOtherRev) && parsedOtherRev >= 0 ? parsedOtherRev : 0,
        estimatedPip: Number.isFinite(parsedPip) && parsedPip >= 0 ? parsedPip : 0,
        investmentNotes: investmentNotes.trim(),
      },
      nextIndex
    );
    onCreateDeal(created);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          New Synthetic Deal Intake
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Log a fictional acquisition candidate into the underwriting workspace for immediate analysis.
        </p>
      </div>

      {/* Explicit Session Persistence Disclosure */}
      <div className="bg-slate-100 border border-slate-300 rounded-md px-5 py-3.5 flex items-start gap-3 text-sm text-slate-800">
        <Info className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="font-semibold">Browser-Session Storage Only:</strong> New synthetic
          deals appear in Dashboard, All Deals, and the 8-tab Workspace immediately, but persist{' '}
          <strong>only within the current browser tab session</strong>. Reloading or closing the tab
          resets the pipeline to the three baseline synthetic files (no backend database is connected in v1).
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Intake Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6 space-y-5"
          noValidate
        >
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded text-sm"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="deal-name" className="block text-xs font-medium text-slate-700 mb-1">
                Property Name (Fictional) *
              </label>
              <input
                id="deal-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., The Riverwalk Meridian Suites"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
              />
            </div>

            <div>
              <label htmlFor="deal-location" className="block text-xs font-medium text-slate-700 mb-1">
                Location (City, State) *
              </label>
              <input
                id="deal-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Denver, CO"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
              />
            </div>

            <div>
              <label htmlFor="deal-brand" className="block text-xs font-medium text-slate-700 mb-1">
                Brand / Affiliation
              </label>
              <input
                id="deal-brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Independent or Horizon Suites"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
              />
            </div>

            <div>
              <label htmlFor="deal-rooms" className="block text-xs font-medium text-slate-700 mb-1">
                Room Count (Keys) *
              </label>
              <input
                id="deal-rooms"
                type="number"
                min={10}
                max={5000}
                required
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
              />
            </div>

            <div>
              <label htmlFor="deal-ask" className="block text-xs font-medium text-slate-700 mb-1">
                Asking Price ($, Optional)
              </label>
              <input
                id="deal-ask"
                type="number"
                min={0}
                step={50000}
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                placeholder="Leave blank for unpriced / N/A"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Preliminary T12 Operating Inputs (Synthetic Intake)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="deal-occ" className="block text-xs font-medium text-slate-700 mb-1">
                  T12 Occupancy (%, Optional)
                </label>
                <input
                  id="deal-occ"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={occupancyPct}
                  onChange={(e) => setOccupancyPct(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="deal-adr" className="block text-xs font-medium text-slate-700 mb-1">
                  T12 ADR ($, Optional)
                </label>
                <input
                  id="deal-adr"
                  type="number"
                  min={0}
                  step={1}
                  value={adr}
                  onChange={(e) => setAdr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="deal-fb" className="block text-xs font-medium text-slate-700 mb-1">
                  F&amp;B &amp; Other Revenue ($)
                </label>
                <input
                  id="deal-fb"
                  type="number"
                  min={0}
                  step={25000}
                  value={fbAndOtherRevenue}
                  onChange={(e) => setFbAndOtherRevenue(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="deal-pip" className="block text-xs font-medium text-slate-700 mb-1">
                  Preliminary PIP Allowance ($)
                </label>
                <input
                  id="deal-pip"
                  type="number"
                  min={0}
                  step={100000}
                  value={estimatedPip}
                  onChange={(e) => setEstimatedPip(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded bg-white text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="deal-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Investment &amp; Diligence Notes
            </label>
            <textarea
              id="deal-notes"
              rows={3}
              value={investmentNotes}
              onChange={(e) => setInvestmentNotes(e.target.value)}
              placeholder="Summarize acquisition angle, flag expiration, or key diligence priorities..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded"
            >
              Create Synthetic Deal ({`SYN-${String(nextIndex).padStart(3, '0')}`})
            </button>
          </div>
        </form>

        {/* Live Deterministic Intake Preview */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Deterministic Intake Calculation Preview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated live using standardized 31% departmental, 26% undistributed, and 4% FF&amp;E assumptions.
            </p>
          </div>

          {livePreview ? (
            <dl className="divide-y divide-slate-100 text-sm tabular-nums">
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Assigned Deal ID</dt>
                <dd className="font-mono font-semibold text-slate-900">{livePreview.deal.id}</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Asking Price / Key</dt>
                <dd className="font-mono text-slate-900">
                  {formatCurrency(livePreview.summary.pricePerKey)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Indicative RevPAR</dt>
                <dd className="font-mono text-slate-900">
                  {formatCurrencyExact(livePreview.summary.t12?.revPAR)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Est. T12 Total Revenue</dt>
                <dd className="font-mono text-slate-900">
                  {formatCurrency(livePreview.summary.t12?.totalRevenue)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Est. USALI NOI (Margin)</dt>
                <dd
                  className={`font-mono font-medium ${
                    livePreview.summary.t12?.noi !== null &&
                    livePreview.summary.t12.noi < 0
                      ? 'text-red-700'
                      : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(livePreview.summary.t12?.noi)} (
                  {formatPercent(livePreview.summary.t12?.noiMarginPct)})
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Indicative Cap Rate</dt>
                <dd className="font-mono font-semibold text-slate-900">
                  {formatCapRate(
                    livePreview.summary.indicativeCapRatePct,
                    livePreview.summary.t12?.noi
                  )}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-600">Initial Governance Gate</dt>
                <dd className="font-mono text-xs font-semibold text-red-800">
                  FINAL MAO WITHHELD (UNVERIFIED)
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-sm text-slate-500">Enter valid room count to preview metrics.</div>
          )}
        </div>
      </div>
    </div>
  );
};
