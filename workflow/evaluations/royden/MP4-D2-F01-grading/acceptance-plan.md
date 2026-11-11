# Grading independent acceptance plan

GRADING-ACCEPT-01 · /root/grading_acceptance · 2026-11-10 SGT

Frozen against `d4b6f29362660b5dd2804889cff247fa295538ed` in
`royden/grading-acceptance`. The package hashes match PACKAGE-APPROVAL-01.
IMPLEMENTATION-AUTH-01 authorizes the approved v1.1 package and planned tests.
The author used that package and the unchanged baseline test seams. No builder
worktree or implementation diff was inspected. The coordinator owns the plan
commit and records its SHA and freeze time. Amendments to this interpretation
need an explicit rationale and product changes need owner approval.

## Observable boundaries and fixture design

- Use real local PostgreSQL, cookies and role-scoped HTTP under
  `/api/v1/{instructor,learner}/submissions`. Lists, detail and compact grade
  reads use GET. Only the instructor grade endpoint accepts PUT with exactly
  `{ score, expectedRevision }`. The opaque list cursor belongs to its list
  scope. Assert strict projection by comparing literal keys and fixtures.
- Use actual dashboard navigation to **Submissions** and **My submissions**.
  Exercise the actual published question and its existing learner workspace.
  Use distinct instructor and learner browser contexts and real authentication
  for the composed journey. Intercepted browser cases use the same public
  responses with independent fixtures and control request ordering and faults.
- Use two instructors, two learners and isolated identities under example.test.
  Include an old owned final with legacy Review, a new workspace final, a final
  removed before grading, a private draft, a second learner's final on the
  owner's question, and a different instructor's final. Keep old/new times and
  answer text distinct. Use multiline code and reasoning with markup as text.
  Track the original public submission snapshot. Use synthetic email, draft
  and legacy review content as denial and projection sentinels.
- Use separate fixtures for competing first writes and corrections, paging,
  rate limits and timing so order-dependent cases cannot contaminate each other.
  Use an explicit guarded loopback test database. Leave the opt-in browser lane
  inert during ordinary collection. Database setup and transport faults may use
  structural seams, and business assertions use public reads.

## Acceptance cases and edges

| Case | Independently fixed observation |
| --- | --- |
| H01 · Baseline and archive reads | Begin with the owner opening the pre-feature final. Expect exact answer, question context, learner display name and grade null even with a Review. A removed final follows the same authorization. Draft and foreign reads are uniform 404. Verify an old final and an additive migration separately from a new fixture. |
| H02 · Queue and pagination | Instructor awaiting uses ascending time and ID, graded descending save time and ID, and learner list descending submitted time and ID. Include a tied 51-row boundary, cursor from a row that changed views, strict query rejection, ownership independent of cursor and numeric grade omitted from learner list. A changed score reorders a fresh graded queue and a same-score save preserves its position. |
| H03/H04 · Score and races | First writes use null, expose score 1 or 10 and set revision 1. Reject malformed and extra fields, string, fractional, zero and eleven scores and invalid revisions. A correction advances revision and saved time without altering the attempt. Matching revision with unchanged score returns unchanged grade. Stale same-score and stale null writes conflict. Two simultaneous writers have exactly one winner for creation and correction. An integer-limit revision cannot be advanced. |
| H05/C03 · Unknown outcomes | Distinguish a known rollback or refusal from an uncertain commit. The browser proxy drains one real successful PUT, destroys its downstream reply and optionally fails one matching reconciliation GET. One PUT in the trace, GET-only **Check grade again**, and an independent learner read establishes the outcome. A PG COMMIT-ack fault covers a different boundary when exercised. |
| H06 · Privacy and transport | Test signed-out, wrong role, foreign, draft, archived and missing targets, mismatched actor, valid preflight and foreign/missing Origin. Compare error codes and write tags with strict projections. Early errors also carry private no-store and Vary Cookie. Successful conditional GET remains 200. Reject malformed, oversized and non-JSON writes and hostile request IDs. Inspect safe error/log projections with the sentinels. |
| H07 · Shared IP | Use the ordinary-mode limiter, one source IP, 11 real authenticated learners and 12 compact GETs each. Ordinary app requests must retain their allowance. Independently exhaust one learner and check a peer and ordinary traffic. Exercise the 600 IP cap and ordinary accounting for rejected polls with clean limiter instances. Record the tested envelope and keep it separate from freshness latency. |
| P01/P02/P05 · User-facing controls | Queue tabs and row links show exact required content and distinguish load failure from empty. Grade field accepts whole-number text only; confirmed score stays visible while input is invalid, unsaved or pending. Verify learner list status without score and both read-only result routes. Verify no grade GET for a draft and a matching read after finalization. |
| P03/P04 · Form recovery | A stale 409 always displays the winner and preserves unsaved input, including when scores match. Only explicit save can use a newly reviewed revision. Definitive refusal allows explicit retry; uncertain reply first reads. A matching read confirms the outcome; a different score or null preserves the unsaved choice. A failed read shows the unconfirmed message and only enables another GET. |
| P06/P07 · Freshness and lifetime | Separate initial failure from stale refresh and retry the correct public read. Controlled clock targets start cadence, one in flight, deadline covering body, hidden suspension, visibility/reconnect and Retry-After. Account or route disposal and authorization loss hide private state and ignore late completions. Same-account transient revalidation retains scoped input, pauses writes and reconciles interrupted writes via GET. Preserve focus across automatic updates. |
| C01/C02 · Compose real journeys | Publish through the existing instructor flow, browse and save/finalize through the learner workspace, then navigate through the instructor queue and save/correct. Read both learner routes with persisted scores. Exercise a distinct final removed before its first grade, verify private result and original snapshot, deny a different learner, and confirm public browse/attempt exclusion. |
| C04 · Real timing | For each live entry point and the archived private result, observe the old state after a healthy grade read and then save the first score and a correction. Record one monotonic clock immediately before forwarding PUT, at upstream committed success, and when the expected score renders. Require conservative pre-forward-to-render within 15 seconds with the learner visible and no manual refresh. Record response-to-render separately and distinguish an inconclusive straddle from a definite miss. |
| R01/R02 · Compatibility | Retain baseline learner attempt/workspace/recovery, publication/archive and relevant session/browser checks. Extend extracted Netlify handler smoke with owner queue/detail/write, learner compact read and one denial while retaining auth and publication smoke. Distinguish source server, extracted handler and static build evidence. |
| M01/M02 · Separate manual evidence | Automated role/name, focus and geometry checks support keyboard and responsive coverage. Record actual contrast and assistive-technology announcements separately. |

## Expected red and verification limits

- The earliest owned final detail request should fail on the unchanged base
  because the grading route is absent, with HTTP 404 instead of the approved
  success. Lists, learner grade and writes also lack public routes. Browser
  cases fail on the missing in-app dashboard entry or grading route/panel.
  The baseline packaged function cannot serve a successful grading smoke.
- Test design does not depend on importing new grading code to establish the
  first red if the baseline HTTP harness can run without it. Cases that depend
  on additive schema or opt-in composition can only report their own failures
  once those prerequisites exist. A missing runtime, database or auth server
  is a harness limitation, not an observed product red.
- Run Node 24, focused integration and Playwright, ordinary collection with
  database and opt-ins unset, then existing regressions and packaged handler.
  Keep real cookies/PG, intercepted faults, real timing, migration rehearsal,
  manual accessibility and CI evidence separate. Report executed counts and
  residual uncovered cases explicitly. The intake exercised here is in-app.
