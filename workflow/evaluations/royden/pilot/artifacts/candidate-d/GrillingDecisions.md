# Grilling decisions — experimental draft

This is a synthetic planning interview and experimental draft, **not human-approved SDD**. TASK.md supplies the baseline; only answers returned by `python ask_owner.py` count as owner decisions. Recommendations and technical proposals are identified separately. No application implementation is authorized by this record.

The explicitly invoked `grill-me` skill delegates to `grilling`. We work the decision tree in prerequisite-ordered rounds. The assigned task substitutes the deterministic synthetic owner for a human interview and explicitly permits draft artifacts. The skill's human shared-understanding gate is not satisfied and these documents must never be treated as approved SDD.

## Baseline facts from TASK.md

DebugClinic needs attempt-aware progressive AI coaching for saved Python debugging attempts, simple UI, instructor authority, context/resource accounting. Existing architecture: React/MUI browser → Express → Better Auth database session; PostgreSQL/Prisma; shared Zod; backend AiProvider/offline fake; Vitest/Supertest/Playwright; Node 24. Exactly LEARNER and INSTRUCTOR. Arbitrary Python execution is absent. Product input shapes are undecided. No application code or network calls are allowed.

## Topic inventory

The public `--list` interface returned: access, eligibility, progression, revision, submission, retry, context, output, limits, accounting, failure, privacy, ui, testing, scope. Topic names alone do not establish decisions.

## Round 1 — independent roots: scope and authority

Frontier: product boundaries and authority/ownership. Submission shape, eligibility, progression and operational choices depend on these roots and are deferred.

❓ **Q1 — Scope:** What coaching experience belongs in this feature, and what capabilities are excluded?

➡️ Recommendation: coaching on saved learner Python debugging attempts only, with progressive guidance and no code execution or open-ended chat.

❓ **Q2 — Authority and access:** Who can request coaching, inspect attempts, and control whether AI assistance is available?

➡️ Recommendation: learners coach only their own attempts; instructors retain assignment policy authority. Derive identity and role from the authenticated server session.

### Simulated owner answers

Q1 / COACH-15: This feature does not implement authoring, instructor review, Python execution, a new identity provider or production deployment. Reuse the existing contracts, auth and AI boundary; propose precise shared-interface requests.

Q2 / COACH-01: Only the learner owning the attempt may request coaching. Instructors cannot use this learner endpoint. Check session, ownership, and attempt state before retrieving private content or calling AI.

Settled: product exclusions and learner endpoint authorization. Instructor policy and eligible attempt states remain unsettled and belong to the next frontier. The recommendation about open-ended chat remains a proposal until relevant owner evidence is returned.

## Round 2 — saved input, policy, and data boundaries

Prerequisites: coaching is an owner-only learner operation; authoring/review/execution are excluded.

❓ **Q3 — Saved submission:** What must a saved debugging attempt contain, and what input should a coaching request accept?

➡️ Recommendation: coach a persisted, immutable revision identified by the server; reject caller-supplied substitutes for saved source and observations.

❓ **Q4 — Eligibility and instructor authority:** Which attempt states and instructor settings allow coaching, and when must they be checked?

➡️ Recommendation: enforce instructor policy and state eligibility on every request, before private content access or provider calls.

❓ **Q5 — Privacy:** Which private data can enter coaching, where may it be retained, and what may logs contain?

➡️ Recommendation: send the minimum eligible revision context, exclude secrets and instructor-only material, and avoid raw source in operational logs.

### Simulated owner answers

Q3 / COACH-05: A final submission is terminal for this attempt. No later edits or coaching. Serialize the coaching persistence decision against submission so a late response cannot advance a submitted attempt.

Q4 / COACH-02: Attempts are pinned to a published exercise version. Requests require a saved code proposal and nonblank reasoning. Instructor private solutions and other learners' work are never context.

Q5 / COACH-12: Logs/metrics omit raw learner code, reasoning, full prompts, AI response bodies, cookies and credentials. Store necessary learner-visible feedback under attempt ownership; define retention/deletion as an explicit follow-up decision before real users.

Settled: terminal submission, published-version pinning, saved code/reasoning prerequisites, context exclusions, safe telemetry and ownership of retained feedback. The submission topic clarifies a terminal transition rather than a complete input shape; precise contracts must therefore be technical proposals, not invented owner statements. Retention/deletion is explicitly deferred by the owner as a pre-real-user decision.

