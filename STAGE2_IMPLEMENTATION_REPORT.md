# HOTEL WORK DEV — Stage 2 local implementation checkpoint

Date: 2026-11-22. Scope: **offline synthetic development copy**, no publication or production access.

## Implemented

1. Added `Scenario_Model` to the **internal** Full IC XLSX (`server/factory/xlsxGenerator.ts`): named Downside / Base Case / Stabilized cases, explicit assumption drivers, editable operating assumptions, live formulas from occupancy and ADR through revenue, departmental / undistributed expenses, GOP, management/franchise fees, tax/insurance, FF&E, post-FF&E NOI, indicative gross value and net residual. All net residual values are explicitly **NOT MAO**. Scenarios are synthetic assumptions, **not** dated multi-year financial projections.
2. Extended `server/factory/artifactQa.ts` to require the scenario sheet and independently recompute three scenario NOI/net residual pairs with `computeScenarioProjection`. `XLSX-02` fails when the cached values disagree; QA clearly states actual Excel/LibreOffice recalculation is **NOT VERIFIED**.
3. Corrected `src/components/workspace/DocumentFactoryPanel.tsx`: a successful read-only Master preflight no longer causes the UI to say that Master is unavailable, nor to call the PDF compliant. The distinction between live-policy accessibility and report-level compliance is explicit.
4. Added `tests/test_stage2_contracts.py` (3 regression source tests), preserving previous Stage 0 and 1 tests.

## Local verification

- Python offline source/guardrail tests: **12 / 12 PASS**.
- TypeScript transpilation/syntax-only validation: **36 TS/TSX files; 0 diagnostics**. This is **NOT** a complete TypeScript typecheck.
- Full npm dependency install/build, backend process, API E2E, Excel/LibreOffice formula recalculation, real PDF visual QA: **NOT RUN** (dependencies unavailable in this container).
- Current live Google Drive Master v2.6.5 and Runtime Manifest v1.1.6 have been read through the authorized connector in the conversation, **read-only**. No control-plane files or private source text were included in the artifact ZIP. Current native revisions and the full resource chain were not independently resolved in this Stage 2 patch.

## Outstanding P0 work

- External Excel/LibreOffice recalc + changed-input mutation tests across `Scenario_Model`, historical operating model, and PDF values.
- Full institutional depth: dated 3-case forecasts, lender terms and DSCR, downside/PIP phasing, return cash flows, IRR/MOIC, exit sensitivity and capital stack where supported by evidence. Unavailable inputs must remain visibly missing, never fabricated.
- Full template/methodology/Detroit UX v3 parity against the current Drive versions; all document artifacts remain **NOT_MASTER_VERIFIED**.
- Strict API authorization and per-user isolation before any real hotel evidence or private Master material is ingested. Existing demo-only APIs and `/tmp` persistence are not production-ready.
- Full production build/release and authenticated secure hosting.

## Safety & preservation

- Original AI Studio Preview, production SaaS, Google Drive Master, Manifest, templates and real hotel evidence: **not modified**.
- This is an incremental checkpoint for authorized continuation, not a verified working SaaS release.
