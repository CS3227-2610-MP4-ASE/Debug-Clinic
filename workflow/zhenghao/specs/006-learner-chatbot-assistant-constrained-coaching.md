# ZH-CHAT-01 — constrained-coaching amendment

Status: owner scope direction recorded; independent package review passed.
Owner package approval and implementation authorization pending. Planning only.
Date: 7 November 2026, Asia/Singapore.
Baseline application: `b4878edeb0027e128a76d24820534efb34c1686c`.
Branch: `zh/learner-chatbot-assistant`; existing checkout and conversations.

## Scope and authority

The owner selected “Constrained coaching: AI selects reviewed response templates”
in the coordinator's redesign question. That question explicitly authorized
planning only and no additional provider calls. This amendment and its standalone
implementation packet require independent review, owner package approval and
separate implementation authorization before any application changes.

The original free-text design failed independent live acceptance after two
correction rounds. Preserve `security.md`, `security-recheck.md`, `security-final.md`
and their pinned revisions. All twelve authorized generation calls were used:
5,070 provider tokens, separate from development-agent usage. This design does
not reopen that allowance or erase the failed evidence. The original release
gate remains blocked until a newly approved design is implemented and verified.

This amendment supersedes the generated-prose response design and its heuristic
screen under CHAT-03/12/13. CHAT-01/02/04–11 remain in force, including private
ownership, consent, snapshot identity, successful-only progression, quotas,
duplicate reconciliation, final read-only behavior, retention and floating UI.
CHAT-14 includes documenting this change and the failed original design honestly.
No automatic editing, execution, saving, submission, external retrieval or
instructor workflow change is introduced.

## Response contract and data flow

The application still uses the configured backend-only NUS SoCLaaS model. The
coordinator verified its basic `model`/`messages` envelope against the public
official OpenAPI on 7 November, recorded in decision checkpoint 004. This is
protocol evidence, not model-selection quality; DocHub remains login-protected.
The envelope, nonstreamed transport, deadlines, byte limits and at-most-two
transport attempts remain unchanged. Do not add
undocumented response-format capabilities or another validator-model call.

1. Backend assembles authorized exercise/context/history and the current level's
   allowed coaching moves. Untrusted material remains data. Existing exact
   serialized-message sizing and oldest-complete-exchange eviction apply.
2. Model content must be one JSON object:
   `{ "schemaVersion": "coaching-selection-v1", "move": "TRACE_VALUES" }`.
   Maximum 256 UTF-16 units before JSON parsing, within existing byte limits.
   The schema is strict: no level, text, code, explanation, parameters, URLs,
   alternate encodings, extra keys or arbitrary strings. The move is an enum.
3. Internal provider result contains this selection plus normalized nullable
   usage and bounded attempt metadata. It contains no deliverable message text.
   Provider decoding validates the wire object; the service independently
   validates the internal result and checks the selected move against its
   authoritative target level.
4. The service renders an immutable, checked-in English catalogue entry, never
   provider text. No user/model/context string is interpolated. The complete
   rendered reply must equal an allowed catalogue entry byte for byte and fit
   the existing 2,000-unit reply cap. Only that rendered text may be persisted,
   returned through send/replay/reconcile/history, or supplied as assistant history.
5. Invalid selections fail safely without a message or progression change.
   Preserve learner edits/draft, safe errors, reconciliation and quota accounting.
   No automatic second generation to repair malformed content. Transient
   transport retries retain their existing bound and meaning.

The public chat API continues returning ordinary `message`/history text with
unchanged request/response shapes. A selection is not a command or tool call.
No model-selected value is evaluated or used as a path, URL, query or template.
Fake providers return valid deterministic selections, establishing orchestration
only. Existing instructor generation and disabled legacy hint-preview remain as-is.

Remove the free-text correction detector and its private canonical-solution
query from the delivery path; the new output invariant replaces that detector.
Do not expand private model context. Ordinary logs contain neither selection
payloads nor conversation/code/provider bodies. Available usage on rejected
outputs should be retained through safe normalized metadata, never raw errors.

## Proposed catalogue: exact learner-visible replies

The owner reviews these texts as part of the package. Each move is available
only at the indicated level; the model cannot promote itself. No template slots
or runtime catalogue editing are allowed in this first version.

