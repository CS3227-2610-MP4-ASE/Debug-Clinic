# PRD v1 — MP4-D2-F01: generate-question

- Date: 2026-11-05 (Asia/Singapore)
- Owner: Developer 2
- Status: **Draft - awaiting owner approval**
- Baseline: `Debug-Clinic-auth-completion`, branch `royden/auth-completion`, parent `b8612d9dd655ae200607c4ff887703132eb0f61f`.

## Purpose and authority

An authenticated instructor enters a beginner Python topic, receives one editable unsaved exercise preview, explicitly saves a private draft, and can find and reopen their saved drafts read-only. Success is this complete preparation flow with clear failures and no learner access.

The [Mission Brief](../../mission-brief/MP4-D2-F01-generate-question.md) is scope-approved at SHA-256 `1dc4543abd85eb0cb396ffd3a416472c0f4cee1e6ee75e0b6781009d5740aac1`. [ApprovalRecord.md](ApprovalRecord.md) supersedes its historical pending-approval header without changing approved bytes. The owner accepted [Q1–Q12](GrillingDecisions.md), confirmed shared understanding, and required minimal delivery. Those decisions authorize this draft, not PRD/package approval or implementation.

The [product constraints](../../../PRODUCT.md), [coding standards](../../CodingStandards.md), and [workflow](../../../workflow/agents/README.md) apply. “Admin” means the existing `INSTRUCTOR`; no new role is introduced.

## Functional requirements and acceptance

Each criterion below is attached to its stable requirement ID; later RTT must preserve that traceability.

**F01-FR-01 — Instructor access and ownership.** Only authenticated instructors can generate, save, list, or open F01 drafts. Saved drafts belong to their saving instructor and remain private `DRAFT` records.

Acceptance: an owner can complete the flow; unauthenticated users, learners, and another instructor cannot retrieve the draft or its contents through UI or direct requests. Denied operations produce safe access feedback and perform no unauthorized operation. F01 creates no learner access or verification/publication action.

**F01-FR-02 — Topic and level.** Accept bounded free-text Python topics, including multiple related beginner concepts, at fixed beginner undergraduate level. Reject blank, other-language, advanced/out-of-level, and unrelated requests; vague topics receive feedback asking for clarification. Do not silently replace the requested topic or expose a difficulty control.

Acceptance: representative relevant topics can generate; representative invalid/vague requests receive actionable feedback and no usable draft. The topic remains available for correction. Documented input bounds are enforced with safe validation feedback.

**F01-FR-03 — One topic to one preview.** `Generate` requests one six-field preview for the submitted topic. A successful response displays all fields together without saving. Topic association must remain clear.

Acceptance: success displays the topic and complete preview, with no saved record before `Save draft`.

**Proposed clarification PC-01, requiring owner approval:** `Generate` is available only before a preview exists. After success, the original topic is read-only until `New question` clears it and the preview. This prevents edited topic text from being mistaken for the generation source and adds no regeneration workflow. This clarification was not separately approved during grilling.

**F01-FR-04 — Six-field content and quality.** The preview contains title, problem statement, buggy Python code, expected behavior, instructor-only bug explanation, and corrected solution. Target a small, self-contained, deterministic exercise with one intentional conceptual bug, ordinary Python/built-ins, no third-party packages, and no file, network, or process operations. Explanation and correction must agree with expected behavior and the topic.

Acceptance: quality review of controlled generated examples assesses every stated quality property. Missing, malformed, non-Python, or unsuitable output fails generation under FR-06. These are required output-quality goals; generation and validation do not prove Python semantics or correctness. F01 performs no code execution and requires no Python parser, classifier, or sandbox.

**F01-FR-05 — Local editing and explicit Save.** All six fields are editable before saving. `Save draft` persists the current edited fields, original topic, and minimal generation provenance. Saving validates required content and documented bounds; it does not verify correctness or publish.

Acceptance: edits appear in the saved record; empty required fields or over-limit content prevent Save with feedback and retain the preview. Generated and edited content is visibly unverified in preview and saved views. A successful Save opens the saved draft read-only with success feedback; no editable saved-draft workflow is provided.

**F01-FR-06 — Generation failure and Retry.** Invalid output, provider failure, or timeout produces a safe actionable generation failure and explicit `Retry`, without partial saving or silent fake fallback. Preserve the topic and any earlier preview held in memory.

Acceptance: failed generation does not expose incomplete output as a usable preview or create a draft. `Retry` explicitly retries generation for the retained topic. Failure does not clear retained user content or reveal provider internals. This requirement adds no separate regeneration action.

