# HOTEL WORK DEV — Stage 3 verified local checkpoint

Date: 2026-11-22. Scope: local synthetic project, **no external deployment, no Drive writes**.

## Actual changes

1. Fixed the `PUT /api/factory/synthetic-deals/:dealId` aggregate PIP edit path. Previous behavior silently modified the first scoped vendor/engineering quote, and could fail to match the requested total when the reduction exceeded that first line. The new pure `applySyntheticPipTotalAdjustment` preserves all source-scoped items verbatim and adds or replaces a **signed, UNVERIFIED user aggregate reconciliation line** with unscheduled timing. It is never represented as verified third-party capex.
2. API rejects negative, nonnumeric or nonfinite aggregate PIP inputs; repeated updates replace (rather than accumulate) the signed adjustment. Aggregate PIP and computed investment basis follow the requested total.
3. Stage A artifact QA now **rejects a claimed `MASTER_VERIFIED` report compliance status**. Master preflight access cannot certify the memo. The pipeline can no longer assign `MASTER_VERIFIED_QA_PASSED` from Stage A rendering.
4. Added genuine Node runtime tests (TypeScript compiled to isolated CommonJS) covering SYN-001 revenue and NOI, negative-NOI guardrail SYN-003, missing operating inputs, projection base case, and multiple PIP update/mutation cases.

## Verification performed

- `python -m unittest discover -s tests -p 'test_stage*.py' -q`: **15/15 PASS**. Thirteen source guard tests and two Node-backed financial/runtime tests.
- `tsc` compiled `financials.ts`, `pipAdjustments.ts`, `syntheticDeals.ts` and the required types into a disposable isolated test directory; running emitted code under Node **PASS**.
- TypeScript syntax transpilation checks for changed backend/API modules: **5/5 PASS**. This is not a full project typecheck.
- `npm install --offline`: **BLOCKED** (`ENOTCACHED @google/genai`); full Vite build, complete Express API E2E, real generated PDFs and Excel workbook recalculation **NOT RUN**.
- No Master, Manifest, templates, existing hotel data, Google AI Studio preview or production deployment modified.

## Evidence-bound limitations

- The live Master and Runtime Manifest have been read via the authorized Drive connector in this conversation; this local patch does not copy private Master text into the website. A full revision-guarded dependency preflight and exact visual/financial template parity review remain outstanding.
- Signed PIP adjustment can be negative to reconcile a lower user-entered total; it is an explicit **unverified reconciliation entry**, not a vendor quote, approved PIP schedule or source-backed reduction. Real underwriting must reconcile/verify the actual scoped estimates before any final price decision.
- Static Stage A synthetic data and public demo APIs remain unauthorized for any real property/document ingestion. No external authentication, durable persistence or production release is claimed.
- The existing Google Drive project's old pipeline file still describes a historical 13-section ES, which conflicts with the current sole canonical Master 10-section ES; the active Master takes precedence. No governance documents were edited.

## Next execution gates

1. In an authorized environment with available npm dependencies, run `npm install`, `npm run lint`, `npm run build` and the runtime API report generation flow.
2. Generate current ES/IC PDFs and internal XLSX; recalculate the workbook in LibreOffice; compare financial results and visually render every PDF page against the approved Detroit UX v3 benchmark.
3. Enforce authenticated per-user API access and durable storage before any real documents or deployment.
4. Only after complete Master-registered content, financial and visual QA, permit actual Master-compliance status. Until then: NOT MASTER VERIFIED.