## Round 3 — progression and resource policy

Prerequisites: saved attempts have code/reasoning, published-version pinning, and a terminal final-submission boundary.

❓ **Q6 — Progression:** What are the coaching stages, when does a stage advance, and when is the ladder exhausted?

➡️ Recommendation: use a fixed, server-owned ladder; advance only for persisted valid feedback, without giving a complete solution.

❓ **Q7 — Limits:** What hard payload, request, concurrency, and provider limits define the draft's resource envelope?

➡️ Recommendation: one active generation per attempt, explicit bounded context and output, and a per-attempt budget checked before provider invocation.

### Simulated owner answers

Q6 / COACH-03: Exactly three ordered stages. The server chooses the next stage, never the browser. A successful persisted response advances progression; failed calls do not. After stage 3, return STAGES_EXHAUSTED without calling AI.

Q7 / COACH-09: Use configured validated input/context/output and request/deadline/retry limits. Verify live provider numeric limits before production acceptance; do not invent them. Fake provider tests remain deterministic and offline.

Settled: three server-owned stages, advancement only on persisted success, terminal exhaustion without AI. Limit categories are mandatory; production numbers are explicitly unverified, so the technical draft must use named validated configuration rather than invented provider limits.

## Round 4 — stage/revision semantics, feedback, and operation outcomes

Prerequisites: three stages, persisted-success advancement, bounded configured operation, terminal submission.

❓ **Q8 — Revision semantics:** What happens to attempt identity, coaching history, progression, and pending feedback when the learner edits saved work?

➡️ Recommendation: identify immutable saved revisions, tie feedback to its revision, and never apply late feedback silently to a different revision.

❓ **Q9 — Output contract:** What structured feedback may each of the three stages contain, and what responses must be rejected?

➡️ Recommendation: a bounded shared schema, stage-specific guidance, and no complete solution or direct execution request.

❓ **Q10 — Accounting:** What is counted or reserved, and what happens if a call fails, is retried, or finishes after the attempt becomes ineligible?

➡️ Recommendation: durable per-attempt logical request accounting with atomic reservations; distinguish budget use from successful stage advancement.

❓ **Q11 — Failure:** How should timeout, invalid provider output, upstream failure, and late results affect learner state and retryability?

➡️ Recommendation: stable safe errors, no progress advancement on failure, and no stale feedback applied after terminal submission.

### Simulated owner answers

Q8 / COACH-04: Every saved code/reasoning edit creates a new attempt revision and resets hint progression. An in-flight response for an old revision must not become current or advance the new revision.

Q9 / COACH-08: AI output is advisory, plain inert text with a bounded validated structure. It cannot publish exercises, grade, submit, execute code, change roles, or overwrite an instructor decision. Reject malformed output safely.

Q10 / COACH-10: Record request identity, prompt/model version, stage/revision, latency, provider outcome and reported usage when available; unavailable usage stays null. Distinguish provider calls from application stages and idempotent replay. Never claim free or exactly-once upstream billing after an uncertain network outcome.

Q11 / COACH-11: Timeouts, rate limits, quota exhaustion, invalid AI output and provider failures produce stable recoverable errors with request IDs. No advancement on failure. Disable duplicate UI actions while pending, preserve user work, show actionable retry/state recovery.

Settled: edit-driven revision reset, stale-result isolation, inert advisory structured output, separate provider/accounting/stage concepts, null unknown usage, safe recoverable error and UI behavior. Semantic stage names and detailed UI labels remain technical proposals; the owner has specified three ordered stages without pedagogical names.

## Round 5 — context reconstruction, retry identity, and UI

Prerequisites: immutable revisions reset progression, persisted-success advancement, safe feedback structure, recoverable failure taxonomy and accounting separation.

❓ **Q12 — Context:** How should context be rebuilt after edits, and can previous hints influence the new revision?

➡️ Recommendation: build context only on the server from the pinned exercise and requested current revision, with a bounded allowlist of relevant persisted hints and no instructor solutions.

❓ **Q13 — Retry and concurrency:** How should repeated clicks, network retries, overlapping tabs, and stale expected revision/stage be resolved?

➡️ Recommendation: a client-generated request key plus expected revision and stage, durable replay, and database-enforced conflict checks before provider calls and persistence.

