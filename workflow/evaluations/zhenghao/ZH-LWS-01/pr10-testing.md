# PR10 independent repair acceptance and testing

## Frozen interpretation before source diff

6 November 2026 (Asia/Singapore). Branch `zh/learner-workspace`; original base
`89f852cb7cc4c3cc64dc40639c1c4a529e87c8b0`; repair review head
`b5837fe7e3aeb6fdf7415730ba15ae6222719577`. Inputs: coordinator's PR10 assignment,
`pr10-coordination.md`, `pr10-repair.md`, existing project workflow/skills and
CodingStandards. No repair source diff has been collected yet. Requested model
remains gpt-6.1-sol/high, single reused independent testing chat, no subagents.
Only independently added tests and this evidence file may be committed here;
coordinator alone owns pushing. Developer2 SDD is excluded before searches/diffs.

Acceptance cases derive from user outcomes, not the implementation:

1. **Uncertain save:** lose a committed PUT reply for both absent and existing
   drafts. Before any further write, GET the authoritative attempt/revision.
   Keep local code/reasoning and dirty/navigation protection. Never automatically
   retry a mutation. The next deliberate Save uses the recovered revision.
2. **Conflict:** HTTP409 triggers the same read-only recovery. A newer draft may
   change code and reasoning; local unsent text remains intact and guarded.
   A null authoritative attempt is legitimate and restores null expectedRevision.
3. **Recovery failure:** a failed GET leaves mutation controls gated and offers
   explicit read retry. No Save/Submit is sent until a successful retry. Preserve
   edits on every failure and keep status/error feedback actionable.
4. **Final outcomes:** lost final reply reconciles the saved immutable final;
   an already-final different snapshot cannot be overwritten. Preserve unsent
   text distinctly and never label that text as the authoritative submission.
5. **Disposal:** delayed recovery results after expiry/account change/navigation
   cannot overwrite current-identity content or clear its unsaved guard.
6. **Long reasoning:** valid multiline reasoning under 5,000 UTF-16 units must
   leave Save and Submit reachable through scroll/clipping ancestors at minimum
   editor height 320, short desktop and 320px mobile. Locator visibility alone
   is insufficient; real pointer activation must reach the actions.
7. **CI collection:** with all four database URL variables and
   E2E_AUTH_COMPLETION unset, full normal desktop/mobile collection and suite
   must work. Opt-in suites must skip without constructing/cleaning a database
   client. Opt-in missing, mismatched and unsafe targets fail closed; an explicit
   matching coordinator-owned loopback `_test` target supports real composed
   cookies/PG/fake-AI journeys. Existing auth/privacy assertions remain intact.

Required checks: independent recovery/layout browser regressions, original
learner/session/instructor cases, full normal browser suite without DB variables,
opt-in composed checks, unit/static/scoped-format/production checks. Demonstrate
new behavioral tests fail against original source using an isolated temporary
source setup if feasible, restoring repaired source exactly. CI failure already
has independently reproduced original evidence. Database/schema/business logic
and adapters are unchanged, so broader DB/adapter reruns need an actual finding.

Runtime: standalone Node24.22.2 at
`/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin`.
Connected commands use all four URL variables identically:
`postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test`.
Coordinator owns container `51be9c17d03c84ff8a99c5a52b2f6f3c707b7f51809b42d986cd5130f9ef48dc`
and cleanup. No external providers/deployments/remote comments or pushes here.

## Execution and verdicts

Acceptance freeze commit: `3427713`, before source diff collection. Source review
compared `89f852c..b5837fe`, with the required SDD exclusions. Coordinator commit
`b317374` records scope/lessons only; the tested product source remains exactly
`b5837fe7e3aeb6fdf7415730ba15ae6222719577`. No product source or existing assertion
was changed by this testing pass.

### Independent regression coverage

`tests/e2e/learner-workspace-recovery.spec.ts` adds 12 cases per Chromium project:

- Lost committed initial/existing Save: gated recovery GET, preserved local
  text/guard while unresolved, no automatic write, then deliberate Save with the
  recovered revision and observed PUT→GET→PUT ordering.
- HTTP409 with a newer draft and with a null server attempt: preserve local
  code/reasoning/dirty guard; next intentional Save uses revision 9 or null.
- Failed recovery GET: both mutations disabled, explicit read retry, no automatic
  write, retained local text, then Save uses the recovered revision.
- Lost final reply: authoritative immutable final confirmed by GET without a
  second POST. Different existing final: editor shows actual server content,
  unsent local code/reasoning remains distinctly labelled and dirty-guarded, and
  script-like text is escaped.
- Account switch and session expiry during a delayed recovery: old replies cannot
  replace current content or clear the new account's dirty guard; restored
  identity uses explicit read retry with local text retained.
