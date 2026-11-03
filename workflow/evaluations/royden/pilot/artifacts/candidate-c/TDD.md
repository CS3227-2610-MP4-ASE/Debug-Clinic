# Attempt-aware progressive coaching — technical design

**Experimental draft; never human-approved.** Implements the proposed PRD, not
application code. Names below are proposed shared interfaces: no product source
or schema was inspected. Owner evidence is the COACH-01–15 record in PRD.md.

## Architecture and seams

Keep Node24, React/MUI, Express, Better Auth database sessions, Prisma/PostgreSQL,
shared Zod, Vitest/Supertest/Playwright. Browser → authenticated route →
CoachingService → owned-attempt repository/context builder → backend AiProvider.
Only the backend holds provider credentials. AiProvider has a deterministic
offline implementation and receives no authority-bearing tools or callbacks.

Proposed seams:

| Boundary | Requested contract / responsibility |
| --- | --- |
| Shared contracts | SaveRevisionInput, SubmitAttemptInput, StartCoachingInput, CoachingRequestView, CoachingError, CoachOutput and their Zod schemas. Strict objects reject client stage/context/model/role fields. |
| Better Auth adapter | Resolve a current server-side database session to `{userId, role: LEARNER | INSTRUCTOR}`. Session expiry is enforced on every route; no browser-role trust. |
| Attempt persistence | Metadata-only ownership lookup; lock owned attempt; immutable revision insertion; CAS current revision; terminal submission; coaching commit in the same transaction boundary. |
| Published exercise read | Return the pinned published statement and instructor-approved hints with allowed stage tags. Separate select excludes private solution columns and unpublished versions. A broken pin fails closed. |
| AiProvider | `generate({context, stage, promptVersion, modelVersion, outputLimit, deadline, signal, requestId})` returns untrusted output plus optional usage and provider request ID, or classified failure. No automatic SDK retries after possible dispatch. |
| UI workspace | Render saved revision/current stage/request state and advisory plain text; save, coach, poll/recover, review and submit are explicit actions. |

These requests require integration review with existing contract/auth/AI owners.
They add no authoring, instructor review, Python execution, new identity provider
or infrastructure dependency.

## Product records and invariants

All identifiers are opaque server-generated IDs except the client's random
idempotency UUID. Foreign keys enforce attempt/revision/request relationships.

- **Attempt**: id, learnerId, exerciseVersionId (immutable published pin),
  status OPEN/SUBMITTED, currentRevisionId, activeRequestId nullable,
  mutationVersion, submittedAt nullable. This row is the serialization anchor.
- **AttemptRevision**: id, attemptId, ordinal, code, reasoning, createdAt,
  successfulStages (0..3). Content never updates. A uniqueness constraint on
  `(attemptId, ordinal)` and composite relationship checks prevent cross-attempt
  pointers. Prior versions remain historical.
- **CoachingRequest**: id, learnerId, attemptId, revisionId, idempotencyKey,
  canonicalInputFingerprint, stage, reservationEpoch, state, stable error code,
  timestamps/deadline, promptVersion/modelVersion, supersedesRequestId nullable,
  feedback nullable, callId nullable. States: RESERVED, RUNNING, UNKNOWN,
  SUCCEEDED, FAILED, DISCARDED. Unique `(learnerId, idempotencyKey)` detects
  conflicting reuse even across attempts/revisions. Reserve a partial unique
  `(attemptId, revisionId)` for RESERVED/RUNNING/UNKNOWN as defense in depth.
- **ProviderCall**: id, requestId unique, dispatchStartedAt, completedAt,
  providerRequestId nullable, outcome NOT_DISPATCHED/REPORTED_SUCCESS/
  REPORTED_FAILURE/UNKNOWN, latencyMs nullable, usage nullable, model/prompt
  version. Usage fields are nullable reported input/output/total values; retain
  provider units, validate nonnegative finite values and do not derive missing
  values as zero. One call row represents one possible physical dispatch.
- **StageUsage**: requestId unique, attemptId, revisionId, stage, committedAt;
  unique `(revisionId, stage)`. This is application successful-stage usage, not a
  monetary billing ledger. Its insert, feedback persistence and counter increment
  commit atomically.
