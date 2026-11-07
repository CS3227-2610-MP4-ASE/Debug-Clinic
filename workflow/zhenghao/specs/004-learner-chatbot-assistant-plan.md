# ZH-CHAT-01 — Proposed learner assistant plan

Date: 7 November 2026, Asia/Singapore.
Status: independently reviewed; delegated owner package approval and implementation authorization verified.
Baseline: `2c372c5a9af9fafddf950e446121e475687ab29a`.
Branch: `zh/learner-chatbot-assistant`.
Decision provenance: the three structured owner-answer rounds recorded in
`003-learner-chatbot-assistant-discovery.md`. This is a Developer 1-safe plan;
Developer 2 SDD content was excluded. The owner's five-stage workflow governs
this feature; no Royden artifacts or canonical monitoring schema are rewritten.

## Scope and authority

One exercise-aware English/Python coaching assistant replaces the unavailable
hint experience. It generates guidance from learner-visible published question
content and explicitly shared snapshots, without requiring instructor hint rows.
No instructor-private solution/explanation, hidden tests, cross-user history,
external retrieval, tool execution, code application, or automatic save/submit.

The owner settled product choices and delegated planning approval to side chat
`01a1b442-630f-7012-b4b8-eef108dad47f`. Its approval separately authorizes
implementation after independent blockers are resolved; that condition is now
satisfied by the review recorded in the planning-review artifact. Retain the original instruction's
authorization for concern-separated commits and a feature-branch push for PR
creation after all stages finish. Merge and deployment are outside that authority.
Live-provider calls remain separately authorized work.

## Requirements and acceptance

| ID | Required outcome | Observable acceptance |
| --- | --- | --- |
| CHAT-01 | One assistant, owned by learner/published version | Learners cannot read/mutate others' chats; instructors and anonymous callers are denied; inaccessible versions trigger no provider call. |
| CHAT-02 | Three controlled coaching levels | Start at level 1. MESSAGE stays at current level; NEXT_HINT targets the next level only after an existing successful reply. Persist minimal successful-level eligibility across clear/expiry. Only successful validated and persisted replies advance. At level 3 ordinary messages continue; NEXT_HINT is unavailable/no-call. |
| CHAT-03 | Educational disclosure policy | Level 1 asks guiding questions; level 2 can diagnose the bug/reasoning; level 3 can give analogous examples/partial guidance. No complete correction, including an exact one-line replacement that solves a tiny exercise. Validate semantically across a conversation, not just per message. |
| CHAT-04 | Transparent context | Each send captures the current code only when Share current code is enabled. Optional reasoning and execution output have separate unchecked controls. Scratch tests/stdin are excluded. UI previews which categories are shared; replies carry their context identity. |
| CHAT-05 | Revision-aware replies | Edits during a call do not overwrite code or relabel older advice. History marks earlier snapshots. Changing users/disposal prevents stale replies appearing. Sending chat does not create/save/finalize an Attempt. |
| CHAT-06 | Private persistent history | One conversation per learner/version survives edits, refresh, and navigation; instructors have no chat-read endpoint. Read-only after final submission. Publication removal blocks further access and calls. |
| CHAT-07 | Clear and expiry | Clear deletes messages/snapshots/draft on confirmation and cancels eligibility of older pending responses; unlocked stage and minimal counters remain. Content expires after 30 days without an accepted learner message. Expired content never reaches reads/prompts; scheduled purge deletes physical content within one hour of expiry. |
| CHAT-08 | Consistent mutations | Duplicate request IDs reconcile without additional calls; reuse with changed payload conflicts. Concurrent messages, clear, progression, and final submission cannot produce duplicate or resurrected content. |
| CHAT-09 | Bounded provider use | Configurable 10 accepted generations/10 minutes and 100/day per learner across all exercises; MESSAGE and NEXT_HINT share limits. Failures consume a reservation, duplicate retries do not. Limits survive serverless instances. Safe retry-after feedback. |
| CHAT-10 | Floating accessible UI | Launcher opens by click/keyboard; pointer drag does not click; position stays reachable after resize/zoom; keyboard move/reset works. Minimize preserves draft/history/pending state and restores focus. No launcher interaction calls the model. |
| CHAT-11 | Learner workspace remains usable | Question/editor/Run/Test/Save/Submit stay reachable, including mobile keyboard, long chat/code, and final read-only state. No horizontal page clipping at 320px; desktop modeless, mobile accessible sheet. |
| CHAT-12 | Provider robustness | Backend-only configured SoCLaaS transport; fake tests; bounded envelope/content, deadline/retries, output validation, explicit unavailability, and nullable missing usage. Malformed or failed calls never become a successful coaching step. |
| CHAT-13 | AI security | OWASP-mapped independent review with adversarial and benign cases. Server authorization and context exclusion hold independently of model refusal behavior; unsafe content does not become active markup or external resource loads. |
| CHAT-14 | Honest evidence and guides | Stage telemetry, independent verdicts, exact check results, DG/UG changes and incremental Reflection-ZhengHao entries. Distinguish fake transport, real PG/browser, live AI, CI and deployment evidence. |