| Level | Move                    | Reply                                                                                                                                                                                                                                         |
| ----- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | TRACE_VALUES            | Choose a small valid case. Write the variable values after each executed line. Where does the trace first differ from what you expected?                                                                                                      |
| 1     | COMPARE_EXPECTED        | Write the expected result for one case, then trace the current code by hand. Which intermediate step first disagrees with that result?                                                                                                        |
| 1     | TRACE_SMALL_CASE        | Compare the smallest valid case with one ordinary case. What changes in the execution path, and where does the mismatch first appear?                                                                                                         |
| 2     | INSPECT_BOUNDARY        | A useful focus is the boundary of the values being processed. Trace the first and last included positions and compare them with the intended behavior.                                                                                        |
| 2     | INSPECT_ACCUMULATOR     | A useful focus is how the running value changes. Record its value before and after every update. Does each update preserve the contribution of earlier values?                                                                                |
| 2     | INSPECT_BRANCH          | A useful focus is the branch condition. Evaluate it by hand for a boundary case and record which path runs. Does that path match the intended behavior?                                                                                       |
| 2     | INSPECT_RETURN          | A useful focus is the returned value. Trace what has been computed immediately before the return, then compare that value with what the function actually returns.                                                                            |
| 2     | INSPECT_MUTATION        | A useful focus is whether a value changes while another part of the code still uses it. Record each change and the next place that reads the value.                                                                                           |
| 3     | SELECTION_TRACE_GUIDE   | Draw a short collection as labeled positions. Mark every position selected by the current expression, then trace the operation that receives those values. Compare the marked positions with the intended behavior before proposing a change. |
| 3     | ACCUMULATOR_TRACE_GUIDE | Make a table with one row per update. Include the old running value, the current item and the resulting running value. Use the table to explain whether earlier contributions are retained; propose and test your own change.                 |
| 3     | BRANCH_TRACE_GUIDE      | Make a decision table for a boundary case and nearby valid cases. Record the condition truth value, the chosen path and the resulting value. Explain the first path that disagrees with the expected behavior.                                |
| 3     | LOOP_TRACE_GUIDE        | Make a table with one row per iteration. Record which item is selected and which value changes. Include the first and last iterations, then compare the processed items with the intended set.                                                |
| 3     | BUILD_CASE_TABLE        | Make a table with an ordinary case, a boundary case and the smallest valid case. Record expected and actual results, then add the first intermediate state where each failing case differs.                                                   |

Level 3 now supplies detailed tracing procedures rather than fixed Python
expressions. This revision removes the concrete range/slice examples that the
independent reviewer showed could themselves be exact tiny-exercise corrections.
Do not reintroduce executable snippets or replacement expressions without new
catalogue review. Independent collision fixtures cover all entries against
tiny range, slice, assignment and branch corrections as well as the two known
bugs; review cumulative combinations, not just single replies.

Independent review must assess the entire catalogue, accuracy,
relevance to the two known bugs and other Python debugging cases, and combinations
across a conversation. A catalogue can still be poorly selected or accidentally
too revealing for a particular tiny exercise. It does not establish universal
pedagogical safety or prevent every theoretical covert encoding. Catalogue
changes require review and a new version; do not silently add generated slots.

The existing panel should briefly set the expectation that it offers guided
debugging steps and tracing procedures. Preserve its interaction/design; any copy change
uses Impeccable in the existing implementation conversation. No new UI workflow.

## Versioning, legacy content and privacy

Add nullable `coachingPolicyVersion` to the conversation and nullable
`promptVersion`/`catalogueVersion` to request records in one additive migration.
Use server constants, not client/model fields. New requests bind the exact prompt
and catalogue version, including failed requests when normalized usage is known.
Do not persist a selected move as long-lived content-derived telemetry.

Before any projection, replay, prompt assembly or send, enforce the active
conversation policy under the established transaction/lock rules. Only null or
explicitly allowlisted legacy versions may be upgraded; never compare arbitrary
version strings to infer compatibility. Quarantine uses the existing content-
deletion/generation-invalidation mechanism: automatically delete ALL earlier
learner and assistant messages and shared snapshots on access, including benign
messages and chats attached to final read-only work. Invalidate old replies and
pending eligibility; retain unlocked level, successful-level eligibility and
minimal quota/usage state, then set the new policy version. No model call or
Attempt write occurs. An unknown or newer policy version fails safely without
reading chat content, mutation or provider dispatch; rollback must not downgrade
or delete newer content.
Old request IDs cannot replay legacy prose or silently dispatch a new generation.
Recheck version/generation at finalization. GET, duplicate POST and reconcile
must all share this rule. A policy upgrade does not renew the inactivity clock.
Every assistant projection also verifies matching current request versions and
exact catalogue membership at its stored level. Bound these checks to the
existing page/history limits; invalid rows cannot become a secondary raw-text
reply. Test mixed/legacy request rows and inconsistent saved text explicitly.

This explicitly changes pre-release history compatibility: earlier development
chat content is removed on upgrade, rather than serving unsafe old advice. Note
the upgrade in DG/UG. It does not delete saved attempts, editor work, final
submissions, instructor content or other users' records. Normal Clear and expiry
continue deleting chat content while retaining approved minimal progression/
usage metadata. All migration verification uses disposable loopback PostgreSQL.

Quarantine cannot recall replies already received by an open old browser. Old
and new backend instances must not serve this feature concurrently. Before any
separately authorized deployment/promotion, the operator must drain/stop old
instances, deploy the matching backend/frontend, require workspace reload (or a
separately authorized session cutover), and verify the new service boundary.
Rollback to an older binary requires a reviewed compatibility procedure; it
cannot silently resume serving old chat content. This is a release runbook/test
requirement, not authorization to deploy, revoke sessions or alter remote systems.
Local testing simulates old pending calls/clients; deployed cutover stays an
explicit separate evidence gap until actually performed.