**F01-FR-07 — Loading and save failure.** Show generation/Save progress and prevent repeated request or Save clicks while the respective operation is pending. No Cancel flow is included. Failed Save retains the editable preview and offers manual retry through `Save draft`.

Acceptance: pending actions show loading and cannot be repeatedly submitted through their controls. An ordinary failed Save returns safe feedback with edits intact and allows another explicit Save attempt. Success transitions to FR-05's read-only view.

**F01-FR-08 — My drafts and reopening.** `My drafts` lists only the current instructor's saved drafts and allows read-only reopening of their six fields and topic.

Acceptance: saved drafts appear in the owner's list and remain retrievable after reload. An empty list gives a clear empty state and a way to begin a question. Retrieval failure gives safe actionable feedback. Reopening exposes no editing or deletion action; ownership checks also apply to direct retrieval.

**F01-FR-09 — Starting over and navigation.** `New question` clears the topic and unsaved preview for another question. Leaving or reloading loses unsaved work; there is no autosave, restoration, or extra discard dialog.

Acceptance: starting over presents empty topic entry; leaving/reloading does not recover unsaved edits. Previously saved drafts remain available through `My drafts`. No separate regeneration action is exposed.

## Nonfunctional requirements and acceptance

**F01-NFR-01 — Minimal provider context and retention.** Use the backend SoC LLM adapter. Send only the topic and fixed generation instructions/level; exclude identity, history, and other exercises. Retain topic, six fields, ownership, and minimal provenance on Save, including prompt/provider/model identification sufficient to identify generation origin. Logs exclude raw topics, code, model content, and credentials.

Acceptance: inspected requests, saved records, and sanitized synthetic logs demonstrate these boundaries; topic/output injection cannot enlarge authorized context or grant actions. Credentials stay server-side.

**F01-NFR-02 — Safe bounded handling.** Treat topics, provider output, and edits as untrusted; validate requests and complete output, render content safely, and bound request size, output, elapsed time, and retries. Use the smallest compatible existing controls, without a custom quota subsystem.

Acceptance: malformed/oversized requests, unsafe rendering content, and dependency failures produce bounded safe outcomes. TDD documents justified numeric design limits and retry/timeout policy without claiming provider capacity or an SLA. Validation never labels content semantically proven.

**F01-NFR-03 — Usage and latency evidence.** Track minimal generation usage, outcome, and latency without raw-content logging; identify unavailable provider usage data honestly.

Acceptance: successful and failed synthetic calls produce inspectable permitted usage/latency evidence. Report fake-provider, database, browser, and controlled live-provider evidence separately. A fake response or configured model is not proof of real generation quality or availability; live acceptance requires its own authorized environment.

**F01-NFR-04 — Accessible baseline-compatible UI.** Follow the existing MUI theme and authenticated application conventions; preserve existing authentication, learner behavior, and deployment compatibility.

Acceptance: keyboard navigation, visible focus, semantic labels, responsive presentation, contrast, and announced loading/error states support the complete flow. Relevant baseline regression checks remain passing.

## Decision coverage and boundaries

| Accepted decision | Requirement coverage |
| --- | --- |
| Q1 Composition | FR-03, FR-04 |
| Q2 Preview/private explicit Save | FR-01, FR-03, FR-05 |
| Q3 Free-text Python | FR-02 |
| Q4 Fixed beginner level | FR-02, FR-04 |
| Q5 Editable preview | FR-05 |
| Q6 Own list/read-only reopen | FR-01, FR-08 |
| Q7 Topic suitability | FR-02 |
| Q8 Exercise quality | FR-04 |
| Q9 Failure/manual Retry | FR-06, NFR-02 |
| Q10 Context/retention | FR-05, NFR-01, NFR-03 |
| Q11 Start over/unsaved loss | FR-09; PC-01 proposed |
| Q12 Loading/save outcomes | FR-05, FR-07 |

Hints, execution, verification, publication, saved edits/deletion, regeneration, difficulty selection, Cancel, autosave, and recovery machinery are excluded. Published exercises still require three approved ordered hints; downstream allocation belongs to the Developer 2 owner/coordinator. No queues, caches, custom quotas, or additional workflows are required.

After human PRD approval, TDD/RTT define routes, schemas, module/test seams, justified limits, and acceptance evidence. Independent package and AI security reviews, human package approval, and separate implementation authorization remain required. This draft records none of those approvals and authorizes no code, commits, or live calls.