## UX brief — Impeccable shape, proposed for confirmation

Operate-mode extension of the current MUI/light workspace; preserve DESIGN.md.
Do not introduce a concept tournament, generated mockup dependency, or new brand.

- Collapsed: 48px accessible assistant button near lower-right with safe margins;
  pointer dragging and keyboard move/reset keep it out of exercise controls.
  Persist normalized position only, never chat content or credentials.
- Expanded desktop: a viewport-bounded modeless panel, approximately 360–420px
  wide, with title, level indicator and Minimize. Message log scrolls separately;
  sharing controls, composer, Send, Next hint and Clear remain reachable.
- Expanded mobile: viewport-bounded dialog sheet with proper focus trap/return
  and keyboard-aware available height. Desktop must not trap editor focus.
- Share current code is visible and enabled by default with a concise explanation;
  a learner may turn it off to send message-only context. Reasoning/output are
  explicitly opt-in and reset after sends/navigation; never include hidden data.
- Render plain text and inert preformatted snippets initially. No raw HTML,
  external images, auto-open URLs, streaming, or automatic code execution.
- Pending responses survive minimizing; no model call until Send/Next hint.
  Snapshot labels and a read-only notice explain state without implementation jargon.
- Clear confirms the content deletion while explicitly explaining that coaching
  level remains. Clear is available after final submission as a privacy action;
  final read-only applies to new advice, not deletion/expiry.
- Impeccable implementation reads craft-floor immediately before UI edits;
  bounded desktop/mobile inspection, detector and fresh finish review occur
  inside the existing implementation/testing stages. Documentation uses the
  existing documentation stage. No additional user-facing stage conversations.

## Domain and storage design

Add dedicated conversation/message/request records; do not overload the
exercise's instructor hints or mutate an Attempt merely to chat.

- Conversation: unique `(learnerId, exerciseVersionId)`, unlocked level 1–3,
  revision, content generation, successful-level eligibility, last accepted-message
  activity/expiry, and timestamps. Eligibility survives deletion without preserving text.
- Message: conversation, ordered sequence, user/assistant role, bounded text,
  level, paired request ID, context digest and explicitly shared content snapshots.
  Snapshot content is private conversation content subject to the same deletion.
- Generation request: conversation/learner, unique client request ID, payload
  digest, expected revision/content generation, target level, lease/deadline,
  pending/succeeded/failed/cancelled state. Minimal tombstones support safe
  reconciliation; clear/expiry remove content and pending payloads, not just UI rows.
- Usage reservations: per-learner durable sliding-window/day accounting;
  provider usage/correlation metadata has no raw content. Counters/tombstones
  expire when no longer needed for quotas/reconciliation. Keep a documented
  maximum 30-day tombstone retention; daily/window counters need shorter retention.
