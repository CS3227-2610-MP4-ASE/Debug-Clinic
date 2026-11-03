# Attempt-aware progressive coaching — experimental PRD draft

Status: experimental synthetic planning draft; **not human-approved SDD**. No application implementation or deployment is authorized. Evidence: TASK.md baseline and COACH-01–15 returned by the public synthetic owner, recorded by round in GrillingDecisions.md. Interface names and implementation mechanics below are proposals for review.

## Problem and outcome

A learner debugging Python needs a next useful direction based on their saved work, without replacing their reasoning or the instructor's authority. DebugClinic will offer three ordered coaching stages for each saved attempt revision. The server chooses the next stage and uses the pinned published exercise, permitted hints and saved code/reasoning. Only a validated, successfully persisted response advances the ladder.

Success means a learner can save work, request one next stage, read advisory feedback, revise, and explicitly submit; duplicate actions, failures and late responses never corrupt that progression. This draft defines correctness through the acceptance criteria below, rather than invented adoption or latency targets.

## Actors, scope and boundaries

Exactly LEARNER and INSTRUCTOR exist. The owning LEARNER alone may request coaching. INSTRUCTOR is denied this endpoint, including when attempting to access an attempt they otherwise can inspect through existing product features. Instructor-approved exercise content remains authoritative. AI cannot publish, grade, submit, execute Python, change roles, or override instructor decisions. No new identity provider, exercise authoring, instructor review implementation, arbitrary execution, production deployment, or general chat is included. Reuse Better Auth sessions, shared Zod contracts, persistence, and backend AiProvider with its offline fake. [COACH-01, 02, 08, 15]

## Learner journey

One React/MUI attempt workspace shows the saved revision, current stage (0–3 completed), request state and clearly labelled advisory feedback. Saving code or reasoning makes a new immutable revision and resets the ladder to stage 1. Unsaved changes remain visible and must be saved before coaching; requesting feedback never silently saves or submits. Nonblank saved reasoning and a saved code proposal are required. Final submission is a separate explicit learner action and is terminal for editing and new coaching. [COACH-02–05, 13]

The workspace has one coaching action. While pending it disables duplicates, announces progress accessibly and preserves draft work. It handles no saved work, empty reasoning, loading, saved/dirty state, all stages, exhausted stages, recoverable failures, stale responses and submitted state. Feedback is plain inert text, never executable HTML or Markdown actions. Keyboard interaction, visible focus, status announcements and mobile reflow are acceptance requirements. UI recovery refreshes authoritative server state without discarding local edits. [COACH-08, 11, 13]

## Functional requirements and acceptance

| ID | Requirement | Observable acceptance |
|---|---|---|
| R01 | Authenticate and authorize before private content/context/provider access. [01] | No session, wrong role and non-owner produce safe denial with zero private-content reads and zero provider calls. Identity and role come from the session. |
| R02 | Pin attempts to published exercise versions; require saved code and nonblank reasoning. [02] | Unpublished/missing version or missing saved prerequisites cannot call AI. Editing an exercise elsewhere cannot change the pinned context. |
| R03 | Exactly three server-selected ordered stages. [03] | Success yields stages 1, 2, 3; stage 4 returns STAGES_EXHAUSTED without AI. Browser-supplied stage selection is rejected. |
| R04 | Save creates a revision and resets progression. [04] | Every saved code/reasoning edit changes revision identity; old pending feedback cannot become current or advance the new revision. |
| R05 | Final submission is terminal and serialized with coaching persistence. [05] | Submit before finalization prevents feedback advancement; finalize before submit can persist once. Later edits and new requests fail. |
| R06 | Durable idempotency and concurrency control. [06] | Same learner/attempt/revision/key and same request replays its stored outcome; changed request under that key conflicts. Parallel requests do not double-advance or double-charge application stage usage. |
| R07 | Server-only bounded context allowlist. [02, 07] | Context includes published statement, approved stage-appropriate hints, current saved code/reasoning and bounded relevant prior feedback only. No private solution, complete solution, other learner or unrelated record appears. Learner text is untrusted data. |
| R08 | Bounded validated advisory output. [08] | Malformed/oversized output fails safely; valid output is displayed as text and cannot invoke privileged actions or overwrite instructor state. |
| R09 | Configured validated resource limits. [09] | Input/context/output, request/deadline/retry limits are enforced at boundaries. Offline tests are deterministic. Live numeric limits are verified before production acceptance. |
| R10 | Honest operational accounting. [10] | Store request ID, prompt/model version, stage/revision, latency, provider outcome and available usage. Missing usage is null. Separate actual/possible provider dispatch, successful stage commits, and replay. No exactly-once or free upstream billing claim. |
| R11 | Recoverable stable errors with request IDs. [11] | Timeout, rate limit, quota, invalid output and provider failures preserve work and advance no stage. UI offers action appropriate to the current server state. |
| R12 | Privacy and retention gate. [12] | Logs/metrics exclude raw code, reasoning, prompts, AI bodies, cookies and credentials. Persist only necessary owned learner feedback. Retention/deletion must be decided before real users. |
| R13 | Simple accessible workspace with explicit actions. [13] | Revision/stage/request states visible; save before coaching; submission explicit; keyboard/mobile/empty/error/pending workflows work. |
| R14 | Deterministic offline acceptance evidence. [14] | Fake transport and real local PostgreSQL integration prove authorization, state/context, races, failures, output, inert display and null usage. |
| R15 | Reuse existing architecture, precise seams, bounded scope. [15] | Shared-interface requests are explicit in TDD.md; no application implementation, execution, authoring, review, identity replacement or deployment is part of this change. |

Bracketed numbers refer to COACH IDs, not external citations.

## Proposed product/contract decisions for review

These are design choices, not additional synthetic-owner answers:

- Keep stage labels neutral as “Stage 1/2/3”; prompt progression proposes orientation → localization → a bounded next diagnostic step. Do not promise semantic solution-leak prevention solely from structure validation.
- Requests identify the saved revision and expected progress version; they do not carry code, reasoning, selected stage, prompt, identity or model. Dirty work must be saved using the existing attempt-save seam first.
- Application stage usage counts a successfully persisted stage once; provider-call/rate/quota accounting is separate and may count failed or uncertain dispatches. Revision reset does not reset provider resource controls.
- TP-RECOVERY: replay never automatically resends an uncertain provider call. A deadline closes the request as UNKNOWN, with no stage advancement. A deliberate new-key retry is a separate operation after authoritative state refresh; the UI explains that previous provider usage may be unknown. A late response cannot revive a closed request.
- Reading/replaying already stored owned feedback is historical retrieval, never a new coaching call; it stays tagged to the original revision and cannot become current after edits or submission.

## Draft acceptance and remaining gates

RequirementsToTests.md defines implementation-time evidence; no tests are claimed executed for an unimplemented feature. This planning task is complete when the required draft artifacts and decision record are coherent and committed. Before implementation, the human owner must review the proposed interfaces, concurrency/accounting and TP-RECOVERY. Before real users, decide retention, deletion and access lifecycle. Before production, verify provider capabilities/numeric limits and configuration, infrastructure and operational handling. No network verification or production acceptance occurs in this task.