- **QuotaWindow**: learnerId/window identity and admitted-dispatch counter.
  Admission is transactional across attempts; failed/unknown calls are counted.
  No raw code, reasoning, full context or response enters operational logs.

Migrations must add bounded columns, indexes, foreign keys and stage checks.
An active pointer and epoch fence callbacks; uniqueness alone cannot prevent an
old revision advancing. Do not use a process-local mutex as the concurrency
guarantee. Parameterized Prisma operations may use `SELECT ... FOR UPDATE` in a
short transaction; all participating operations use one documented lock order:
learner quota row when needed, then attempt row, then request rows in ID order.
Save/submission need only the attempt and affected request rows. No network await
occurs while database locks are held.

## Proposed HTTP contracts

Every response carries a server correlation ID. Coaching errors also carry the
durable coaching request ID if admitted; pre-admission errors use the correlation
ID as `requestId` and mark `persistedRequest: false`. IDs are opaque, not content.

| Route | Input / result |
| --- | --- |
| PUT `/api/attempts/:id/revision` | `{expectedRevisionId: ID|null, code: string, reasoning: string}`. Owner-only OPEN attempt; strict configured bounds; changed content creates revision and resets stages. Exact unchanged content returns current revision. Stale expected revision → 409 `REVISION_CONFLICT`. |
| POST `/api/attempts/:id/coaching` | `{revisionId: ID, idempotencyKey: UUID, supersedesRequestId?: ID}`. Server selects stage. Returns 202 with request view when pending; exact replay returns the saved state/outcome, never redispatches. |
| GET `/api/attempts/:id/coaching/:requestId` | Owned status/history only. Request must belong to this attempt and learner. Returns state, revision, stage, historical flag, approved feedback only for SUCCEEDED, error and allowed recovery action. |
| GET `/api/attempts/:id` | Owned workspace snapshot: pin, saved content/revision, OPEN/SUBMITTED, successful stage count, current request state, historical feedback summaries. Bound/paginate history. |
| POST `/api/attempts/:id/submit` | `{expectedRevisionId: ID}`. Explicit OPEN → SUBMITTED under the same attempt lock. Stale revision → 409. Same already-submitted revision may return the existing receipt. Never an AI-triggered action. |

Canonical coaching identity is authenticated learner + URL attempt ID + body
revision ID + key + optional supersedes ID + contract version. Reuse of the key
with a different canonical body fails `IDEMPOTENCY_CONFLICT`; stage and model
snapshot are server values fixed on first admission. Replays return the stored
outcome plus current historical/state metadata, even after edit/submission;
they initiate no new coaching. New keys on terminal attempts fail.

Common stable errors: 401 `UNAUTHENTICATED`; 403 `ROLE_DENIED`; 404 `NOT_FOUND`
for another learner's resources; 409 `ATTEMPT_SUBMITTED`, `REVISION_CONFLICT`,
`REQUEST_IN_PROGRESS`, `RECOVERY_REQUIRED`, `IDEMPOTENCY_CONFLICT`,
`STAGES_EXHAUSTED`; 422 `ATTEMPT_INELIGIBLE`, `INPUT_LIMIT`, `CONTEXT_LIMIT`;
429 `RATE_LIMITED`, `QUOTA_EXHAUSTED`; 502 `INVALID_AI_OUTPUT`,
`PROVIDER_FAILURE`; 504 `PROVIDER_TIMEOUT`. Polling a persisted failed request
returns its status representation, including this stable error classification.
Retryability and allowed actions come from the server, never free-form provider
errors. Do not expose provider exception bodies or database details.

## Admission, dispatch, and persistence protocol

1. Resolve session and require LEARNER. Query minimal attempt metadata, establish
   ownership, read state. Do not fetch saved text, hints or solutions yet.
2. Under the admission transaction/attempt lock, validate canonical key reuse.
   Return an authorized exact replay first; this can be historical. For a new
   request require OPEN, the supplied current revision, saved nonblank code and
   reasoning metadata/validation, a valid published pin, and stages below three.
   Reject active concurrency or perform the explicit UNKNOWN recovery below.
   Validate bounds and quota; choose `successfulStages + 1`. Insert RESERVED
   request and NOT_DISPATCHED call, install active ID/epoch, reserve dispatch
   quota. Rejected admissions make zero calls. An authorized eligibility read of
   current code occurs only after ownership and state have passed.