- A scheduled cleanup job enforces deletion without waiting for a learner visit.
  Reads/prompts also enforce expiry. Cleanup is idempotent and uses an explicit
  verified deployment database configuration; tests use disposable loopback PG.

## API and mutation protocol

Proposed protected base: `/api/v1/learner/questions/:id/assistant`.

- GET base: canonical version, unlocked level, conversation revision, final/read-only
  state, bounded message page and expiry metadata. Absent chat reads are side-effect-free.
- POST `/messages`: strict `requestId`, `expectedRevision`, MESSAGE/NEXT_HINT,
  `expectedExerciseVersionId`, bounded learner text and optional shared-code/reasoning/output
  snapshot. Backend derives identity and target level, resolves the canonical
  version, and compares it to the client's expected version before reservation.
  A mismatch returns a safe no-call conflict; never silently analyse an old editor
  against a new published version. Reject client roles/stages.
- GET `/requests/:requestId`: owner-scoped reconciliation of uncertain outcomes.
  If a clear/expiry invalidates the result, never return deleted response content.
- POST `/clear`: strict request ID/expected revision; origin and JSON protections.
  Repeated clear with the same identity is reconcilable and does not call AI.
- Retire the old `/api/v1/ai/hint-preview` runtime route with a safe NOT_FOUND
  response and zero provider calls. Its caller-controlled stage is not a second
  path around progression. Update only tests covering this intentional change;
  preserve reusable provider abstractions and instructor generation behavior.
- The disabled Get Hint placeholder becomes an entry point to this same panel;
  opening it never advances level or initiates generation.

Short generation-reservation transactions lock in consistent order: dedicated
per-learner quota row, parent Exercise, learner/version Conversation, then related
attempt/request state. Atomically create the quota row if absent and lock it
before counting/reserving slots across all exercises and server instances. Other
quota mutation paths use the same lock. Clear/cleanup/finalization paths that do
not reserve quota acquire only their needed suffix of this order and never seek
a quota lock after an Exercise lock. Do not lock the User row for quotas.
Reuse the existing Exercise lock to serialize publication/final-submission
decisions. Never hold locks over
a provider call. Reserve request, quota and lease before dispatch; finalize only
after rechecking owner, canonical publication, conversation generation/revision,
lease, expected version and final submission. A late result after clear/expiry/
version change/final submission is discarded. An abandoned lease becomes failed;
do not auto-replay uncertain calls.

One generation per conversation may be pending at a time. A concurrent new request
conflicts safely; reconciliation returns the existing request for an identical ID.
Clear increments content generation and cancels pending-result eligibility.
Code editing alone does not reset level/history or invalidate a legitimate older
snapshot reply. Final submission and clear/expiry do invalidate new reply commits.
Before renewing activity, expire old content and increment its generation. Cleanup
selects candidates, then rechecks expiry/generation under the ordered locks; an
earlier candidate selection cannot delete content accepted after renewed activity.
Daily quotas use Asia/Singapore calendar boundaries; the 10-minute limit is rolling.

## Bounds, provider and policy

Proposed application bounds, to validate against the actual SoCLaaS contract:
message 2,000 UTF-16 code units; shared code 20,000; optional reasoning 5,000;
optional output 8,000; assistant reply 2,000; 50 messages per history page.
Reject over-limit input explicitly without truncating learner source code.
Use the last eight complete exchanges at most and a 48,000-code-unit assembled
application context budget including trusted instructions and public question.
Discard oldest history first; if required context itself exceeds the bound, return
a recoverable no-call error. This is not a provider token-limit claim.
Tag each complete exchange with every shared context category used to generate
it. When a category is disabled, exclude the entire affected exchange, including
assistant text that may quote or paraphrase it, from subsequent provider requests.
Only eligible complete exchanges enter the last-eight budget; retain excluded
history for learner display until clear/expiry. Evaluate the whole assembled
request for unique sentinels. Explicitly explain that already dispatched requests
cannot retroactively withdraw shared context. The context-sharing controls govern
automatic context; text a learner explicitly pastes into a new message remains
intentional message content.

