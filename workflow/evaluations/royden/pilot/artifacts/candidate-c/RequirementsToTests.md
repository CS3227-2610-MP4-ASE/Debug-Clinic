# Requirements to tests — implementation handoff

**Experimental draft; never human-approved.** All tests below are planned, not
executed. Owner IDs refer to the synthetic answers recorded in PRD.md. The
technical protocol and proposed interfaces are in TDD.md.

## Harness and evidence rules

- Vitest unit tests use a deterministic fake AiProvider with captured inputs,
  deferred resolve/reject barriers, scripted malformed output, nullable usage and
  injected clock/deadline. No external network, real keys or SDK calls.
- Supertest exercises Express with real Better Auth database-session fixtures
  and actual local PostgreSQL/Prisma migrations. Use isolated fixture identities
  and transactions/data cleanup; no production data, SQLite or mocked repository
  substitutes for concurrency evidence. Separate DB connections/process-capable
  service instances must share the same constraints.
- Playwright exercises the one workspace with seeded local DB and fake provider.
  Inspect rendered text/accessible state and server records, not only screenshots.
- Use explicit barriers to prove ordering; do not depend on timing sleeps. For
  each service case assert physical fake dispatch count, request state, revision
  counter, StageUsage rows, usage null/value and active-pointer cleanup as relevant.
  Replays and database-only retries must leave dispatch count unchanged.
- Sanitized test artifacts may show IDs/counters/expected codes; raw learner or
  provider payloads must not enter application logs. Capture transport fixtures
  only inside the isolated test harness.

## Traceability matrix

