# Sites ↔ ChatGPT Work: subscription-only verification

Date: 2026-11-25. Repository branch: codex/thin-chatgpt-handoff. Supersedes the earlier recommendation to accept the assisted handoff as the requested solution.

## Verdict

**NO — a supported, fully automatic Sites button → existing HOTEL WORK ChatGPT Work execution → PDF returned to Sites has not been established in this environment under the zero separate model API billing constraint.** This is a current capability/access verdict, not proof that every possible future or approved integration is impossible. The published handoff is not the requested product. No successful full-round-trip POC exists. Stop implementation of the automatic integration until its missing execution and artifact-return contract is available.

## Executed environment evidence

On the existing private hosted Site, created the browser-local synthetic deal `SYNTHETIC CAPABILITY CHECK — 2026-11-25`, selected the synthetic.pdf test fixture and added synthetic text. Clicked Generate ES. Observed request ID `856cd3be-f8ae-4254-9652-238e198ab206`, status `Request prepared · Awaiting your submission in ChatGPT`, and explicit instructions to download and submit manually. No produced PDF or workflow execution was observed. This is a failed primary acceptance test, not a successful automatic POC.

Browser WebMCP discovery returned `No WebMCP tools are available in this document.` Native Sites get_site(include_mcp_connection=true) returned INVALID_ARGUMENT: `The published Site does not declare an MCP server. Enable MCP and republish it.` These establish current publication state only; adding an MCP server would provide agent-callable site operations, not prove website-triggered inference.

Existing eight Node transfer/integrity tests reran: 8 PASS. Earlier 15 legacy tests and independent large ZIP/hash verification remain scoped prior results. No separate inference API call or Workspace Agent trigger was sent. No production source/deployment, Master, Manifest or template was changed by this verification. Synthetic browser state is not corporate deal data. Screenshot kept in ignored .qa_tools/hosted-capability-blocker.jpg.

## Capability matrix

| Requirement | Official support | Actual observation / boundary |
|---|---|---|
| Upload PDF/XLSX/DOCX and text | Ordinary browser file intake; Sites supports file storage | Hosted synthetic PDF and text accepted; files stay in IndexedDB. Other file formats were covered by local validation tests, not fresh hosted round trips. |
| Store files for Work | Sites R2 plus metadata and an authorized MCP/connector path are supported building blocks | Current Site has no R2/D1/MCP; IndexedDB is not independently accessible to a remote agent. Shared storage/access path is unimplemented. |
| Button launches existing Work using subscription | No generally available Sites-to-existing-Work trigger contract found in inspected official docs or exposed runtime tools | Failed acceptance above. Static hosting and identity do not confer inference access. |
| Supply active Master from Drive | Authorized connected-app reads are supported in eligible server-backed Sites and Work | Earlier direct assistant reads worked. That does not prove access from the Site's future executor. Static Site currently only embeds a Master link in a prompt. |
| Return PDF to app | Storage and browser display/download are supported | Earlier manually attached PDF download was byte-identical; IAB native preview blank. Automatic production/return of a HOTEL WORK PDF not executed. |

## Official mechanisms and exact limits

