# Progressive coaching — technical design experimental draft

Status: **not human-approved SDD**; technical design, not an implementation or a test-driven-development report. TASK.md supplies architecture facts; GrillingDecisions.md supplies owner constraints. Proposed interface names, schema, statuses, locking, resource mechanics and TP-RECOVERY require review. No existing product schema or routes were inspected or assumed beyond TASK.md.

## Architecture and ownership

Use the baseline React/MUI → Express → Better Auth database session path on Node 24. PostgreSQL/Prisma owns durable coordination; shared Zod owns runtime contracts. Only the backend AiProvider boundary may contact a provider; its fake is used for all local acceptance. The frontend receives no provider credentials and cannot select a prompt, model or stage. No execution tool, grading/submission tool or AI action dispatcher is introduced. Exactly LEARNER and INSTRUCTOR remain.

Proposed module responsibilities:

| Seam | Responsibility / requested shared interface |
|---|---|
| Session adapter | Existing auth verifies the database session and supplies trusted `{ userId, role }`. Route never trusts body/header role claims. Preserve existing CSRF/origin protections for cookie-authenticated mutation; verify their integration during implementation. |
| Attempt metadata repository | `getAccessMetadata(attemptId)` returns only owner ID, state, current revision ID, published version ID and progress version. It must not eagerly fetch source, reasoning or private exercise fields. |
| Attempt lifecycle transaction | Existing save and submit paths must participate in `withLockedAttempt(attemptId, tx)` with the same row-lock order as coaching. Save creates an immutable revision; submit changes terminal state. No new review workflow is built. |
| Published coaching projection | `getPublishedCoachingProjection(versionId, stage)` returns only published statement and approved hints allowed at that stage. Instructor solutions must be absent from the projection type and query. No complete exercise aggregate is passed to the coach. |
| Coaching coordinator | Authorizes, admits/replays requests, derives stage, reserves resources, constructs context, validates output and conditionally finalizes. Owns application state semantics. |
| AiProvider adapter | `generateCoaching(input, { signal, deadline, maxOutput })` returns untrusted payload plus optional model/usage metadata. No tools. Fake supports barriers, fail/timeout/invalid/late output, nullable usage and invocation inspection without network. |
| Shared contracts | Strict request, success, pending, error, metadata and provider-feedback schemas; bounded configuration-aware validation. Reuse existing contract locations when implementation is authorized. |
| Telemetry adapter | Explicit allowlist of metadata fields; prevent automatic HTTP body/prompt/response/cookie capture and redact nested provider errors. |

These are precise integration requests, not claims that these APIs already exist. Published content approval remains with the instructor's existing workflow. When an approved coaching projection is unavailable, fail safely without AI rather than reading a private solution or implementing authoring.

## Proposed API contracts

All endpoints use the existing session middleware and a server-generated request/correlation ID, including validation and denial responses. Responses never reveal whether another learner's attempt exists. JSON schemas are strict and bounds come from validated configuration; there are no invented provider numeric limits.

### Start or replay

`POST /api/attempts/:attemptId/coaching` with `Idempotency-Key` and JSON:

```text
{
  revisionId: opaque saved revision identifier,
  expectedProgressVersion: nonnegative integer
}
```

The caller supplies an optimistic concurrency expectation, not a stage selection. Reject extra `stage`, source/reasoning, model, prompt, role, user or context fields. The server derives learner ID from session, revision ownership from storage and next stage from the revision's committed progression. The key is an opaque bounded value generated once per logical action, retained across transport retry/reload until a terminal outcome. Key values are not credentials and should not contain user content.

The canonical request fingerprint contains API-contract version, learner ID, attempt ID, revision ID and expected progress version. Persist a uniqueness constraint on `(learnerId, attemptId, idempotencyKey)` and bind it to the immutable fingerprint. This enforces the required identity `(learner, attempt, revision, key)` and catches conflicting key reuse even across revisions. Same fingerprint/key returns the saved receipt/outcome; a mismatch returns IDEMPOTENCY_CONFLICT, never a second call. Do not compare current progression before checking a matching existing request: a successful replay necessarily has an old expected progress version.

