# Attempt-aware progressive coaching — PRD

**Status: experimental draft; never human-approved.** Candidate C, 2026-11-03.
This is planning material for DebugClinic. No implementation or live-provider
acceptance is asserted. The deterministic synthetic owner supplied the decisions
below; proposed product details are explicitly identified as design choices.

## Problem and intended outcome

A learner who has saved a Python debugging attempt should receive progressively
more specific coaching tied to that exact saved work. Coaching must help the
learner think, preserve the instructor's authority, and avoid silently spending
resources twice when a request is repeated. A revision or final submission must
win over an obsolete in-flight response.

The learner uses one attempt workspace, saves code and reasoning, requests the
next coaching stage, and explicitly reviews and submits when ready. Coaching is
advisory; it does not execute Python, grade work, submit work, or make instructor
decisions. There are exactly three stages per saved revision.

## Source of requirements and clarification record

Read `TASK.md`; ran `python ask_owner.py --list`, then one clarification round:

```text
python ask_owner.py --topic access --topic eligibility --topic progression --topic revision --topic submission --topic retry --topic context --topic output --topic limits --topic accounting --topic failure --topic privacy --topic ui --topic testing --topic scope
```

The topic names are the questions supported by the synthetic interface. The table
records its returned owner evidence, retaining the identifiers for traceability.
No repository inspection, external sources, assumptions, or drafting choices are
owner evidence.

| Topic / owner ID | Owner decision |
| --- | --- |
| access / COACH-01 | Only the owning LEARNER may use the coaching endpoint. Check session, ownership and attempt state before private retrieval or AI; INSTRUCTOR is denied. |
| eligibility / COACH-02 | Attempt pinned to a published exercise version; saved code proposal and nonblank reasoning required. Never include instructor private solutions or other learners' work. |
| progression / COACH-03 | Exactly three ordered stages chosen by the server. Only a successful persisted response advances. Failure does not; after stage 3 return `STAGES_EXHAUSTED` without AI. |
| revision / COACH-04 | Every saved code/reasoning edit creates a revision and resets progression. Old in-flight responses cannot become current or advance a new revision. |
| submission / COACH-05 | Final submission is terminal: no further edits/coaching. Serialize coaching persistence against submission. |
| retry / COACH-06 | Identity includes learner, attempt, revision and idempotency key. Same request/key replays saved outcome; conflict fails. Concurrency cannot double-advance or double-charge application usage. Unknown upstream outcomes need a recovery policy. |
| context / COACH-07 | Use published statement, approved stage-appropriate hints, current saved code/reasoning and bounded relevant prior feedback. Learner text is data, never instructions; exclude complete solutions and unrelated records. |
| output / COACH-08 | Advisory inert plain text, bounded validated structure, no authority to publish/grade/submit/execute/change roles/overwrite decisions. Reject malformed output safely. |
| limits / COACH-09 | Validated configured input/context/output/request/deadline/retry limits. Verify actual provider numeric limits before production acceptance; deterministic offline fake tests. |
| accounting / COACH-10 | Record identity, prompt/model version, stage/revision, latency, outcome and reported usage; missing usage is null. Distinguish calls, stages and replays. Never promise free or exactly-once upstream billing after uncertainty. |
| failure / COACH-11 | Stable recoverable errors with request IDs for timeouts, rate/quota limits, invalid output and provider failures. No advancement; prevent duplicate pending actions, preserve work, support actionable recovery. |
| privacy / COACH-12 | No raw code/reasoning/prompts/response bodies/cookies/credentials in logs or metrics. Necessary learner-visible feedback is ownership-scoped. Retention/deletion must be decided before real users. |
| ui / COACH-13 | One workspace shows saved revision/stage/request state; save before coaching; explicit review/final submit; keyboard/mobile/empty/error/pending states and advisory copy. |
| testing / COACH-14 | Fake transport plus real local DB tests cover access, ordering, context, races, idempotency, failures, inert output and missing usage. |
| scope / COACH-15 | No authoring, instructor review, Python execution, identity-provider replacement or production deployment. Reuse contracts/auth/AI boundaries; propose precise shared-interface requests. |

## Requirements and acceptance behavior