Use existing configured endpoint/model/key server-side. Add a typed coaching
operation with an injected fake transport. Reuse only fields already established
by the current adapter until official docs confirm additional capabilities.
No streaming/tool-call/RAG/remote browsing assumptions. Read bounded bytes before
JSON parsing (256 KiB maximum envelope, 32 KiB extracted content); enforce an
overall 30-second deadline and at most one transient retry (two attempts total),
or stricter existing configured bounds. Lease expiry must exceed this request
deadline and remain bounded. Do not increase configured limits without review.
Reserve the logical learner quota once; record actual provider-attempt count and
usage when available. Unavailable usage remains null.

The official quickstart currently returns an authentication page. The packet must
retain this contract-verification gap and cannot claim live acceptance. Approved
implementation can build and test the transport seam with the established source
envelope; any provider-required incompatibility returns to the coordinator.
Owner authorization is required before a controlled synthetic live-provider check.

## Security design and evaluation

Reference: [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).
Keep instructions and untrusted content separate, enforce permissions outside
the model, minimize context, validate outputs and render them inertly. Filters
are supplementary; test legitimate debugging requests alongside direct/indirect,
obfuscated, multilingual and multi-turn attacks. Use dummy data, observable
outcomes and graders checked against known passes/failures. Record inconclusive
cases and evaluation limits; no universal resistance claim.

For this product, test wrong-owner chat access, forged level/version, private
solution/hint/context retrieval, poisoned code comments/output/history, prompt
extraction, image/link exfiltration, and cumulative complete-solution disclosure.
Keep messages out of normal logs. Do not normalize or rewrite learner code to
match a deny list. No second guardrail model is required by this plan.

Coaching rubric (0–2 each): exercise relevance, factual usefulness, stage-appropriate
help, no complete solution, and constructive uncertainty. Require at least 8/10
and full marks on no-complete-solution for each accepted test exchange. Include
the one-line slice exercise and at least two different Python bugs across levels
and multi-turn conversations. Fake-model tests establish orchestration only;
semantic live-model results are separate evidence. A pattern scan cannot alone
prove the disclosure policy. Any discovered breach blocks a claim of live-ready
coaching until corrected/retested or returned for an explicit scope decision.
Score cumulative disclosure over the full test transcript, including runs longer
than the eight-exchange provider window. Cleared/expired text cannot be assessed
after deletion; document that limitation without retaining deleted transcripts.

## Requirements to verification

| Cases | Requirement IDs | Evidence owner/boundary |
| --- | --- | --- |
| Strict DTOs, unknown fields, lengths/surrogate edges, no secret fields | 01, 04, 12 | Implementation unit/contracts; testing independently verifies |
| Unauthenticated/wrong role/wrong owner/unpublished, no-call denial | 01, 06, 13 | Supertest plus real PostgreSQL ownership |
| First reply, ordinary chat, next level, failure, exhaustion, duplicate progression, eligibility after clear/expiry | 02, 08, 09 | Service tests plus real PG races |
| One-line solution leakage, small analogous examples, factual coaching, multi-turn accumulation | 03, 13 | Independent semantic security/testing rubric; real model separately authorized |
| Snapshot sharing/off/reasoning/output consent, quoted history sentinel exclusion, stale reply/version changes before and during call, no attempt write | 01, 04, 05 | Transport capture with sentinels and browser save-state observation |
| Refresh, user switch, final/read-only, archive, clear-vs-pending, lease expiry | 05, 06, 07, 08 | PG transactions and browser lifecycle |
| Lost response reconciliation, changed-payload reuse; concurrent different-exercise/service requests at the final quota slot dispatch exactly once | 08, 09 | Real PG, fake transport, HTTP/browser recovery |
| Expired access/prompts, scheduled deletion, tombstone content removal, cleanup versus renewed activity | 07 | Controlled clocks and PG; packaged scheduled-function smoke |
| Drag threshold/cancel, bounds, keyboard move/reset, minimize/focus, mobile keyboard | 10, 11 | Independent Playwright desktop/mobile plus manual a11y gaps |
| Provider timeout/retry/oversized/malformed/missing usage, legacy-preview no-call | 02, 09, 12, 13 | Fake transport and packaged backend composition |
| Existing auth, instructor, workspace recovery, browser Python, built assets | 11, 14 | Focused regressions then required integrated checks |
| DG/UG/reflections, stages/models and sanitized reports | 14 | Documentation stage plus coordinator accuracy review |