## Amendment acceptance and verification owners

| ID    | Observable requirement                                                                                                                                                                                                                                | Verification owner                      |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| CC-01 | Only a strict, current-version, level-allowed enum selection produces a reply; extra text/keys, encodings, invalid IDs/levels and malformed content produce no reply or progression.                                                                  | Independent security and testing        |
| CC-02 | Every delivered/persisted/replayed assistant reply equals a reviewed catalogue entry; arbitrary provider fields cannot flow to these paths. Enumerate all moves and levels, including injected provider substitutes.                                  | Independent security                    |
| CC-03 | All catalogue entries are accurate and educationally appropriate; ordinary request fixtures receive useful relevant coaching at each of three levels, with analogous cases kept distinct from exact exercise corrections.                             | Independent planning review and testing |
| CC-04 | Legacy encoded/plaintext replies and in-flight legacy requests cannot survive an upgrade through history, duplicate POST, reconciliation or late finalization; upgrade preserves unrelated work, quotas and progression and does not renew retention. | Independent PG/security tests           |
| CC-05 | Existing authentication, ownership, category withdrawal, snapshots, quotas, replay, failure recovery, final state, cleanup and floating UI requirements remain intact.                                                                                | Independent testing                     |
| CC-06 | One generation per user request, existing retry/deadline/context bounds, version metadata and nullable normalized usage also hold for rejection paths; no raw payload logging.                                                                        | Independent provider/security tests     |
| CC-07 | Evidence and DG/UG/reflection distinguish the failed free-text design, the newly tested boundary, constrained coaching limitations and any missing live/CI/deployment evidence.                                                                       | Documentation and coordinator           |

Keep old security fixtures/reports pinned as historical evidence of the old
contract. New independent fixtures test the new selection seam; do not rewrite
old assertions to manufacture green results or misreport them as unchanged
new-contract acceptance. Prove known passing and failing grader outcomes and
include valid ordinary selections alongside malicious raw/encoded output.

Run relevant focused checks, then the applicable existing unit/API, disposable
PG integration, Playwright, format/lint/typecheck/declaration/production builds,
built frontend and packaged API/cleanup checks. A static build is not packaged
runtime evidence. Test real-cookie/fake-provider browser composition and preserve
auth/instructor/local Python behavior. Respect existing recovery and cleanup rules.

No new live allowance is granted here. Proposed later evidence, subject to
separate owner authorization: six logical generations, at most twelve transport
attempts, one ten-minute window, same configured endpoint/model and synthetic
8,000-unit context/2,000-unit reply ceilings. Three benign cases cover the three
levels; three adversarial cases cover encoded answer, extraction and poisoned
context across the two known bugs. Require 3/3 benign delivered replies with
at least 8/10 on the established rubric and no observed unauthorized disclosure.
Invalid attack output rejection is not counted as useful coaching. Preserve
the old twelve-call ledger and record a separate explicitly authorized allowance.

## Delivery allocation and budgets

Full security/testing closure requires separately authorized actual-service
model-selection evaluation meeting the benign and disclosure criteria above.
Deterministic catalogue acceptance alone cannot establish that the configured
model chooses useful guidance. If authorization is withheld, or that evaluation
fails, report boundary checks separately and keep live-ready/useful-coaching
acceptance pending. Only an explicit owner decision accepting that specific
unverified evidence gap may change the release gate; do not infer a waiver from
scope selection, valid JSON, rejected attacks or a finite template catalogue.
An executed evaluation that fails is an observed failure, not an unverified
evidence gap. Any owner decision changing that gate must acknowledge the actual
outcome; never relabel a failed evaluation as merely unrun.

Reuse the original coordinator, Luna implementation, Sol/high security, Sol/high
testing and Sol/high documentation conversations. Reuse the existing internal
Sol/high planning reviewer. No sixth user-facing conversation. The original
security cycle stays failed; any new cycle needs explicit implementation approval.

Proposed incremental soft estimates: planning 1m tokens/20 minutes; implementation
3m/45 minutes; security 2m/30 minutes; testing 3m/60 minutes; documentation 1m/25
minutes. These include repeated/cached context and are not billing predictions.
Preserve original estimates and measured overruns; do not reset canonical totals.
Keep stable stage IDs and use `constrained-v1-*` run IDs plus timestamped unique
response evidence for phase attribution. Review estimates at actual checkpoints.

Within a newly authorized cycle, retain at most three meaningful repairs per
failure and two targeted source-correction/re-review rounds. Escalate unresolved
limits; do not silently restart them. Batch bounded reads and sequential event
commands, retain yielded process IDs, and avoid full reruns for prose-only edits.
Do not infer raw token or cost savings from the cheaper implementation model.

After independent package review, present the concrete package for owner approval,
separate source implementation authorization and any desired new live allowance.
No source edit, provider call, push or release readiness follows from scope
selection alone. Concern-separated local commits and the eventual authorized
feature-branch push remain conditional on passing the full delivery gates.
