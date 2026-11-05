# MP4-D2-F01 independent acceptance handoff

Author: Developer 2 acceptance_test_author `/root/f01_acceptance`, generic
collaboration dispatch, fork_turns=none, inherited defaults. Direct own metadata
confirmed `gpt-6.1-sol` / `high`, session
`01a1a801-8f55-7b40-9c40-ed8b421ec96a`, start
`2026-11-04T19:20:36.950Z`. External session path:
`C:/Users/royde/.codex/sessions/2026/11/05/rollout-2026-11-05T03-20-36-01a1a801-8f55-7b40-9c40-ed8b421ec96a.jsonl`.
Only identity metadata was inspected; no transcript/reasoning is retained here.

## Independence and authority

Exact base `98f0f8de62edbd3a54f0f50f011c7dd6b571ef71`, writer branch
`royden/f01-multi-acceptance`, assigned isolated worktree of the same suffix.
Approved package is `agent-eval-reviewed-v1`, snapshot
`597ecf887319e942ad46171bae7349404fbd1d36`. Complete approved PRD/TDD/RTT and
PackageApproval were read before executable tests or dependency installation.
Frozen interpretation:
`778044b4ce9060a3cbff2ca8f2475d4b355197c1`,
`2026-11-04T19:24:33Z`. Coordinator withheld implementer dispatch until freeze.
No implementation source/diff/branch was read. Later information consisted only
of public factory/contract spelling, aggregate results, and rendered UI facts.
All work stays in assigned new test/support files and the two scoped artifacts.
Approved SDD/dependencies/lockfile are unchanged by this author.

## Commits in author order

| SHA                                        | Content                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `778044b4ce9060a3cbff2ca8f2475d4b355197c1` | Frozen interpretation, before exposure/install/tests.                                                   |
| `34582332a17d8d775f980a352cfe2366a5968397` | Expected-red HTTP/transport and literal independent fixtures.                                           |
| `7e118f479ea114d7d99fa9feb5e502ea56168690` | Remove unnecessary source escaping without changing delimiter string.                                   |
| `0b8e354ddba9b036508f09247a6a2171f9a85ac0` | Expected-red119 real-PG HTTP cases, bounded target and integrity faults.                                |
| `77596f457d4c746c52b3deee5d0a3aeb21ef3d11` | Eleven HTTP-doubled browser journeys, two viewports.                                                    |
| `c9e50b32373f9f6ffe70d9ae66fa1c6493258ca5` | Recognize actionable "specify" wording for vague-topic guidance.                                        |
| `53954564b31a3af5e2eb8aa7b29a274f2bea2732` | Composed real-cookie/PG browser journey; actual lost Save response; additional protocol/deadline cases. |
| `eaead71ce187586b313dd700efb14550cd6791a6` | Static additive migration, D-1/D/D+1 scheduling, request-window reset.                                  |
| `6448edf6b653c859075605a1ee887f38ae899f1e` | Exact observable retry request times0/100/300/700ms under controlled external scheduler.                |
| `fec9a04e31aaf6db3a00d51953dbff50961acda7` | Browser semantic locator repairs from public rendered facts.                                            |

## Writer-local verification and expected reds

Commands below all ran from the assigned writer via
`python workflow/experiments/MP4-D2-F01/experiment.py exec --arm multi --`.
Node `v24.14.0` and npm `11.9.0` were explicitly verified. No live provider or
database/browser runtime suite was executed by this writer.

- `npm ci --ignore-scripts`: PASS,563 packages, reported2minutes. No lock edits.
- `npm run db:generate`: initial Windows Prisma-cache EPERM; scoped escalated
  offline retry PASS, generated Prisma7.10.1. No migration/DB command by author.
- `npm run build -w @debugclinic/contracts`: PASS.
- Initial ordinary Vitest launch hit esbuild parent-directory access denial.
  A `--configLoader runner` diagnostic reached tests and exposed missing CORS
  fixture config. Ordinary launch with scoped escalation then exposed missing
  BETTER_AUTH_URL in the boundary-config subfixture. Both test-only setup faults
  were repaired without altering expectations. Preserve these as author setup
  failures, not product failures.
- `npm test -- apps/backend/test/f01-acceptance-http.test.ts apps/backend/test/f01-acceptance-transport.test.ts --reporter=dot`:
  final original slice121expected failures/29passes/150tests, duration1.98s.
  Later supplemental version125expected failures/36passes/161tests,2.31s.
- `npm test -- apps/backend/test/f01-acceptance-http.test.ts apps/backend/test/f01-acceptance-transport.test.ts apps/backend/test/f01-acceptance-migration.test.ts --reporter=dot`:
  129expected failures/36passes/165tests,1.88s on baseline.
