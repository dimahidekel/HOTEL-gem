# HOTEL WORK architecture decision — 2026-11-25

## Decision

Choose A: a static handoff desk plus user-assisted execution in the existing HOTEL WORK ChatGPT workflow. This is the least expensive available way to preserve a single governing process. It achieves a usable intake/handoff interface, not automatic document parity. The user still submits the request in ChatGPT and returns the PDF manually. No paid model call, deployment, production change, Master/template edit or real-deal test was performed.

## Repository evidence

Audited `dimahidekel/HOTEL-gem` at `3ea12cf`; history contains that import and `2788e0d` (Stage 3 baseline). It is a public repository. Source, package manifest/lock, four test modules, authentication, financial functions, memo builders, renderers, snapshot/artifact stores and HTTP routes were inspected. There is no repository AGENTS.md or CI workflow in this checkout. Prior implementation reports are claims; current tests below are the evidence.

| Keep | Reason and boundary |
|---|---|
| Existing synthetic fixtures and regression tests | Useful arithmetic, PIP adjustment, snapshot and disclosure checks. They do not establish production readiness. |
| Snapshot/hash and artifact-integrity concepts | Reuse patterns for source identity and frozen requests; do not import financial snapshots into a handoff-only app. |
| Original React/Express app | Preserve as an isolated synthetic reference until replacement is accepted; no production/AI Studio edit. |
| Read-only Drive authorization design | OAuth access token held in JS memory; do not expand scopes simply to make intake appear functional. |

| Replace or exclude from the selected execution path | Evidence |
|---|---|
| Independent financial engine and memo authoring | `src/utils/financials.ts`, `src/data/memoGenerator.ts`: local formulas, prose and scenarios form a second implementation, not a ChatGPT delegate. Fixed 365-day room-night basis and heuristic break-even factors need contract-specific validation. |
| Local template resolver as proof of canonical compliance | `server/factory/masterResolver.ts`: template IDs are fixed; expected Master ID/version lookup misses the live manifest's `authority` nesting; digests are computed but not compared to published identities. Optional support-resource failures need not block. `MASTER_VERIFIED` is therefore too broad. |
| Server render pipeline as authoritative delivery | `pipeline.ts` renders even with blocked preflight; it labels synthetic output but does not execute the canonical ChatGPT process. No evidence extraction/OCR pipeline or native document-upload endpoint was found. |
| Self-generated XLSX values as independent reconciliation | `xlsxGenerator.ts` embeds JS-computed cached results, including missing-to-zero fallbacks; `artifactQa.ts` checks formulas and those caches with the same JS financial functions. External workbook recalculation and changed-input evidence are explicitly not run. |
| Local stores as Drive system of record | `snapshotStore.ts` / `artifactStore.ts` are local; intake registry is in process memory. Drive access is read-only. No prescribed Drive persistence is implemented. |
| Multi-user security assumptions | Factory routes/artifact lists have no server-side tenant authorization. Drive preflight status is module-global. Synthetic allowlisting is not a user-access boundary. Do not expose this server as a confidential multi-user service. |

Remove from a future handoff-only deployment: Gemini/Firebase/Express/document-generator dependencies and dashboard complexity. They are not removed from the preserved legacy package in this PR. `@google/genai` is declared but no model invocation/import was found in application source. There is consequently no measured Gemini inference expense to optimize; calling this a running Gemini underwriting service would be misleading. The new static entry point loads none of these dependencies.

## Governing documents

Authorized read-only connector reads observed current Master 2.6.5, Runtime Manifest 1.1.6, the registered ES/Full IC templates, methodology and execution contract. These versions describe this audit observation only; application code pins no release version. The Master alone governs execution. Private bodies, historical deal data and resource inventories are not copied into this public repository.

The live contract requires exact evidence provenance, UNKNOWN distinct from zero, explicit conflicts, immutable analysis identity, ten ES / nineteen Full IC sections, an unnumbered first-page Decision Screen, approved visual comparison and separate document/investment status. Full IC requires matched PDF + live-formula XLSX and observed recalculation/release QA. The registered finance candidate is not proof of host activation. Readable documents and a successful connector call do not prove published digest consistency or installed capability. This audit did not certify a release tuple or inspect real-deal benchmark content; approved visual parity remains unverified.

## Alternatives and total cost

| Option | Feasibility / development estimate* | Hosting/storage | Per ES / Full IC | Parity and maintenance |
|---|---|---|---|---|
| A. Static Sites + assisted handoff (selected) | Available; small implementation, 1–3 days to harden | Local: $0 incremental. Sites rates below. Existing Drive plan remains separate. | $0 additional model API spend from this app; ChatGPT plan usage and human transfer time remain | Same manual execution surface; actual paired output acceptance still needed. Lowest code/security burden. |
| B. Supported ChatGPT/Work integration | WebMCP/MCP can expose app operations to a user-directed agent. Plan-funded Responses is another supported but separate route; 1–3 weeks+ integration/acceptance estimate | Static for page tools; server/storage/auth for a durable MCP service | ChatGPT allowance/credits for native agent use; plan-inference eligibility must be confirmed | Neither sign-in nor plan inference imports existing chats, skills, Drive connectors or HOTEL WORK state automatically. |
| C. Minimal OpenAI API orchestration | Technically available; 2–6 weeks+ to validate extraction, Drive state, gates and renderer | Budget assumption $0–25/month small hosting plus storage; provider/region/retention not selected or quoted | Illustrative Sol ES $0.20; Full IC $0.60, below | Same policy can govern it, but prompts alone do not reproduce runtime/tools/QA. Highest parity-validation burden. |
| D. Reuse current app | Synthetic demonstrator works within tested limits; time for real ingestion/parity is unbounded until scoped | Existing hosting cost unknown; local demo $0 incremental | Current synthetic path $0 model calls; real report cost unknown | Reuse tested utilities only after compatibility checks; retain no competing methodology. |