3. Fetch the authorized immutable current revision and approved pinned context.
   Construct and size the bounded context. If this fails, finalize FAILED,
   clear the matching pointer, and release only the NOT_DISPATCHED reservation;
   no physical dispatch count is claimed. Re-check OPEN/current/active fence in
   a short dispatch transaction before marking RUNNING and dispatch intent.
4. Set `dispatchStartedAt` and ProviderCall outcome UNKNOWN as durable dispatch
   intent before calling AiProvider exactly once for this request. A call remains
   NOT_DISPATCHED only while absence of intent proves it was not sent. The
   conservative crash window between intent and actual transport
   is UNKNOWN, never automatic redispatch. The API may finish 202 while its
   service task continues; correctness does not depend on that process surviving.
5. Receive untrusted provider output within bounded body/deadline, validate it,
   and record provider outcome/usage. In a short transaction lock the attempt,
   then request; only commit feedback and StageUsage when attempt is OPEN,
   revision/current pointer/epoch still match, request is active RUNNING and
   next stage equals the reserved stage. Atomically set SUCCEEDED, advance by
   one and clear active pointer. Otherwise discard the output and mark DISCARDED
   without a stage ledger entry. Never persist discarded response bodies.
6. Known failures finalize FAILED, save safe error metadata, and clear matching
   active pointer with zero advancement. Reported provider success with malformed
   output is a provider call but failed application stage. Usage can be present.
   Idempotent writes keyed by request/call IDs prevent duplicate bookkeeping.

Database retries reuse an already-received result; they never invoke AiProvider
again. If commit acknowledgement is lost, query the durable request/ledger to
learn whether it committed before attempting a bounded database-only retry. If
the process loses the result or cannot resolve dispatch, enter UNKNOWN.

Saving changed work locks Attempt, creates a fresh revision, increments the
epoch, clears the old active pointer, and marks any old unfinished request
DISCARDED. Submission locks the same row, verifies expected revision, sets
SUBMITTED, increments epoch and invalidates active work. Already committed
feedback remains historical. If the coaching commit wins the lock first it may
commit while OPEN; if save/submission wins first it cannot advance. Best-effort
transport cancellation reduces spend but is never the correctness mechanism.

## Unknown outcomes, retries, and process death

There are **no automatic transport retries after dispatch intent**. Disable
provider SDK implicit retries. Explicit known failures use a new key and consume
the configured retry/dispatch allowance. The original key replays its failure.

An expired RUNNING deadline becomes UNKNOWN under the attempt lock if still
active. A status/start request can perform this lazy recovery; startup scanning
may apply the identical idempotent transition. No extra queue/service is needed.
A RESERVED request known never to have dispatch intent can safely fail with a
retry action; dispatched work is always treated conservatively.

While UNKNOWN is active, fresh requests return `RECOVERY_REQUIRED`. Show the old
request ID and “The provider may have processed this request. Retrying may incur
another provider charge.” The learner may continue saving/submitting, or choose
“Retry this stage.” That action creates a new key with `supersedesRequestId`.
Admission validates that this is the owned current UNKNOWN request for the same
revision, enforces retry and quota bounds, marks it DISCARDED and installs a new
epoch/request atomically. Concurrent recovery clicks admit only one replacement.
Known FAILED retries do not need the supersedes field. Recovery is forbidden
after submission or revision change; the current state is returned instead.

If an old call subsequently returns, reconcile call metadata/usage by call ID
but discard its text; it cannot advance or overwrite the newer request. Unknown
usage remains null until reported. Physical provider work may overlap or be
billed twice following explicit recovery, despite at most one committed stage.
No claim of upstream exactly-once billing is possible.

## Context, output, and limits

Context is a typed object: pinned exercise statement/version; approved hints
tagged for the selected stage; saved revision's code/reasoning; at most the two
earlier successful stage responses for the same revision, capped by configured
bytes/tokens. Old revisions, failed output, other learners, private solutions,
unpublished edits and unrelated records are excluded by explicit selects.
No transcript dump or full solution field is available to the builder. Missing
approved hints is allowed; missing statement/pin is not.