❓ **Q14 — UI:** What is the smallest learner interaction surface and what must remain visible during failure or stale-state recovery?

➡️ Recommendation: one coaching action with a stage indicator, plain feedback, progress/error state, and deliberate refresh/retry while preserving edits.

### Simulated owner answers

Q12 / COACH-07: Context contains the published exercise statement, approved hints appropriate to the server-selected stage, the current saved code/reasoning, and only bounded relevant prior feedback. Learner text is untrusted data, not instructions. Complete solutions and unrelated records are excluded.

Q13 / COACH-06: Request identity includes learner, attempt, revision and idempotency key. Reusing a key for the same request returns its saved outcome; conflicting reuse fails. Concurrent requests must not double-advance or double-charge application usage. An upstream outcome that is unknown needs an explicit retry/recovery policy.

Q14 / COACH-13: One learner attempt workspace shows saved revision, stage and request status; save before coaching; review/final submission remains explicit. Support keyboard use, mobile layout, empty/error/pending states and clear advisory copy.

Settled: context allowlist, untrusted-data boundary, replay identity and conflict semantics, no duplicate application accounting/advancement, one accessible workspace. Upstream uncertainty now exposes a dependent recovery-policy decision; ask it before final test/handoff coverage.

## Round 6 — recovery when provider outcome is unknown

Prerequisites: provider calls and application stage accounting differ; key replay is durable; uncertain upstream billing cannot be claimed exactly once.

❓ **Q15 — Unknown outcome recovery:** May a timed-out or interrupted request be automatically reissued upstream? What should replay and a deliberate retry do if the original provider outcome cannot be proven?

➡️ Recommendation: never automatically resend after dispatch is uncertain. Persist UNKNOWN and replay the same recoverable outcome for that key, with no progression/application stage charge. A deliberate new-key retry after the deadline is a new provider attempt, with explicit copy that the previous provider outcome/usage may be unknown. Reject delayed completion from a closed request. Record each provider attempt separately and never promise exactly-once upstream billing.

### Simulated owner answers

The public oracle repeated COACH-06, COACH-10 and COACH-11 verbatim (see rounds 4–5). It requires an explicit unknown-outcome policy but does not select the recommended mechanics. Accordingly the draft adopts Q15's recommendation as **technical proposal TP-RECOVERY**, not an owner-approved decision. It satisfies the returned constraints without asserting unknown billing is free. The document review gate must explicitly include this proposal.

## Round 7 — acceptance evidence

Prerequisites: all functional and operational branches have owner constraints, including the requirement to specify uncertain-outcome recovery. TP-RECOVERY supplies reviewable draft mechanics.

❓ **Q16 — Acceptance:** Which evidence is required to accept the feature, including concurrency, privacy, deterministic offline verification, and live-provider checks?

➡️ Recommendation: contract/unit tests plus real database integration and browser tests using the offline provider; race tests must verify both persistent state and provider call counts. Gate production on verified live-provider limits and retention/deletion policy.

### Simulated owner answers

Q16 / COACH-14: Cover owner/wrong-role denial, no-call-before-auth, stage order/exhaustion, saved revision/context exclusion, stale responses, concurrent/idempotent requests, final-submission races, failures, invalid output, inert display and missing usage with fake transport plus real local database tests.

## Closure and evidence boundaries

All 15 listed oracle topics were queried. Rounds were prerequisite-ordered: roots → saved/state/privacy → progression/limits → revision/output/accounting/failure → context/retry/UI → uncertain-outcome policy → acceptance. Re-querying retry/accounting/failure exposed no additional owner decision. There is no unvisited in-scope topic frontier.

Owner evidence is exactly COACH-01 through COACH-15 recorded above; this interview does not manufacture approval of recommendations. The technical design chooses explicit draft mechanics for interfaces, stage wording, database locking, quota reservations, error codes and TP-RECOVERY. Those are reviewable proposals constrained by owner answers. The owner explicitly leaves numeric live-provider verification and retention/deletion for follow-up before production/real users. Their absence does not prevent this synthetic draft, but prevents production acceptance.

The skill's requirement to wait for confirmation of shared understanding remains a human review gate: the synthetic oracle supplies constraints, not human confirmation. Authorized planning artifacts are produced as experimental drafts only; implementation and production are outside this task.