- `npm test -- apps/backend/test/f01-acceptance-retry-clock.test.ts --reporter=dot`:
  3expected failures/3tests,0.48s on baseline. This is separate from the165run;
  no combined168-test writer run is claimed.
- Focused `npm exec -- prettier --write <owned files>` and
  `npm exec -- eslint <owned files> --max-warnings=0`: PASS on final owned tests.
  Initial lint found8no-useless-escape reports on one delimiter literal; the
  correction commit preserves its exact runtime value.
- `npm exec -- tsc -p tsconfig.integration.json --pretty false`: expected-red
  baseline,6diagnostics: missing module, FakeAiProvider generation method,
  createApp option twice, and two new schema-field sites. An earlier author
  inference diagnostic was fixed. No integrated compilation claim by author.
- `npm run test:e2e -- tests/e2e/f01-instructor.spec.ts tests/e2e/f01-composed.spec.ts --list`:
  PASS,24cases =11HTTP-doubled journeys and1composed journey on desktop/mobile.
  Discovery is not browser-runtime acceptance.

Exact baseline failure families are mechanically named in the committed files:
HTTP B01's eight route/role cases; B02's two missing-Origin cases; B05/B27 missing
module503; B04 unexpected module500. Each gets baseline404. Every transport
case invoking generateQuestion gets the baseline missing-method TypeError;
12config partition cases pass. The additive-migration case finds zero F01
migrations. The three clock names are exactly `B09 network makes requests
at0/100/300/700ms then stops`, corresponding429, and corresponding500.
Ordinary safe parser/body/CORS/limiter and absent-mutation cases can already pass
on baseline; that does not constitute a feature-flow pass.

## Integrated evidence reported by coordinator

These are coordinator observations, not writer-local executions:

- First integrated H/T slice150/150PASS with backend `5c5541d`.
- First P run117PASS/2FAIL of119: genuine JS-string-length surrogate boundary
  defect plus an author regex false positive. After implementer `6d68891` and
  author `c9e50b3`,119/119PASS on first targeted repair.
- First matching browser run `npm run test:e2e -- f01 --workers=1`:
  14PASS/10FAIL of24, five locator groups on both viewports. Composed real-cookie
  flow successfully registered/verified/signed in/generated/edited/saved before
  the warning locator failed. Original failures are retained in coordinator
  evidence; `browser-feedback.md` contains only rendered facts.
- After `fec9a04`, browser24/24PASS on the first targeted repair:22 HTTP-doubled
  cases plus2 composed real-cookie/PG cases. The five original groups were
  independently assessed from rendered facts and retained as test-author locator
  errors, not product fixes.
- Expanded H/T/migration/clock tests, including `6448edf`, are included in the
  coordinator's source-unit total352/352PASS. Latest reported application source
  checkpoint `ac5e5cd` includes provenance validation in owner lists.
- Full PostgreSQL suite before the extra actual dropped-response case:
  161/161PASS, including119 independent F01 cases. The final expanded full PG
  rerun with120 independent F01 cases remains coordinator-owned and pending at
  this handoff checkpoint. No writer-local PG execution is claimed.

Interpretation refinements are visible and do not change approved behavior:
"Please specify a beginner Python concept" satisfies actionable clarification;
warning text may continue after "Unverified instructor draft"; success may use
status or alert; a draft link may be named "Open draft: <title>"; invalid title
feedback is established by aria-invalid plus its associated accessible description.
No access/content/ownership/persistence/pending assertion was weakened.

## RTT coverage and evidence limits

H=`f01-acceptance-http`; T=`f01-acceptance-transport` and `retry-clock`;
M=`f01-acceptance-migration`; P=`tests/integration/f01-drafts`;
B=`f01-instructor` HTTP-doubled browser; R=`f01-composed` real-cookie/PG browser.
Identifiers here are file stems. Results above apply only to the stated versions.