- Ninety-line reasoning (2,599 characters, under 5,000) at 1440×900, 1280×600 and
  320×800, desktop separator set to minimum 320. Actual action-center hit-testing
  intersects every clipping ancestor; real wheel/mouse input activates Save and
  the Submit confirmation. Cancellation sends no POST. No locator auto-scroll
  is used to make a hidden action reachable.

`apps/backend/test/pr10-browser-guard.test.ts` adds 15 isolated setup cases. Test
registration/Prisma/adapter constructors are explicit doubles; no database is
contacted. Module evaluation constructs no client. Disabled opt-in with absent
URLs performs neither construction nor cleanup; missing/mismatched values for
each of the four URL variables and five unsafe matching targets fail before
construction/cleanup. Correct matching target initializes only in setup and
disconnects once. Actual matching-target composition is tested separately.

### Original-source evidence and test corrections

The two original product files were read with explicit `git show 89f852c:<path>`
into `/tmp/pr10-original-source/`. A temporary Vite pre-load overlay supplies
those original bytes while retaining current tests/dependencies. The current
worktree's product files were never swapped or modified; SHA-256 before/after
checks for both files match exactly. No broad checkout/SDD materialization.

- Seven initial Chromium probes against original source: four expected failures
  (both lost-save cases, conflict recovery, recovery-read retry), three layout
  passes. Recovery failures showed no recovery GET or explicit retry action.
- The initial layout probe used Playwright locator clicks, which can scroll
  `overflow:hidden` ancestors programmatically. Replaced that incomplete probe
  with clipping-center hit-testing and real wheel/mouse activation, preserving
  the frozen reachability outcome. Final original-source layout rerun: two
  expected desktop failures (1440×900 and 1280×600), one stacked-mobile pass.
  All six repaired-layout cases pass the same final test.
- An intermediate assertion required an unsupported 40px visible hit height;
  it rejected a reachable short-desktop action with 38.97px exposed. Corrected
  the criterion to the frozen requirement: the actual action center must be
  within all clipping ancestors and receive a real mouse click. The original
  desktop still fails, so this correction does not erase the user regression.
- The temporary overlay first lacked ESM package metadata, causing a module
  export/collection error before tests. Added only temporary
  `package.json` with `type: module`; seven-case collection then passed. This
  setup correction is distinct from source behavior and the original CI defect.

The coordinator's independently reproduced original CI collection failure
(run 42192041476/browser job 127806791221, zero cases, missing explicit test URL)
is recorded in `pr10-coordination.md`; no remote CI status is inferred here.
An actionable clipping/auto-scroll lesson was appended to the existing AGENTS
guidance, preserving coordinator edits and leaving AGENTS unstaged.

### Commands and observed results

Standalone Node v24.22.2/npm 11.19.0. All normal-browser commands explicitly
unset the four URL variables and both opt-ins; the Playwright configuration's
normal synthetic server settings are not evidence of a real DB connection.
The guarded composed client skips setup/cleanup when disabled.

```sh
export PATH=/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin:$PATH
unset DATABASE_URL DATABASE_URL_POOLED TEST_DATABASE_URL E2E_TEST_DATABASE_URL
unset E2E_AUTH_COMPLETION E2E_REAL_AUTH
npm exec playwright -- test --list
E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- tests/e2e/learner-workspace-recovery.spec.ts --workers=2
E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- --workers=2
npm run lint
npm run typecheck
npm test
```

| Check                                                | Observed result                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No-URL full collection                               | **188 cases / 15 files collected**, exit 0. Original CI collection defect resolved locally.                                                                              |
| New focused browser cases                            | **24/24 pass** initially; strengthened layout subset **6/6 pass** and all final cases also pass in the full run.                                                         |
| Full normal browser suite, no DB variables/opt-ins   | **168 pass / 20 expected opt-in skips**, both Chromium projects, no failures. Includes unchanged learner/session/instructor/privacy/sign-out cases and all 24 new cases. |
| Isolated opt-in guard matrix                         | **15/15 pass**, no network or database side effects.                                                                                                                     |
| Full deterministic `npm test`                        | **531/531 pass**, 30 files, including the new guard matrix.                                                                                                              |
| Lint and typecheck                                   | Both pass with new independent tests.                                                                                                                                    |
| `npm run build` with explicit assigned URLs          | Pass: full production frontend plus contracts/backend declarations. Existing Zod comment/chunk-size notices remain non-fatal.                                            |
| Scoped formatting                                    | Pass for the three repaired source/setup files, both new independent test files and this report.                                                                         |
| Real composed F01/F02/learner journeys               | **8/8 pass**, both projects: real local cookies/PG, captured SMTP and fake AI, no browser interception.                                                                  |
| `node --import tsx scripts/verify-built-frontend.ts` | **16 public route/viewport loads pass**, no JavaScript errors/external assets/clipping. Synthetic anonymous API; distinct from the intercepted learner journeys.         |