1. [Sites data and connections](https://learn.chatgpt.com/docs/sites/data-and-connections): R2/D1 and visitor-connected apps can supply data plumbing. These capabilities do not document launching ChatGPT inference from a Site. [WebMCP](https://learn.chatgpt.com/docs/webmcp) is agent-to-page access in a supported built-in browser, initiated from user-directed Work/Codex. It is not a reverse trigger API.
2. [ChatGPT plan usage](https://developers.openai.com/siwc/token-sharing-open-source): eligible open-source/local clients can request subscription-funded Responses permission. This does not import ChatGPT conversations/account context. The documented remotely hosted/paid route requires a separate application; no approval or scoped OAuth grant was observed here. Public repository visibility alone is not such a grant.
3. [Plan usage preview limits](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations): hosted connectors/MCP, Code Interpreter and persistent HTTP conversation continuation are not provided. A local app-server can execute local/custom tools, so a local subscription-funded runner is a possible architecture to investigate, not a demonstrated HOTEL WORK runtime. No credentials were borrowed from Codex, no localhost bridge exposed and no implementation was built speculatively.
4. [Workspace Agent triggers](https://learn.chatgpt.com/workspace-agents/trigger-runs): a published channel and scoped token can queue a run and expose status, but response retrieval is not currently available through that API. Its billing/entitlement is not verified for this account and it is excluded by the current instruction. It is not a proven free replacement and was not tested by triggering a run.

## Smallest supported alternatives (not substitutes for acceptance)

- **Existing Work conversation + authorized Drive**: run HOTEL WORK directly under the subscription. A Site-hosted MCP can later expose source intake and artifact storage to that user-directed agent. This requires a Work request and is explicitly not the automatic website-button workflow. Do not build this as though the requirement were met.
- **Local/open-source subscription runner**: official SIWC + Codex app-server can support eligible inference and local tools. It would need explicit user OAuth consent, an actually available local execution host, Drive access, a secure connection from Sites, and a tested artifact-return path. It does not automatically inherit HOTEL WORK. Account eligibility, hosted integration approval if required, and full parity are unverified. It is a research candidate only, not a working POC or guaranteed zero incremental cost.

There is no validated smallest architecture satisfying all current constraints. Do not add storage, tunnel, model service or another engine before proving the missing execution route.

## Repository disposition

| Class | Components | Action |
|---|---|---|
| KEEP | Source hashes, original-byte multipart export, immutable request identity; synthetic tests | Retain as reusable intake/integrity primitives. They do not prove semantic extraction or automation. |
| ADAPT | Original navy/teal UI; source intake; Drive authorization; status and artifact display | Reuse only after a real executor/return contract is proven. Drive adapter is currently read-only; browser storage is origin-scoped. |
| REMOVE FROM ACTIVE AUTOMATIC PATH | src/utils/financials.ts, memoGenerator.ts, synthetic factory/render/QA path, unnecessary Gemini/Firebase/Express dependencies | Preserve legacy implementation/history as rollback. Do not use independent synthetic underwriting as canonical ChatGPT output. No physical deletion performed. |
| BLOCKED | Website-triggered existing Work, shared source access, current Master preflight in executor, canonical artifact return, parity QA | No supported end-to-end subscription-only path proved. |

Bounded economical subagent source review agreed with these boundaries; no remote inference claim was made. Existing README instructions requiring GEMINI_API_KEY are legacy, not evidence that model calls execute in the current handoff.

## Models and incremental cost

Runtime exposed choices: GPT-6.1 Terra, GPT-6.1 Sol, GPT-6.2 Sol/Astra and GPT-6 Astra, with low/medium/high/xhigh/max/ultra effort options. These are tool-exposed choices, not proof of every API/account grant. Current parent is GPT-6.1 Sol. Economical Terra handled bounded review; further delegation reported unavailable credits, so no repeated delegation or credit purchase was attempted.

Use Terra low/medium for bounded inspection/simple UI; Sol medium for integration if an authorized contract is available; Astra high only for an unresolved security/orchestration problem. No upgrade required to establish this blocker. Deterministic tests/hash checks need no extra model API.

[Current standard Codex credit rates](https://learn.chatgpt.com/docs/pricing), input/cached/output per million: Terra 25/1.25/125; 6.1/6.2 Sol 50/2.5/250; 6.2 Astra 200/10/1000. Actual included allowance is account-specific. Avoid purchased credits and speed premiums under this request.

[Sites hosting](https://learn.chatgpt.com/docs/sites/usage-and-cost) is distinct from inference: free through January 31, 2027 per current published plan; future storage/traffic can consume allowance or cause overage. R2/D1, tunnels, an always-on local/VM host, electricity, and subscription overages are potential incremental costs. None newly provisioned/approved here. No model billing or zero-cost entitlement was inferred from successful hosting.

## Exact next actions / stop condition

1. Keep the current PR as a prototype and evidence record, not a successful automatic product. Preserve the existing production Site and legacy app.
2. Before coding another integration, obtain an official supported execution interface available to this account, its subscription-only usage authorization, and a file/Drive/artifact return contract. No secret should be pasted in chat.
3. Only then execute one synthetic source → Generate ES → current-Master processing → actual PDF returned/displayed test, including source hash verification and real document QA. Expand to Full IC only after that passes.
4. Until then: **automatic POC NOT EXECUTED; primary acceptance FAIL/BLOCKED; financial/document/visual parity NOT VERIFIED.** Do not represent manual upload/download, an MCP installation, static tests or a generated lookalike PDF as proof.