| RTT group | Authored evidence and remaining limits                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B01       | H all roles/four routes/no dependency; P foreign ownership; B role redirects; R real owner cookie flow.                                                                                                                      |
| B02       | H both POST origins/JSON/no mutation. Auth mounting/cookie baseline regressions are coordinator C evidence.                                                                                                                  |
| B03       | P blank/no provider, structural input bounds, refusal guidance; B retained/corrected topic. Actual semantic suitability is L pending.                                                                                        |
| B04       | H raw malformed JSON/ASCII+UTF8escaped body boundaries/limiter+reset/safe500; P request/query/ID/JS-length partitions.                                                                                                       |
| B05       | T literal complete preview; P no saved row before Save/provenance; H optional module503; R fake identified and explicit Save. Unsupported optional provider remains baseline/implementer evidence to correlate.              |
| B06       | T five strict refusal reasons/no retry; P safe400/topic-guidance/rejected usage. Live refusal judgment pendingL.                                                                                                             |
| B07       | T whole union/field bounds/tags/extra keys/tool/markdown/trailing JSON/wrong-correction structural negative control; P normalized-result fault. Semantics pendingL.                                                          |
| B08       | T exact independent envelope/content byte caps, multibyte content, cancellation, choices/string/outer JSON failures.                                                                                                         |
| B09       | T config extremes, transient/nontransient bounds, exact retry scheduler, D-1/D/D+1, pending fetch/body/backoff deadline. Synthetic transport only.                                                                           |
| B10       | T exact fixed two-message prompt with injection/delimiters, credentials omitted from body. Actual provider adherence pendingL.                                                                                               |
| B11       | T raw-count normalization; P actual Int32 maximum/overflow-null storage through injected fetch, distinct server UUIDs, successful/rejected/failed operational records and sanitized logs. Retry cost unknown.                |
| B12       | P exactly one usage insert attempt; success blocked503; rejection/failure preserved; fixed category/log privacy. Prisma usage-write fault is a declared external dependency double.                                          |
| B13       | B topic lock/Generate removal/six edits/unverified/no excluded controls; R complete real composition.                                                                                                                        |
| B14       | P all edited fields/code bytes/prose trim/server provenance/private DRAFT; B/R UI Save/read-only success.                                                                                                                    |
| B15       | P field/type/length/missing/unknown/spoof/association partitions; B local invalid edit retains other fields with associated feedback.                                                                                        |
| B16       | P real PostgreSQL Exercise/version/deferred-commit failure triggers, no partial public rows, version1 Python/no hints/attempts/null publication.                                                                             |
| B17       | P repeated generationId distinct drafts plus actual socket-dropped committed Save; B pending suppression/no automatic retries.                                                                                               |
| B18       | P0/1/49/50/51/101 fixed pages, equal-time tie sort, owner projection, unsigned offsets; B Load more. High nextOffset branch uses an explicitly disclosed Prisma skip-to0 mapping over51real rows, not a billion-row fixture. |
| B19       | P reload/new composition and indistinguishable missing/foreign/legacy/archived/corrupt-provenance404, dependency503; H absent mutation routes; B/R read-only reopening.                                                      |
| B20       | M only four nullable additions/no backfill/destruction; P old writes omit fields, null rows excluded, new composition persistence. Historical pre-change-row migration application remains coordinator P/C observation.      |
| B21       | B controlled generation loading/locks/retry/correction/stale response, no partial preview. No unreachable regeneration state invented.                                                                                       |
| B22       | B pending Save/New question/navigation lock, edits retained and manual retry; R successful transition.                                                                                                                       |
| B23       | B New question/reload/no dialog/no restoration/late response; R saved data persists.                                                                                                                                         |
| B24       | B loading/empty/list+detail faults/manual retry/append+terminal paging; P exact ownership/durable projection.                                                                                                                |
| B25       | T context/tool strictness; P safe errors/logs; B inert scripts/img in fields/detail/list with no dialog/probe. No Python execution. Actual malicious semantic adherence pendingL.                                            |
| B26       | B keyboard operation/focus state/no viewport overflow at both sizes. Human visual focus/contrast/responsive/long-code review remains required.                                                                               |
| B27       | H createApp optional compatibility/limiter; existing full auth/hint/learner/declaration/packaged adapter/Netlify checks remain coordinator C evidence.                                                                       |
| B28       | Explicitly pending separately authorized live environment, held-label calibration and fresh independent evaluator for all11samples. Never inferred from deterministic tests or declared Python tags.                         |

All13PRD IDs are preserved in frozen traceability: nine F01-FR-01..09 and four
F01-NFR-01..04. Every RTT group B01..B28 has authored evidence or a named pending
tier; this table is not a claim that all acceptance criteria have passed.

## Remaining obligations and environment notes

Coordinator owns final green integration, actual P/B executions, declaration and
packaging/full-regression checks, raw monitoring and final independent functional,
standards and security reviews. Only explicit synthetic DB target
`127.0.0.1:55441/debugclinic_f01_test` is accepted. P cleanup targets UUID-owned
rows; fault functions/triggers use unique names and only the synthetic owner.
No reset/destructive migration/provider-network call is introduced.

The composed browser uses real registration, captured verification mail, sign-in
cookies, real backend/module/fake provider and PostgreSQL, with no response
interception. HTTP-doubled browser cases prove UI state only. Captured SMTP and
configured fake generation are disclosed doubles, never real-provider evidence.

