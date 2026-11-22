import React, { useState } from 'react';
import { FilePlus2, Save, X } from 'lucide-react';
import { DocumentVerificationStatus, HotelDeal, SourceDocumentItem } from '../../types/underwriting';

interface UpdateDealEvidenceDrawerProps {
  deal: HotelDeal;
  onSaveDealUpdate: (updated: HotelDeal, summaryText: string) => void;
  onClose: () => void;
}

export const UpdateDealEvidenceDrawer: React.FC<UpdateDealEvidenceDrawerProps> = ({
  deal,
  onSaveDealUpdate,
  onClose,
}) => {
  const t12 = deal.historicalInputs[deal.historicalInputs.length - 1];
  const currentPipTotal = deal.pipItems.reduce((sum, p) => sum + p.estimatedCost, 0);

  const [askingPrice, setAskingPrice] = useState(
    deal.askingPrice !== null ? String(deal.askingPrice) : ''
  );
  const [occupancyPct, setOccupancyPct] = useState(
    t12?.occupancyPct !== null && t12?.occupancyPct !== undefined ? String(t12.occupancyPct) : ''
  );
  const [adr, setAdr] = useState(
    t12?.adr !== null && t12?.adr !== undefined ? String(t12.adr) : ''
  );
  const [fbRevenue, setFbRevenue] = useState(String(t12?.fbRevenue ?? 0));
  const [otherRevenue, setOtherRevenue] = useState(String(t12?.otherRevenue ?? 0));
  const [estimatedPip, setEstimatedPip] = useState(String(currentPipTotal));
  const [investmentNotes, setInvestmentNotes] = useState(deal.investmentNotes);

  // Optional new evidence source entry
  const [evTitle, setEvTitle] = useState('');
  const [evCategory, setEvCategory] = useState<SourceDocumentItem['category']>('Financials');
  const [evPeriod, setEvPeriod] = useState('Current Diligence');
  const [evProvider, setEvProvider] = useState('Seller / Third-Party Submission');
  const [evStatus, setEvStatus] = useState<DocumentVerificationStatus>('Received — Unverified');
  const [evNotes, setEvNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAsk = askingPrice.trim() === '' ? null : Number(askingPrice);
    const parsedOcc = occupancyPct.trim() === '' ? null : Number(occupancyPct);
    const parsedAdr = adr.trim() === '' ? null : Number(adr);
    const parsedFb = fbRevenue.trim() === '' ? 0 : Number(fbRevenue);
    const parsedOther = otherRevenue.trim() === '' ? 0 : Number(otherRevenue);
    const parsedPip = estimatedPip.trim() === '' ? 0 : Number(estimatedPip);

    if (parsedAsk !== null && (!Number.isFinite(parsedAsk) || parsedAsk <= 0)) {
      setError('Asking Price must be greater than $0 (or blank if unpriced).');
      return;
    }
    if (parsedOcc !== null && (!Number.isFinite(parsedOcc) || parsedOcc < 0 || parsedOcc > 100)) {
      setError('T12 Occupancy must be between 0% and 100%.');
      return;
    }
    if (parsedAdr !== null && (!Number.isFinite(parsedAdr) || parsedAdr <= 0)) {
      setError('T12 ADR must be greater than $0.');
      return;
    }
    if (!Number.isFinite(parsedFb) || parsedFb < 0 || !Number.isFinite(parsedOther) || parsedOther < 0) {
      setError('F&B and Other Revenue must be zero or positive.');
      return;
    }
    if (!Number.isFinite(parsedPip) || parsedPip < 0) {
      setError('Estimated PIP must be zero or positive.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        askingPrice: parsedAsk,
        occupancyPct: parsedOcc,
        adr: parsedAdr,
        fbRevenue: parsedFb,
        otherRevenue: parsedOther,
        estimatedPip: parsedPip,
        investmentNotes: investmentNotes.trim(),
      };

      if (evTitle.trim()) {
        payload.newEvidence = {
          title: evTitle.trim(),
          category: evCategory,
          periodCovered: evPeriod.trim() || 'Current Diligence',
          provider: evProvider.trim() || 'Session Input',
          status: evStatus,
          notes: evNotes.trim(),
        };
      }

      const res = await fetch(`/api/factory/synthetic-deals/${encodeURIComponent(deal.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as HotelDeal & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update deal inputs.');
      }

      const changeSummary = evTitle.trim()
        ? `Updated inputs and logged evidence "${evTitle.trim()}" (${evStatus}). Ready to regenerate PDF.`
        : 'Updated underwriting inputs / diligence notes. Ready to regenerate PDF.';
      onSaveDealUpdate(json, changeSummary);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save deal updates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-300 rounded-md p-5 space-y-5 shadow-xs"
      noValidate
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Step 1 — Add / Update Deal Data &amp; Evidence ({deal.id})
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Saving changes updates the allowlisted deal state so you can regenerate a new versioned ES PDF or Full IC PDF while preserving prior snapshots.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close update panel"
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-900 px-3.5 py-2.5 rounded text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="upd-ask" className="block text-xs font-medium text-slate-700 mb-1">
            Asking Price ($)
          </label>
          <input
            id="upd-ask"
            type="number"
            min={0}
            step={50000}
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            placeholder="Blank = Unpriced"
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="upd-occ" className="block text-xs font-medium text-slate-700 mb-1">
            T12 Occupancy (%)
          </label>
          <input
            id="upd-occ"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={occupancyPct}
            onChange={(e) => setOccupancyPct(e.target.value)}
            placeholder="Blank = Unknown"
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="upd-adr" className="block text-xs font-medium text-slate-700 mb-1">
            T12 ADR ($)
          </label>
          <input
            id="upd-adr"
            type="number"
            min={0}
            step={0.5}
            value={adr}
            onChange={(e) => setAdr(e.target.value)}
            placeholder="Blank = Unknown"
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="upd-fb" className="block text-xs font-medium text-slate-700 mb-1">
            T12 F&amp;B Revenue ($)
          </label>
          <input
            id="upd-fb"
            type="number"
            min={0}
            step={10000}
            value={fbRevenue}
            onChange={(e) => setFbRevenue(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="upd-other" className="block text-xs font-medium text-slate-700 mb-1">
            T12 Other Revenue ($)
          </label>
          <input
            id="upd-other"
            type="number"
            min={0}
            step={10000}
            value={otherRevenue}
            onChange={(e) => setOtherRevenue(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
          />
        </div>
        <div>
          <label htmlFor="upd-pip" className="block text-xs font-medium text-slate-700 mb-1">
            Total PIP Allowance ($)
          </label>
          <input
            id="upd-pip"
            type="number"
            min={0}
            step={50000}
            value={estimatedPip}
            onChange={(e) => setEstimatedPip(e.target.value)}
            className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white text-slate-900"
          />
        </div>
      </div>

      <div>
        <label htmlFor="upd-notes" className="block text-xs font-medium text-slate-700 mb-1">
          Investment &amp; Diligence Notes
        </label>
        <textarea
          id="upd-notes"
          rows={2}
          value={investmentNotes}
          onChange={(e) => setInvestmentNotes(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
        />
      </div>

      {/* Add Evidence Entry to Source Register */}
      <div className="pt-3 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <FilePlus2 className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
          <span>Append New Evidence Item to Source Register (Optional)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="ev-title" className="block text-[11px] text-slate-600 mb-1">
              Source Title
            </label>
            <input
              id="ev-title"
              type="text"
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="e.g., Phase I ESA Groundwater Addendum or Revised T12 P&L"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="ev-cat" className="block text-[11px] text-slate-600 mb-1">
              Category
            </label>
            <select
              id="ev-cat"
              value={evCategory}
              onChange={(e) => setEvCategory(e.target.value as SourceDocumentItem['category'])}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
            >
              <option value="Financials">Financials</option>
              <option value="Franchise / Brand">Franchise / Brand</option>
              <option value="Physical / Engineering">Physical / Engineering</option>
              <option value="Environmental / Legal">Environmental / Legal</option>
              <option value="Market / STR">Market / STR</option>
            </select>
          </div>
          <div>
            <label htmlFor="ev-status" className="block text-[11px] text-slate-600 mb-1">
              Verification Status
            </label>
            <select
              id="ev-status"
              value={evStatus}
              onChange={(e) => setEvStatus(e.target.value as DocumentVerificationStatus)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
            >
              <option value="Received — Unverified">Received — Unverified</option>
              <option value="Pending Third-Party">Pending Third-Party</option>
              <option value="Conflicted">Conflicted</option>
              <option value="Missing">Missing</option>
            </select>
          </div>
          <div>
            <label htmlFor="ev-period" className="block text-[11px] text-slate-600 mb-1">
              Period / As-Of
            </label>
            <input
              id="ev-period"
              type="text"
              value={evPeriod}
              onChange={(e) => setEvPeriod(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="ev-provider" className="block text-[11px] text-slate-600 mb-1">
              Source Provider
            </label>
            <input
              id="ev-provider"
              type="text"
              value={evProvider}
              onChange={(e) => setEvProvider(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ev-notes" className="block text-[11px] text-slate-600 mb-1">
              Diligence Note / Impact
            </label>
            <input
              id="ev-notes"
              type="text"
              value={evNotes}
              onChange={(e) => setEvNotes(e.target.value)}
              placeholder="Summary of newly received evidence or discrepancy..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#0F294A] hover:bg-[#173964] rounded disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isSaving ? 'Saving...' : 'Save Data & Evidence'}</span>
        </button>
      </div>
    </form>
  );
};