Proposed responses:

```text
Success: {
  kind: "success", requestId, attemptId, revisionId, stage: 1|2|3,
  feedback: { observation: string, nextStep: string, reflectionQuestion: string },
  completedStages: 1|2|3, committedProgressVersion, advisory: true
}
Pending: { kind: "pending", requestId, attemptId, revisionId, stage, retryAfter }
Error: { kind: "error", requestId, code, recoveryAction }
```

Server transport metadata may add `replayed` and `isCurrent` outside the immutable saved outcome. They are annotations, not replacements for durable original success/error data. A feedback response's original revision never changes. UI renders current feedback only when its revision matches the currently saved workspace revision and attempt remains open. Old outcomes can be shown as clearly marked history; this is historical retrieval, with no new provider invocation or stage mutation, including after submission. New submitted-attempt coaching is prohibited.

`200` for success/replayed success, `202` while pending; `400` for malformed/oversized API input; `401` for no session; generic `404` for inaccessible attempts (including wrong-role callers); `409` for stale revision/progress, conflicting key, active request, submitted or exhausted state; `422` for missing saved prerequisites/context too large/unavailable; `429` for local rate/quota or mapped provider rate/quota; `502` for safe provider/invalid-output failure; `504` for deadline/unknown outcome. Final error code and recovery action are persisted for admitted terminal requests. Rejected admissions have a correlation ID but no provider operation.

Stable codes proposed: AUTH_REQUIRED, ATTEMPT_UNAVAILABLE, INVALID_REQUEST, SAVE_REQUIRED, REASONING_REQUIRED, PUBLISHED_CONTEXT_UNAVAILABLE, REVISION_CHANGED, PROGRESS_CHANGED, IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS, ATTEMPT_SUBMITTED, STAGES_EXHAUSTED, INPUT_TOO_LARGE, CONTEXT_TOO_LARGE, RATE_LIMITED, QUOTA_EXHAUSTED, INVALID_AI_OUTPUT, PROVIDER_FAILED, DEADLINE_EXCEEDED, OUTCOME_UNKNOWN, RESPONSE_SUPERSEDED. Recovery actions are finite values such as SAVE, REFRESH_STATE, RETRY_LATER, NEW_REQUEST, or NONE; never arbitrary provider text/links.

### Status and workspace

`GET /api/attempts/:attemptId/coaching/requests/:requestId` polls an admitted operation. Scope by authenticated learner + attempt + request; never expose a guessed request belonging elsewhere. Recheck metadata/ownership/state before any content read. Return pending or the persisted terminal outcome, with historical status annotated as above. Polling is bounded by configured interval/deadline and stops at terminal state.

Extend the existing learner attempt response with saved revision ID, dirty/save acknowledgement, progress version, completed stage count, submission state and pending request receipt. This enables reload recovery without persisting content or cookies in browser storage. The existing save integration needs code/reasoning validation and returns new revision/progress state; the existing submit integration needs only the shared transaction seam. Both must reject after final submission.

## Proposed durable model and invariants

Adapt names to existing Prisma conventions during implementation; do not invent a parallel attempt/auth model.