Pending external/manual obligations: B26 named human desktop/mobile accessibility
observations; B28 synthetic-environment authorization, two held-label calibration
fixtures and all11captured samples under f01-quality-v1/f01-test-agent-v1; CI and
deployment-owner packaging records where required; instructor product review.
Historical pre-migration row observation and unsupported optional provider
evidence must be correlated with coordinator/implementer checks. No requirements
ambiguity blocks authoring; these are evidence obligations, not silent waivers.

Workflow gaps were journaled: RTT tool truncation recovered; root config reader
allowlist limitation covered by coordinator-authorized scoped direct reads;
factory/export spelling clarified without implementation exposure. Significant
setup retries were Prisma/esbuild sandbox access. Shared token estimate warnings
were received and retained by coordinator; this author does not invent private
usage counts. Author soft duration estimate2400s; handoff preparation at roughly
1900s elapsed, with no owner-permission wait. Any subsequent targeted repairs
and final finish timestamp will be reported to coordinator. The writer's frozen
interpretation fails ordinary Prettier formatting; coordinator confirmed the
exact artifact is covered by the main immutable-evidence formatting exception.
Its original bytes and freeze commit remain unchanged.

## Targeted review correction round 1 — F01-ACCEPTANCE-REPAIR-01

Resumed original author on `bb09c1a` at the 2026-11-04T20:20:44Z checkpoint;
same package/frozen interpretation, with source still unexposed. Coordinator
provided only two confirmed public P2 failure facts: selected-content cap was
deferred until the whole envelope completed, and a first200 response body network
TypeError was not retried. These refine existing B08/B09 coverage; no expected
behavior changed and no app/config/helper implementation was read or edited.

Five independent transport cases were added:

- B08 UTF-8 and mixed JSON Unicode-escape controls at exactly32,768 selected
  decoded UTF-8 bytes with unrelated outer metadata must succeed.
- The corresponding32,769-byte streams are valid JSON prefixes of sub65,536-byte
  envelopes, deliberately left unfinished. UTF-8 code points and JSON escapes
  cross explicit byte chunks. The test observes rejection503 and cancellation
  before requesting EOF or triggering the shared controlled deadline, with one
  remote attempt. It races the public operation against the stream's next-read
  request rather than waiting for a wall-clock timeout. Final cleanup aborts the
  controlled signal only after the early-outcome assertions.
- A first200 response emits a partial body then fails its read with network
  TypeError; a valid second response must recover with final counts7/9, exactly
  two remote attempts and the same unexpired deadline signal.

The authorized P3 stale-response test now leaves via the SPA brand link, returns
through Instructor workspace and New question links, proves the new topic page
mounted empty, and only then releases the old response. A document marker proves
no hard reload occurred; assertions run after the old request finishes or is
legitimately aborted on unmount. This strengthens B23 without adding a workflow.

Writer command through the pinned multi wrapper:
`npm test -- apps/backend/test/f01-acceptance-transport.test.ts --testNamePattern "selected3276|first200 body" --reporter=dot`.
Baseline result:5expected missing-generation-method failures,128other cases
filtered out,1.67s. No authored skip was introduced. The baseline cannot establish
the candidate defects; coordinator owns true candidate-red runs before source
repair, subsequent green transport and browser execution, and re-review.
An initial no-cond-assign lint finding in the new fixture encoder was corrected
without changing encoded values. No database/browser runtime was executed by the
writer in this correction round.

SPA verification repair 1: coordinator's first runtime attempt reached the fresh
SPA component on both viewports but failed at the test-only call
`pendingRequest.finished()`: installed Playwright Request has no finished method.
Journaled installed public type signatures establish `Request.response():
Promise<Response|null>` and `Response.finished(): Promise<Error|null>`. The wait
now obtains the optional response and awaits its completion when present, while
permitting a legitimate request abort. Same-document marker, release only after
fresh mount, empty topic/no preview and no-replay assertions remain unchanged.
The context reader rejects node_modules type paths; journaled scoped signature
search supplied these public declarations. No application change was requested.
Coordinator reports all365 unit/API cases and the five new transport cases/probe
green; browser rerun for this API correction remains coordinator-owned.
Writer-only static checks passed through the pinned wrapper: focused Prettier and
ESLint, plus `npm exec -- tsc --noEmit --strict --skipLibCheck --target ES2022
--module NodeNext --moduleResolution NodeNext tests/e2e/f01-instructor.spec.ts`.
The standalone typecheck validates this Playwright API use without importing the
unexposed application implementation or executing a browser.