| Test ID / requirement / owner | Layer and setup | Required assertions |
| --- | --- | --- |
| T01 / R01 / COACH-01 | Supertest: no session, expired session, INSTRUCTOR session, other LEARNER. Spy separately on private revision/hint selects and fake dispatch. | 401/403/404 as designed, zero private retrieval, zero calls, no request/stage usage rows. Denial response leaks no existence/content to the wrong learner. |
| T02 / R01,R12 / COACH-01,12 | Supertest: direct GET status/history/attempt using another learner's IDs, including a valid request under the wrong URL attempt. | Ownership and relationship checks deny all paths before feedback/content reads. Session owner cannot read another attempt by guessing IDs. |
| T03 / R02 / COACH-02 | Service/HTTP: unsaved attempt, blank/whitespace reasoning, absent/blank code, missing/unpublished version pin; strict-schema attacks include client stage/model/context/role. | Stable ineligibility/validation errors; no dispatch or advancement; no solution fetch. Proposed nonblank-code interpretation is explicit. |
| T04 / R02,R07 / COACH-02,07 | Capture fake: pin version A; change the published exercise to B after attempt creation; save revision R1 then edit unsaved browser text. | Only A and saved R1 appear in context. B and unsaved text do not. Include stage-appropriate approved hints only. |
| T05 / R03 / COACH-03 | Service + DB: complete 3 valid requests sequentially using different keys. | Stages selected by server are 1,2,3; one durable feedback/StageUsage per stage; count 3. Fourth fresh request gives STAGES_EXHAUSTED, no fourth call. |
| T06 / R03,R11 / COACH-03,11 | Fake provider fails stage 2 after stage 1 succeeds; retry with new key. | Failed call leaves count 1 and no stage-2 ledger; next admission still selects 2. Reusing failure key returns saved failure without redispatch. |
| T07 / R04 / COACH-04 | DB: save changed code only, changed reasoning only, both changed, then identical save. | Each changed save adds one immutable revision with count 0; old content/feedback unchanged. Exact unchanged save is no-op. CAS prevents overwriting a newer revision. |
| T08 / R04 / COACH-04 | Two DB connections: hold R1 call; save R2, optionally complete its stage 1; then release R1 result. | R1 result DISCARDED, no old StageUsage or feedback saved; R2 count/output unaffected. Old callback cannot clear R2 active pointer. |
| T09 / R05 / COACH-05 | Barrier schedule A: submit wins lock, then resolve call. Schedule B: valid coaching commit wins, then submit. | A has terminal submission and zero late advancement; B may retain its pre-submission success. Both reject all fresh saves/coaching afterward with no calls. |
| T10 / R05,R13 / COACH-05,13 | HTTP/UI: submit with stale revision, repeated submit, dirty draft, pending coach. | Stale submit conflicts; same submitted revision replays receipt; dirty work must be saved/discarded before review; explicit submit remains possible during pending call and fences it. No AI-triggered submit. |
| T11 / R06 / COACH-06 | Concurrent identical key requests via separate DB connections; lose first HTTP response; replay pending then finished result. | One admitted request/call, identical request ID, one stage ledger; pending replay 202 and finished replay saved result. No extra quota debit for replay. |
| T12 / R06 / COACH-06 | Reuse key with changed revision, attempt or supersedes ID; use same key under a distinct learner. | Same-learner conflict gives IDEMPOTENCY_CONFLICT, no call; separate learner has independent key namespace and still needs ownership. |
| T13 / R06,R10 / COACH-06,10 | Two different keys race for one current revision; concurrently retry success persistence. | Exactly one active admission, loser REQUEST_IN_PROGRESS; at most one dispatch and one stage charge. DB uniqueness/locking protect this across service instances. |
| T14 / R06 / COACH-06 | Crash simulations: before dispatch intent, after intent before transport, after transport before result persistence, after DB commit before HTTP response. | Known undispatched work fails safely; intent/transport uncertainty becomes UNKNOWN without auto call; committed result replays. Restart/lease recovery never silently redispatches. |
| T15 / R06,R10,R11 / COACH-06,10,11 | Timeout UNKNOWN; ordinary new key; two concurrent explicit superseding retries; original call returns late. | Ordinary key → RECOVERY_REQUIRED; one recovery admitted with a new key and fence; old text discarded; at most one new stage charge. Both actual calls counted, old missing usage null until reported. UI explains possible duplicate provider cost. |
| T16 / R04,R05,R06 / COACH-04,05,06 | Save or submit before an UNKNOWN recovery action; exact historical replay after save/submission. | Recovery cannot revive old revision/terminal attempt. Authorized same-key replay returns historical stored outcome only, without current feedback mutation, call or stage charge. |
| T17 / R07 / COACH-07 | Context fixture has private solution canary, another learner's work, unrelated attempt/version/revision, failed output, approved stage hints and earlier same-revision successes. | Explicit capture contains only allowed pinned/current data. At most two bounded earlier successful responses; no excluded canary or future-stage-only hint. |
| T18 / R07,R08 / COACH-07,08 | Learner code/reasoning contains “ignore instructions”, role changes and tool/solution requests. Inspect provider envelope; return attempted command as plain output. | Learner text stays structured untrusted data; system policy/stage unchanged, no capabilities/tools. Fake proves boundary shape, not live model resistance; no privileged effects occur. |
| T19 / R08 / COACH-08 | Unit + HTTP: non-JSON, wrong stage, extra keys, missing/blank/oversized feedback, nonstring field, oversized streamed body. | INVALID_AI_OUTPUT, bounded reads, no success/StageUsage; safe recoverable status, provider call recorded separately. No raw output in error/logs. |
| T20 / R08,R13 / COACH-08,13 | Playwright: valid text containing script tags, HTML, Markdown links, code-like content and instruction to grade/submit/change role. | Exact text inert, no script/action/navigation, no role/grade/submission change. Advisory message remains visible and instructor decisions stay unchanged. |
| T21 / R09 / COACH-09 | Unit boundary tests: every configured bound at limit and one beyond; invalid/missing/negative/nonfinite config; token reserve relationship; multibyte UTF-8 input. | Valid boundary accepted; excess rejected before dispatch where possible. Invalid config fails startup/feature readiness; no silent code truncation. Fake profile explicitly differs from unverified live limits. |
| T22 / R09,R10 / COACH-09,10 | DB: concurrent cross-attempt requests near learner quota; retries with fresh keys; known pre-dispatch rejection versus dispatched failure. | Atomic quota admission never exceeds allowance. New keys cannot bypass limits. Undispatched reservation may release; dispatched/unknown counts retained. WINDOW/RATE errors include safe recovery timing. |
| T23 / R10 / COACH-10 | Fake reports full usage, partial usage, no usage, provider success with invalid output, known failure, unknown followed by late metadata. | Store reported values/nulls precisely, never synthesize zero. ProviderCalls, StageUsage and replay counters distinguish all cases; request/model/prompt/revision/stage/timing available. Late reconcile is idempotent. |
| T24 / R11 / COACH-11 | Fake timeout, rate limit, quota exhaustion, known provider failure, network outcome unknown; inject bounded DB retry/lost commit acknowledgement. | Stable code/request ID/recovery action, zero failed advancement, no transport retry after intent. DB-only retry uses saved result and ledger uniqueness; no duplicate provider call. |
| T25 / R12 / COACH-12 | Capture app logs/metrics on success, invalid output, auth error, exceptions and timeout using body/credential canaries. | Raw code/reasoning/prompt/AI output/cookies/credentials absent, allowlisted IDs/outcomes present. Metrics avoid learner-ID labels; feedback remains ownership-scoped. |
| T26 / R13 / COACH-13 | Playwright: initial empty workspace, dirty/saved state, pending/double click, failures, refresh, exhausted stages, superseded response. | Clear save requirement, revision/stage/status; duplicate action disabled; lost-response poll reuses key; saved work restored; dirty text preserved on recoverable error; no historical response rendered as current. |
| T27 / R13 / COACH-13 | Playwright keyboard-only and narrow viewport, focus after error, screen-reader status semantics. | All actions labeled/reachable; pending/error announced; wrapping allows access to code and controls; no hidden final-submit action or color-only state. |
| T28 / R14,R15 / COACH-14,15 | Review implementation/test manifest and migration evidence when implementation exists. | All matrix IDs implemented with fixed stack and two roles. No live calls, arbitrary Python, authoring/review replacement or provider deployment added. Real PostgreSQL race evidence exists; no passing claims from mocks alone. |

## Implementation exit evidence and remaining gates

For each test record runner/version, local DB/migration version, fake profile,
scenario/barrier order and pass/fail. Proposed acceptance is every row passing;
the owner-required concurrency cases must use real local DB transactions. No
test files currently exist in this isolated planning fixture and no application
test command has been run, so this document is not execution evidence.

Review the concrete shared-interface integration before coding. Verify actual
provider limits/model/data handling and educational output quality before live
acceptance. Decide retention/deletion and support policy before real users. Tests
T18–T20 establish containment/inertness, not a universal model-safety or solution-
leakage guarantee. There is no production deployment in this plan.