| Record | Required persisted fields / constraints |
|---|---|
| Attempt (existing extension) | owner learner ID, pinned published version ID, OPEN/SUBMITTED, currentRevisionId, progressVersion, activeRequestId plus deadline; owner/version immutable for this flow. |
| AttemptRevision | ID, attempt ID, revision sequence, saved code/reasoning, createdAt, completedStages 0..3. Immutable saved input; only progression metadata changes. Every persisted code/reasoning edit creates a new row and starts at 0. |
| CoachingRequest | ID, learner/attempt/revision/key, fingerprint, reserved stage, expected progress version, prompt/model configuration version, state, created/start/deadline/completed timestamps, terminal safe error or feedback reference. Unique bound key as above. |
| ProviderCall | Request FK, dispatch intent timestamp, dispatch/certainty state, outcome, latency, actual model/version when known, reported usage nullable, safe diagnostic category. Separate from successful stage usage; no raw prompt/output/body. |
| CoachingFeedback | ID, request FK unique, revision FK, stage, validated learner-visible fields. At most one successful feedback per `(revisionId, stage)`. Ownership enforced through attempt FK. |
| Usage / reservation | Durable quota reservations and provider-request accounting, plus stage-success ledger unique on request and revision/stage. Application stage charge increments only with successful feedback commit. Replay performs neither reservation nor charge. |

Core invariants: completedStages is contiguous; the next stage is completedStages + 1 and never greater than 3; only the current open revision can advance; one active operation per attempt; one saved terminal outcome per admitted request; no terminal request can return to pending; feedback/advancement/application stage accounting commit atomically; no call occurs before authorization, eligibility and admission. Provider usage may be null and upstream billing is not exactly once.

Proposed request lifecycle is ADMITTED → DISPATCH_INTENT → IN_FLIGHT → one terminal state: SUCCEEDED, FAILED, UNKNOWN, SUPERSEDED or SUBMITTED. Definite no-dispatch failure can close directly from ADMITTED as FAILED. UNKNOWN is used when dispatch/result cannot be proven, not when cancellation proves nothing was sent. A revision edit can mark an in-flight request invalidated while its guard remains until completion/deadline. Late metadata updates affect only ProviderCall, never a terminal request's stage/result.

Provider request/rate/quota accounting and application stage usage are different units. Failed/unknown upstream attempts may consume provider resources even though zero stages advanced. Do not release a possible-dispatch budget claim as though the provider was definitely not billed. A new revision resets only progression, not attempt/learner/provider request budgets. Exact windows, caps and monetary policies remain validated configuration proposals for review, not owner-supplied provider facts.

## State transitions and coordination algorithm

Use short PostgreSQL transactions with row locks (Prisma transaction + parameterized locking query if necessary), plus uniqueness/check constraints. Lock order is always attempt → request → quota/reservation in deterministic key order. Never hold a database transaction or row lock across a network call. All lifecycle mutation paths must share this protocol; frontend disabling alone cannot enforce it.

1. Parse minimal bounded route/body/header envelope and create request ID; authenticate through Better Auth. Read only access metadata. Deny wrong-role/non-owner before source, feedback, prompts or provider access. Perform a preliminary attempt-state check before any private fetch.
2. Begin admission transaction, lock attempt and recheck ownership/state. Lookup the request key under the lock. If it exists with the same fingerprint, return its receipt/persisted outcome with current-state annotation; if conflicting, fail. Replay is historical retrieval and never initiates coaching, even if the attempt was later submitted. This exception does not authorize a new request after submission.
3. For a new request require OPEN, requested current revision, matching progress version, saved code/nonblank reasoning, published pinned context projection, stages <3, no unexpired active request, and available configured resource reservation. The admission checks precede retrieving the private context payload; saved-prerequisite metadata may be computed during save. Lock/recheck quota atomically across attempts for the same learner where limits require it. Return a stable no-call error otherwise.
4. Compute next stage, insert bound request and quota reservation, set activeRequestId/deadline, commit. Read saved revision and approved projection through restricted repository APIs only after authorization/admission. Build and bound context. Failure before dispatch closes the request safely, releases only unused reservations, and advances nothing.
5. Persist DISPATCH_INTENT/provider-call metadata before invoking the provider. A crash after this intent may mean “possibly sent”; recovery must not assume otherwise. Invoke AiProvider with abort/deadline, no tools, fixed prompt version and output limits. The executing request is not resumed by blindly sending the same provider request on worker/process restart.
6. On response, validate transport envelope, payload bounds and feedback Zod schema. Treat provider data as untrusted. Begin finalization transaction and lock attempt, then request. Require pending/unclosed request, unexpired deadline, OPEN state, identical current revision, expected progress version, expected next stage and matching activeRequestId. If any guard fails, record SUBMITTED/SUPERSEDED/UNKNOWN as appropriate, release active guard/reservations safely, and persist no feedback or stage advancement. Available provider metadata can still be recorded separately.
7. On valid current success, insert feedback, increment revision completedStages and attempt progressVersion, persist terminal success and one application-stage ledger event, finalize provider metadata/reservations and clear active guard **in one transaction**. Unique constraints and guarded updates prevent duplicates even after repeated callbacks. Return the durable outcome only after commit.
8. On definite failure/invalid output/deadline, finalize a stable error once with no advancement/application-stage charge. Keep known provider usage and nullable unknown fields. Clear only the matching active guard so an old operation cannot clear a newer operation's guard. If commit result itself is unknown, reconnect and look up the durable request before responding or attempting further state changes; never call AI again to resolve a database acknowledgement loss.