## Stage allocation and estimates

Five user-facing conversations only. An internal scoped planning review does not
create another user-facing chat; it reads these permitted planning artifacts only.
No implementer sees the testing stage's independent expected outcomes before
that stage has derived and recorded them from the approved plan.

| Stage | Requested model/effort | Initial soft estimate | Responsibility |
| --- | --- | --- | --- |
| planning | GPT-6.1 Sol/high | Original 250k tokens/45min; revised ceiling 6m/60min after observed repeated-context overrun | Owner decisions, plan, scoped review, prompts and gate evidence |
| implementation | Available GPT Luna; verify identifier at dispatch | 1.5m observed tokens/90min | Source/unit tests and concern-separated green commits |
| ai-security | GPT-6.1 Sol/high | 500k/45min | Independent threat/control review and repair verification |
| testing | GPT-6.1 Sol/high | 1.5m/90min | Independent functional/standards acceptance and integrated evidence |
| documentation | GPT-6.1 Sol/high | 400k/30min | DG/UG, feature map, PRODUCT.md, incremental Reflection-ZhengHao |

These are uncalibrated response-usage estimates, not billing or quota estimates.
Refine from stage-local measurements, retaining originals. Preserve Sol/high for
planning/security/testing/documentation; implementation execution stays Luna
where directions are clear. Record actual models, replacement sessions, repairs,
waits and coordination overhead; never combine app-provider and Codex tokens.

## Change ownership and verification

Implementation owns new assistant contracts/service/provider prompt and frontend
components/client hook; additive Prisma migration; scoped edits to app.ts, server
and Netlify composition, PublishedQuestionPage/LearnerWorkspace, relevant config,
cleanup packaging and tests. Preserve instructor services and attempt contracts;
reuse the existing attempt-finalization lock rather than rewrite that workflow.
Canonical monitor and Royden artifacts are protected. Keep secrets and generated
runtime/build output out of commits. Documentation owns only assigned guide,
product-map, reflection and handoff changes after verification.

Use configured standalone Node 24, existing tests, and an explicit verified
disposable database. Run focused checks, then required format/lint/typecheck,
declaration/production builds, deterministic/API, real PG and browser suites;
verify built frontend and packaged backend/cleanup when affected. Record known
baseline failures distinctly rather than silently ignoring them. No actual tests
or live-provider claims are made by this planning document.

## Approval checkpoint

Independent planning review: pass after one correction/re-review round; see
`workflow/evaluations/zhenghao/ZH-CHAT-01/planning-review.md`.
Owner scope/package approval and separate implementation authorization: verified
delegation in side chat `01a1b442-630f-7012-b4b8-eef108dad47f`, user turn
`01a1b444-56cb-71f2-a9fd-2b9a5f5c2256`; source human message and agent approval
were inspected with read_thread. Approval covers routine corrections consistent
with the nine choices and preserves the provider/live-call boundaries.
Approved-byte hashes and snapshot commit are recorded in the feature handoff
before dependent code. No material requirement change is covered automatically.
