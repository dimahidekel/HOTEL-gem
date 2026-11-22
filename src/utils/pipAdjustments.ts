import type { HotelDeal, PipCapexItem } from '../types/underwriting';

/**
 * Preserve the source-scoped PIP estimates when a DEMO user edits the aggregate.
 * The resulting signed reconciliation entry is explicitly unverified; it must
 * never be mistaken for a new vendor quote or an approved capital schedule.
 */
export function applySyntheticPipTotalAdjustment(deal: HotelDeal, requestedTotal: number): HotelDeal {
  if (!Number.isFinite(requestedTotal) || requestedTotal < 0) {
    throw new Error('INVALID_PIP_TOTAL');
  }
  const adjusted = structuredClone(deal);
  const adjustmentId = `PIP-USER-ADJUSTMENT-${deal.id}`;
  const originalItems = adjusted.pipItems.filter((item) => item.id !== adjustmentId);
  const originalTotal = originalItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  const delta = Math.round(requestedTotal) - originalTotal;

  if (delta !== 0) {
    const reconciliationItem: PipCapexItem = {
      id: adjustmentId,
      category: 'UNVERIFIED USER AGGREGATE PIP ADJUSTMENT',
      scopeDescription: 'Signed adjustment to the displayed aggregate only. Source-scoped estimates are unchanged; timing and third-party verification remain unresolved.',
      estimatedCost: delta,
      timing: 'Unscheduled / Unverified',
      quoteBasis: 'Sponsor Estimate',
    };
    originalItems.push(reconciliationItem);
  }
  adjusted.pipItems = originalItems;
  return adjusted;
}