| Requirement | Observable acceptance behavior |
| --- | --- |
| R01 — authorized access | Unauthenticated access fails; wrong role fails; another learner's attempt is concealed as not found. No private content retrieval or provider call occurs on these paths. |
| R02 — saved eligible attempt | Coaching uses the pinned published version and identified saved revision. Missing saved code or blank reasoning produces an actionable eligibility error with zero calls. Client-supplied stage/context/model are not accepted. |
| R03 — ordered progression | Successful stages are 1, 2, 3. Failed/discarded requests leave the count unchanged. A fourth fresh request returns `STAGES_EXHAUSTED`, with no call or usage-stage increment. |
| R04 — revision isolation | Saving changed code/reasoning creates an immutable revision with zero successful stages. Late feedback remains historical and cannot attach to the new current revision. |
| R05 — terminal submission | Final submit requires explicit learner action. Save/coaching/submission use the same attempt serialization boundary. A response finishing after submission is discarded from progression. |
| R06 — request identity | Exact retries return the durable request outcome, with no new call or stage charge. Conflicting key reuse fails. Concurrent different keys admit one active request for a revision. |
| R07 — bounded safe context | A capture fake shows only the pinned statement, approved hints for this stage, this revision's work, and bounded earlier successful feedback from this revision. Private solutions/other learners/unrelated versions are absent. |
| R08 — safe advisory output | Strict validated structure and matching server-selected stage are required. The browser displays text inertly. No AI output can invoke privileged actions. |
| R09 — resource controls | Configured bounds are checked before dispatch, output during/after receipt, and deadlines at transport. Invalid/missing limit configuration fails closed. Retries and unknown outcomes consume their real dispatch budget. |
| R10 — honest accounting | Each physical dispatch is recorded separately from each uniquely committed stage and from replays. Missing provider usage stays null; no synthetic zero or billing guarantee. |
| R11 — recovery | Errors carry a request ID, stable code and retry/recovery guidance. Work stays saved. Timeout or uncertain disconnect does not silently dispatch again. |
| R12 — privacy | Feedback/history/status routes enforce the same ownership. Logs contain allowlisted metadata only. Retention/deletion is an unresolved launch gate. |
| R13 — usable workspace | Show saved revision, dirty/saved state, stage count and active request state. Disable coaching until saved/eligible and while pending. Support keyboard, narrow mobile views and explicit submission review. |
| R14 — evidence | Offline contract/service/UI tests and actual local PostgreSQL concurrency tests validate these outcomes before implementation handoff is accepted. This draft only specifies those tests. |
| R15 — boundaries | Keep the mandated stack and exactly two roles. Shared-interface changes are explicit requests; no authoring/review/execution/deployment feature enters scope. |

## Proposed product choices (not additional owner answers)

- Stage 1 asks a focused diagnostic question; stage 2 explains a relevant local
  mechanism; stage 3 suggests a bounded repair strategy. All three discourage full
  replacement solutions. The exact educational copy needs instructor review.
- Require nonblank saved code as the concrete interpretation of a saved proposal;
  whitespace-only reasoning is ineligible. An unchanged save is a no-op; every
  actual saved edit to either field creates a new revision. Dirty browser text
  does not alter server context.
- Successful stages and prior feedback are scoped to a revision. Keep historical
  revision feedback viewable, clearly marked historical. Replaying an old request
  may return its saved outcome after edit/submission, but cannot initiate coaching
  or mutate state. New work on a submitted attempt is prohibited.
- Unknown dispatched calls remain visibly unresolved and block fresh coaching
  until the learner explicitly chooses recovery. Recovery uses a new key,
  supersedes the old request, and warns that the provider may have charged the
  first call. Old results are fenced out. See TDD for the exact protocol.
- A local application stage charge means one durable successful stage ledger
  entry. Dispatch quotas count provider attempts independently, including failed
  or uncertain calls. This feature sets no money price or provider billing claim.
- If a draft is dirty, show “Save before coaching”; saving is still allowed during
  an old revision's request and makes that request historical. Submission remains
  possible while coaching is pending; its terminal transition fences late output.

## Scope, success, and gates

Deliver contracts, persistence/serialization design, API behavior, a single
workspace flow, fake-provider validation and a traceable implementation handoff.
The fixed architecture is React/MUI → Express → Better Auth database session,
PostgreSQL/Prisma, shared Zod, backend AiProvider with offline fake, Node24,
Vitest/Supertest/Playwright. Do not substitute technology or introduce new roles.

Success means all R01–R15 acceptance scenarios pass, with zero unauthorized calls,
zero duplicate committed stages and no stale advancement in controlled races.
These are proposed acceptance criteria, not measured results.

Before real users: decide retention/deletion (including feedback, attempts,
request identity records and provider retention), privacy/consent language and
support ownership. Before live-provider acceptance: verify numeric limits and
model capabilities/version, approved-hint mapping and educational quality with
instructors, rate/quota policy, and provider data handling. None has been
verified here. No production deployment, new auth system, arbitrary Python
execution, authoring UI or instructor-review workflow is included.
