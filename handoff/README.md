# HOTEL WORK handoff desk

An isolated, browser-local interface for the existing HOTEL WORK process in ChatGPT. It contains no underwriting engine, model client, Drive credentials or copied policy. The existing AI Studio application and its commands remain unchanged.

Run from the repository root with Node 22 or later:

```sh
node handoff/serve.mjs
```

Open http://127.0.0.1:4178. Create/select a deal, add original PDF/XLSX/DOCX/ZIP files or text, and choose ES or Full IC. Download the request bundle and attach it in your HOTEL WORK chat with the displayed prompt. The user must send the request and complete any required checkpoints there. Opening ChatGPT alone sends nothing.

Each numbered package includes original bytes with SHA-256 identities, original filenames mapped to safe archive paths, exact pasted text, a frozen request ID and instructions to resolve the current Master. Hashes establish byte identity, not source truth. ZIPs remain opaque; the desk never extracts archives or executes macros. If the receiving ChatGPT surface cannot open the ZIP, unpack it locally and attach START_HERE.txt, transfer.json and the original sources.

The executing ChatGPT workflow must save authoritative sources/state/artifacts in the correct Drive folder, perform current release preflight and actual QA, and return the required deliverables. The desk does not enforce those remote actions. Full IC requires a matching PDF and live-formula XLSX under the current contract; the desk previews only a manually returned PDF. Attachment never means QA passed or investment approved. Native PDF preview depends on the browser; download is the fallback.

State, source files and returned PDFs use IndexedDB in this browser profile. They survive reload but are not synchronized or encrypted by this app. Browser clearing, private-mode restrictions, quota and eviction can remove data. Keep the downloaded bundle and canonical Drive records. Do not use a shared browser profile for confidential deals. There is no user/tenant authentication; this is a personal handoff utility, not a hosted deal database. No live Drive upload, extraction, progress polling, automatic artifact return or remote execution is implemented.

Build/test without installing the legacy app's dependencies:

```sh
node --test tests/handoff.test.mjs
node handoff/build.mjs
```

The four files in `handoff/dist` are suitable static assets for a future Sites deployment. No Site has been registered, no hosting manifest with a fabricated project ID is supplied, and nothing is deployed. On explicit deployment authorization, register a private Site and set its returned project ID and static directory using the Sites workflow. Do not deploy the legacy Express server as a Cloudflare Worker unchanged.

The local preview server exposes only the four site assets and binds to loopback. It does not expose the repository, test fixtures, policy or credentials. The page has no analytics, external dependencies or network data API; CSP blocks script fetches to remote services.

See [architecture audit](../docs/ARCHITECTURE_AUDIT.md) and [verification results](../docs/VERIFICATION.md).

## Multipart transfer update

The current interface retains the original navy sidebar and teal controls with a simplified deal workspace. Source intake supports PDF, legacy/current Word, Excel (including XLSM preserved without macro execution), PowerPoint, text/CSV/RTF, OpenDocument and ZIP. Limits are 500 files, 100 MiB/file and 2 GiB/deal, subject to browser quota. Exports use independently downloadable numbered ZIP packages, at most 100 MiB of source payload each plus metadata (110 MiB hard archive cap). Each package carries the complete transfer.json inventory, frozen request, original filenames, safe archive paths, sizes and SHA-256. All packages must be collected and verified before claiming complete analysis. Files remain intact. Files above 100 MiB use the canonical Drive folder route; receiving ChatGPT upload limits are separate and unverified. No automatic transmission takes place.