### Save, submit and race outcomes

Save locks the same attempt, rejects SUBMITTED, creates a new immutable revision for edited saved code/reasoning, sets completedStages=0, and increments progressVersion. It may mark the active request invalidated but retains its active guard until completion or its deadline; best-effort cancellation does not prove the provider stopped. This prevents overlapping provider calls on a single attempt while allowing the learner to save edits. The next UI coaching action waits for recovery of the guard; it never uses old feedback as current.

Submit locks the same attempt, rejects conflicting lifecycle state, and atomically marks SUBMITTED. It does not wait for AI, auto-submit via feedback, or create new review functionality. If finalization wins the lock first, feedback commits and submission follows. If submission wins, finalization's OPEN guard fails and no feedback/progression commits. Save/finalization has the analogous ordering: a committed old-revision success may exist historically, but a subsequent save resets the new revision.

Two distinct keys concurrently admitted for the same attempt serialize: one obtains active guard, the other gets REQUEST_IN_PROGRESS with zero dispatch. Same key concurrent calls share one receipt. After first success, a fresh request with old expectedProgressVersion fails instead of accidentally consuming the next stage. Distinct attempts still share applicable learner quota locks.

### TP-RECOVERY: deadline, crash and uncertain upstream result

This explicit policy is a technical proposal required by COACH-06; the oracle did not approve its mechanics.

- No automatic resend after a send may have occurred. Same-key retry/poll returns pending or the saved result, never another provider dispatch. Transport retries are allowed only when the adapter proves no dispatch occurred, within configured retry/deadline limits; otherwise classify uncertain.
- On expiry, a request-driven recovery path (and an optional local recovery worker through the same transaction API) locks the attempt/request, closes it UNKNOWN, clears the matching guard, preserves possible-dispatch accounting and records null unavailable usage. A process crash therefore cannot strand an attempt indefinitely. No new queue platform is required for this draft.
- Deadline closure is terminal. A delayed provider result may update safe provider outcome/usage metadata once known, but cannot store current feedback, advance progression or revive the request. A newer operation's guard cannot be touched.
- UI displays “The previous request's outcome is unknown. Refresh the saved state before trying again; a new request may use additional provider resources.” After refresh and deadline recovery, deliberate retry creates a **new key** and is admitted against the latest revision/progress and quotas. It is a separately accounted provider attempt, never a claim of exactly-once upstream billing.
- If a local transaction was committed but HTTP acknowledgement was lost, key replay returns the persisted success and does not charge or advance again. If it did not commit, terminal recovery remains no-advancement; a known provider success alone is not application success.

## Context and output boundaries

Build an explicit typed data object from the pinned published statement, stage-approved hints, current immutable saved code/reasoning, and relevant persisted feedback **from the same revision**. Same-revision feedback is ordered by stage and bounded by count/bytes; omit oldest optional feedback first under the context budget. Do not silently truncate code/reasoning or the mandatory exercise/hint projection: return INPUT_TOO_LARGE/CONTEXT_TOO_LARGE if mandatory content exceeds configured caps. Approved-hint selection must exclude full solutions and stage-inappropriate hints by projection, not by asking the model to ignore them.