*Engineering ranges are estimates, not quotes or measured work duration. Total cost includes human review and transfer. At volume, measure handoff minutes/report against integration cost; do not assume zero API spend means zero operating cost.

[Sites pricing](https://learn.chatgpt.com/docs/sites/usage-and-cost), checked 2026-11-25: hosting is free through January 31, 2027; planned overage billing starts February 1. Static site base is 0 credits/month; 100k requests about 15 credits. Storage-enabled site base is 25 credits, file storage 3.75/GiB-month and DB storage 150/GiB-month. Plus allowance 125, Pro 375, Business 125/seat. At 10k requests/month, this static desk models 1.5 hosting credits, excluding other Sites usage. No D1/R2 is needed. Account-specific dollar cost/allowance was not inspected. Do not assume perpetual free hosting.

[OpenAI standard API rates](https://developers.openai.com/api/docs/pricing): GPT-6.2 Sol $2 input / $0.10 cached input / $10 output per million tokens; Astra $8 / $0.40 / $40. Assumptions: ES 50k uncached input + 10k total output = $0.20 Sol / $0.80 Astra; Full IC 150k + 30k = $0.60 / $2.40. These are illustrative single-run model totals, not measured report prices. Tool fees, OCR, reasoning output, retries and long-context premiums can increase cost; all output/reasoning must be counted. Caching the 40k-token unchanged prefix of the ES example would save $0.076 on a cache hit before cache-write costs. Never cache across a changed policy/source identity. Extract once, pass relevant facts/exceptions, reuse unchanged calculations, and avoid model calls for deterministic QA.

[Sites connections](https://learn.chatgpt.com/docs/sites/data-and-connections) support connected apps; live eligibility discovery returned Google Drive allowed in this workspace. That is not proof of hosted visitor consent, write access or successful deployment. Static-only Sites cannot invoke connectors; a Worker-backed variant would add complexity. The current Express/fs server is not a drop-in Worker.

[Site tools](https://learn.chatgpt.com/docs/webmcp) allow a user-directed Work/Codex agent to act on an open page in a supported built-in browser. They do not provide unattended button-to-conversation execution. [ChatGPT plan usage](https://developers.openai.com/siwc/token-sharing-open-source) supports eligible local/open-source clients with user OAuth consent; paid/remotely hosted participation needs a separate application. [Preview limits](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) exclude hosted connectors/MCP, Code Interpreter and persistent HTTP conversation continuation. Rebuilding these around Responses would still be an orchestration implementation. No account grant or client registration was attempted.

## Codex model recommendation

This session's exposed model choices are GPT-6.2 Sol, GPT-6.2 Astra, GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra; each exposes low/medium/high/xhigh/max/ultra effort. This is runtime tool availability, not proof of every account/API entitlement. No automatic model switch or delegated model work was performed.

| Work | Recommendation |
|---|---|
| Bounded repository inventory, routine edits | GPT-6.1 Terra low/medium: cheapest exposed tier by current credits; use Sol for a difficult code path. |
| Architecture and integration implementation | GPT-6.2 Sol medium: best default value; comparable listed token price to 6.1 Sol. |
| Difficult authorization, release identity or parity defects | GPT-6.2 Astra high, only for a bounded unresolved problem. |
| Tests, hashing, builds and arithmetic | Deterministic tools; no additional model API. |

[Codex pricing](https://learn.chatgpt.com/docs/pricing) lists standard input/cached/output credits per million as Terra 25/1.25/125, Sol 50/2.5/250, Astra 200/10/1000. Effort has no fixed task-price multiplier: additional reasoning/output and retries determine actual usage. Avoid Fast/Ultrafast and high effort by default. Preserve completed work at any model checkpoint; no model change is required to finish this implementation. HOTEL WORK's own live stage-routing requirements remain separate from these coding recommendations.

## Acceptance boundary

The implementation is ready for review as an assisted handoff prototype. Full ChatGPT parity is **still blocked/unverified**, not achieved by the tests. Before claiming it, run paired synthetic ES/Full IC executions in the actual HOTEL WORK host against one verified current release; inspect every rendered page against the approved standard, independently recalculate the XLSX, reconcile both artifacts to sources/snapshot, and verify Drive readback. Do not activate an unverified finance candidate or label a caller-supplied QA flag as independent evidence. Deployment/merge remains a separate explicit user action.

Multipart implementation and verification: see VERIFICATION.md. Economical GPT-6.1 Terra subagent performed bounded source review and familiar-interface styling; root addressed its concrete findings. No model upgrade was required for this stage.