The only connected database target was independently verified by Docker inspect
(`127.0.0.1:54603 → 5432`) and SQL
(`debugclinic_pr10_test|debugclinic`). All four URL variables match exactly for
connected commands. Browser runs were sequenced with no competing owned servers.
Scoped sandbox escalation was used for local sockets/tsx IPC/Docker.

```sh
export DATABASE_URL=postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test
export DATABASE_URL_POOLED=postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test
export TEST_DATABASE_URL=postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test
export E2E_TEST_DATABASE_URL=postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test
E2E_AUTH_COMPLETION=1 E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- tests/e2e/f01-composed.spec.ts \
  tests/e2e/f02-composed.spec.ts tests/e2e/learner-workspace-composed.spec.ts --workers=1
```

### Review and evidence limits

**Functional: pass. Coding standards: pass. Security: pass.** No unresolved
blocking finding remains in this scoped local PR10 review. No acceptance
expectation or existing assertion was removed or weakened; only independent
tests/evidence are committed here. Source review finds that
unknown write outcomes and 409 enter GET-only reconciliation; unresolved reads
gate writes, and explicit retry is also GET-only. The mutation snapshot and
session/lifecycle guard are retained. A different immutable final is rendered
separately from unsent local content. The reasoning field bounds visible rows.

Standards review finds coherent page state responsibilities, a reused session
guard, existing API/error/schema boundaries and compatible opt-in test lifecycle.
Security review finds no new provider/execution/storage/server boundary; local
unsent text remains React-escaped, and account/session disposal is covered.
The strict synthetic target validator is retained rather than bypassed for CI.
The composed suite's expected publication-response-loss `socket hang up` is
deliberate fault injection; its retry/privacy assertions pass.

Backend business logic, contracts, Prisma and Netlify are byte-for-byte unchanged
between original base and repair (scoped Git diff verified). As directed, no
PostgreSQL business-logic integration or packaged-Netlify suite was repeated.
Existing evidence is historical, not a newly observed result for those layers.
The new browser recovery paths use deliberate HTTP transport doubles; real
composed checks cover cookies/persistence/composition, not real SMTP/Google/AI or
a physically lost production response. No remote CI rerun, push, comment,
deployment or live provider action was performed by this chat.

Coordinator-reported usage checkpoint: 10,918,225 cumulative minus 9,033,592
previous = **1,884,633 new observed tokens**, exceeding the 1m incremental
estimate. Sol high remained selected; outputs/repeated reads were narrowed and
acceptance was retained. Coordinator owns final telemetry; no logs/transcripts
were scanned here and no cost saving or later token total is inferred.

### Artifacts, cleanup and handoff

Logs are preserved outside Git under `.workflow-state/pr10-testing/logs/`, named
`pr10-collection-final-nodb.log`, `pr10-normal-full-nodb.log`, `pr10-recovery.log`,
`pr10-layout-hit-test-final.log`, `pr10-guard.log`, `pr10-unit-final.log`,
`pr10-lint-final.log`, `pr10-typecheck-final.log`, `pr10-build.log`,
`pr10-built-frontend.log`, `pr10-composed.log`, `pr10-format.log`,
`pr10-original-behavior.log`, and `pr10-original-layout-final.log`.
Intermediate setup/measurement corrections are also retained, without treating
them as product failures. Original overlay configs/hash evidence and final
original-layout failure screenshots/context are under
`.workflow-state/pr10-testing/original-evidence/`; reproducible temporary
source/config files remain at `/tmp/pr10-original-source/`.

For original-source probes, after the no-URL environment above, run:

```sh
E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- --config /tmp/pr10-original-source/playwright.config.ts \
  tests/e2e/learner-workspace-recovery.spec.ts \
  --grep 'lost committed|409 newer|failed recovery|long valid' \
  --project=chromium --workers=2
```

With the final clipping-aware tests, the original source is expected red on
recovery and desktop layout; no current source replacement or restoration is
needed because the overlay alone supplies original bytes.

Fresh synthetic layout screenshots are under
`.workflow-state/pr10-testing/screenshots/final/`:
`reasoning-1440x900.png` (viewport/image 1440×900),
`reasoning-1280x600.png` (viewport/image 1280×600), and
`reasoning-320x800.png` (viewport 320×800, full-page image 320×1205).
They retain the long text and show bounded reasoning with reachable actions.
Actual pointer activation, clipping-center and captured payload assertions are
the reachability evidence; the screenshot alone is not. Auth/composed tracing
and screenshots stay disabled. Manual assistive-technology/contrast behavior
and a real external provider remain unverified.

All owned browser/backend/frontend processes exited; the coordinator-owned
database container was not removed. Product hashes remain exactly unchanged
from the reviewed repair. Existing coordinator AGENTS changes are preserved;
the appended test-quality lesson is left unstaged for its owner. Coordinator
owns docs/telemetry/push and any ensuing remote CI confirmation. No further
builder source repair is required by these observed results.