Provider prompt separates versioned trusted coaching instructions from serialized untrusted learner data. Learner text is labelled data and never interpolated into an instruction role. Use no browsing, code execution, privileged callbacks or tools. Validate the full assembled context against configured byte/token budget and reserve output budget before dispatch. Any token estimator is an estimate documented in the adapter; provider-specific context/output numeric limits must be verified before production.

Proposed feedback schema has exactly `observation`, `nextStep`, `reflectionQuestion`, each bounded, nonblank plain strings, with unknown fields rejected. The server attaches stage, revision and advisory label. Render using ordinary React text children; never `dangerouslySetInnerHTML`, HTML/Markdown execution, automatic URL fetching, or actions derived from feedback. Schema validation proves shape, size and inertness, not that a model will never suggest a solution. Prompt policy plus offline adversarial fixtures and later live-provider evaluation are required for pedagogical quality; no unverified quality claim is an acceptance result here.

## Limits, failures, privacy and UI

Validate configuration at startup: saved code/reasoning bytes/chars, body/key bytes, context budget/estimator mode, prior-feedback count/bytes, output total/per-field bounds, provider request/rate/quota windows, deadline/lease relationship, status-poll interval and bounded retry policy. Quantities are positive finite integers where applicable; retry count may be zero. Deadline/lease/poll relationships are validated consistently, and finite provider timeout cannot exceed operation deadline. Invalid/missing configuration fails closed rather than creating unbounded calls. Three stages is a product invariant, not a configurable limit. No production numbers are asserted; small test fixture limits are explicitly synthetic.

Map provider exceptions to safe stable categories and request IDs. Never surface raw upstream body/stack, secrets or prompt echoes. Rate/quota/deadline errors leave work and stage unchanged; retry instructions distinguish waiting for quota, saving revision, refreshing stale state and deliberately making a new logical request. Browser disconnect does not itself prove provider cancellation or reset budget. A background request outcome remains recoverable through the receipt/key.

Persist necessary learner-visible feedback under attempt ownership only; do not retain a full prompt or raw output alongside it. Metadata includes request identity (use internal IDs in restricted operational logs), stage/revision, prompt/model versions, latency and provider outcome/available usage. Null remains null, never zero fabricated as a cost claim. Audit every telemetry path including request logging, validation errors, provider exception logging and browser analytics: no raw code/reasoning/prompts/AI bodies/cookies/credentials. Retention/deletion periods, cascading deletion of attempts/revisions/feedback/request metadata, backups and provider data policy are explicit pre-real-user decisions, not silently assigned durations.

UI keeps local unsaved state independent of authoritative saved metadata. Save acknowledgement changes revision/stage display; failed save does not claim a new revision. Any response whose revision does not match the saved workspace is marked historical and cannot replace current feedback. Request status uses an accessible live region, pending disables duplicates, focus is preserved across responses, empty/error/exhausted/submitted states explain the next permitted action. Status refresh never overwrites unsaved learner edits. Final submission remains an explicit existing product action.

## Implementation sequence and review gates

When separately authorized: agree shared projections/contracts and lifecycle lock seam; add migration/constraints; build coordinator with offline provider and metadata-only authorization tests; integrate save/submit and deadline recovery; add workspace states; execute RequirementsToTests.md. Do not introduce authoring/review features to satisfy a missing projection: request the existing owner integration or return a safe unavailable state.

The design is complete enough to review and test offline, but is not accepted or implemented. Review fingerprint/replay historical semantics, shared save/submit serialization, quota units and TP-RECOVERY with the owner before implementation. Decide retention/deletion before real users. Verify live provider capabilities/numeric limits and operational configuration before production acceptance. All such verification remains explicitly unperformed in this synthetic, no-network task.
