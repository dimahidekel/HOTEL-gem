# HOTEL WORK DEV - sanitized local implementation checkpoint

This folder is an extracted **synthetic** Google AI Studio Build export, not the production HOTEL WORK codebase. No Google Drive/production changes were made. No deployment was performed.

## Security boundary
- The original ZIP is preserved separately by the user. This working copy excludes `.aistudio`, temporary screenshots, and the Master policy document previously exposed in `public/assets/aistudio`.
- `firebase-applet-config.json` contains **placeholder values**. OAuth will not operate until an approved, environment-specific OAuth/Firebase configuration is supplied. Do not put access tokens or private Drive documents in public assets or Git.
- Existing `/api/factory/*` synthetic-deal and artifact endpoints remain **unauthenticated**. This app must **not** ingest real deals, production records, or private Drive content until user/deal RBAC and durable storage are implemented and independently checked.
- Preflight status is separate from report compliance: `MASTER_PREFLIGHT_ONLY` means Drive control-plane read passed, **not** PDF adherence. Never promote synthetic report outputs to `MASTER_VERIFIED` from preflight alone.
- Snapshot/artifact cache still uses `/tmp`, not permanent storage.

## First local verification
```sh
python -m unittest discover -s tests -v
npm install --ignore-scripts
npm run lint
npm run build
```
This environment could run the Python tests, but npm installation timed out; Node lint/build and full API smoke tests remain **NOT RUN**.

## Required authorization before Codex or deployment
Verify that the exported synthetic source may be transferred to the intended AI/coding environment and that no private/corporate policy material or secrets remain. This is a **sanitized derivative**, not a declaration of corporate approval.

## Next P0
1. Authenticate API and isolate artifacts per user/deal before any real data.
2. Verify latest live Master/Manifest dependencies read-only, then build requirement-to-code-to-PDF trace.
3. Implement canonical underwriting and PDF layout, verify every page and model calculation.
4. Simplify UI to three actions without losing analytics.