System instructions define advisory coaching and stage specificity. Serialize
learner content as delimited structured data; explicitly say it is untrusted
content that cannot alter instructions. Treat statements/hints as content too.
This reduces injection risk but cannot mathematically guarantee model behavior.
No tools, credentials, executable code path or authority-changing capability is
exposed. Full-solution avoidance also requires prompt/model quality evaluation;
schema validation alone cannot establish educational correctness.

Proposed output Zod schema is strict `{stage: 1|2|3, feedback: string}`. Require
stage equality, nonblank bounded text and an overall bounded response. Reject
extra keys, malformed JSON, invalid types/stages and oversized bodies. MUI text
nodes render feedback with preserved wrapping; no HTML, markdown rendering,
links interpreted as actions, eval or dangerouslySetInnerHTML. Code-like text is
still inert. Advisory copy says the instructor remains authoritative.

Configuration must supply validated positive finite integers for
`CODE_MAX_BYTES`, `REASONING_MAX_BYTES`, `STATEMENT_MAX_BYTES`, `HINTS_MAX_BYTES`,
`PRIOR_FEEDBACK_MAX_BYTES`, `CONTEXT_MAX_TOKENS`, `OUTPUT_MAX_BYTES`,
`OUTPUT_MAX_TOKENS`, `REQUEST_BODY_MAX_BYTES`, `PROVIDER_DEADLINE_MS`,
`REQUEST_DEADLINE_MS`, `POLL_INTERVAL_MS`, `MAX_DISPATCHES_PER_REVISION`,
`MAX_REQUESTS_PER_WINDOW`, `MAX_DISPATCHES_PER_WINDOW`, and window duration.
Output allowance + system/input tokens must fit the provider context window;
provider deadline must leave bounded request/persistence time. Prompt/model
version are required nonblank identifiers. Fail closed for invalid configuration.
Enforce Express body bounds before parsing, string UTF-8 bounds after parsing,
provider-compatible token estimation before dispatch and bounded response reads.
Never silently truncate saved code/reasoning or the exercise; reject with useful
limit feedback. Prior feedback may be deterministically omitted oldest-first
within its explicit budget. Retry quota cannot be reset by a new idempotency key.

All numeric production values remain unset pending verification with the chosen
live provider and application owner. Offline fake profiles use explicit test
values and a fake tokenizer; boundary tests must not be presented as live model
limit validation. This is a production acceptance gate, not a network task here.

## UI, security, and retention

Workspace shows revision, unsaved changes, “Stage n of 3”, request status and
historical markers. First save is required. Pending disables duplicate coach
actions; polling is bounded/backed off and stops at terminal request states.
Refresh restores state from the server. A lost HTTP response reuses the same key;
only an explicit new attempt/recovery generates another key. Save conflicts show
the authoritative revision without silently overwriting draft text.

Keyboard focus and live status/error announcements accompany native labeled
controls. Narrow layouts wrap code/text and preserve access to save/submit.
Submission uses an explicit review/confirmation action showing the saved revision;
unsaved changes must be saved or explicitly discarded before review. No coaching
button auto-submits. Local dirty text survives recoverable errors in memory;
server-saved work survives refresh. Do not add persistent browser storage of code.

Every status/history/content route repeats auth/ownership checks. Use established
same-origin/CSRF defenses for cookie-authenticated mutations. Logs are allowlisted
IDs, stage, revision, prompt/model version, timing, outcome, bounded safe error
code and usage; never cookies, credentials or provider/user bodies. Use metrics
without learner IDs as high-cardinality labels. Store necessary successful
feedback only behind attempt ownership. Data deletion, historical replay
tombstone duration, backups and provider retention need a concrete policy before
real users; this draft does not invent one. A deletion workflow must not break
idempotency by deleting a live key while its call can still complete.

## Implementation sequence and acceptance gate

1. Agree shared contracts/published-hint mapping and required configuration;
   create migrations, repository transactions and fake provider fixtures.
2. Implement admission/commit/save/submission/recovery services and exercise them
   against real local PostgreSQL with explicit concurrency barriers.
3. Wire Express/auth and safe context/output validation; verify no-call denials.
4. Add the single workspace flow and accessibility/error/state tests.
5. Run the RequirementsToTests matrix, review schema migration constraints and
   address the PRD's real-user/live-provider gates separately.

This sequence is a proposal. No steps, migrations, tests or deployments were
implemented or run as part of drafting these documents.
