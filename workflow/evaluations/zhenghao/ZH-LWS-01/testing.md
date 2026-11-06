# ZH-LWS-01 independent acceptance and review

## Frozen acceptance interpretation — before implementation inspection

Frozen 6 November 2026 (Asia/Singapore), on branch `zh/learner-workspace`,
HEAD `4eb344781aa87ace57daba100b7764194958b8e0`; comparison base
`2fa9dfe4650f481e867e75bdacdce71c498db031`. This single independently dispatched
testing chat uses requested gpt-6.1-sol/high. No subagents. Inputs read before
implementation diff: testing assignment, approved Zhenghao requirements
`workflow/zhenghao/specs/002-learner-workspace.md`, PR9 compatibility review,
AGENTS, project skills/runbook, feature map and CodingStandards. Human green pass
and narrowed test/evidence ownership are recorded in the assignment. Developer2
SDD paths are excluded from every search/diff. Coordinator owns telemetry.

Acceptance derives from requirements, not implementation tests:

- LWS-01: labelled title/topic search is case insensitive and applied before
  50-item deterministic pagination. List/detail/back retains search. Loading,
  retry, empty/no-results and keyboard links work; no fabricated metadata.
- LWS-02/03: learner-only viewport workspace shows problem/expected behavior,
  Python editor/reasoning and escaped whitespace-preserving output. At desktop,
  pointer and keyboard resizing preserve edits with accessible bounds/focus.
  At 320px all regions/actions stack without horizontal page overflow.
- LWS-04: only LEARNER can read/mutate learner endpoints. Published canonical
  PR9 version is authoritative, even without hints. No solutions, private
  reasoning/provenance, hint content or other accounts' attempts leak. Unknown,
  draft and archived questions fail safely.
- LWS-05: code/reasoning must be nonblank and bounded at 20,000/5,000 UTF-16
  units (search 200). Code indentation is preserved. Own drafts reload; code
  edited during load/save and failures survives. Save uses exact revisions;
  final confirmation atomically saves current content, freezes it, and has no
  Run prerequisite. Same final retry is safe; changed retry conflicts. Duplicate
  creation, save/save, save/finalize and remove/mutation races retain invariants.
  Existing duplicate attempts cause migration refusal without automatic deletion.
- LWS-06: production Run is disabled/explained with no execution, AI request or
  fabricated result. Injected result fixtures are test-only.
- Compatibility/security: preserve PR9 publish/remove/key idempotency, retained
  identities/references, F01/F02 privacy and session refresh. Pending reads and
  cross-account responses cannot overwrite/expose edits; in-app navigation and
  sign-out prompt for unsaved work. Origin/body/role/ownership validation and
  safe error/log boundaries apply server-side; adapter composition injects the
  real attempt service. No deployment/external-service actions.

Required evidence: static checks, all deterministic tests, full real disposable
PostgreSQL integration, normal Playwright plus opt-in real-cookie/captured-email
journeys using fake AI, production/declaration build, built frontend and extracted
Netlify package smoke. Add missing independent tests including composed publish
→ learner save/finalize → remove → denial with retained references. Separate
functional, standards and security verdicts. Unrun or mocked behavior is labelled.

Database for every connected command (all four URL variables identical):
`postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test`.
Owned container: `debugclinic-zh-lws-01a1af89`; coordinator owns cleanup.
Node path: `/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin`.
No `.env` targets. Preserve all pre-existing dirty files; commits contain only
this report and independent tests. Source findings return to existing builder.

## Execution and verdicts

Acceptance freeze commit: `3ef354c`, created before collecting any implementation
diff. Reviewed product revision remains `4eb3447`; only independent tests and this
report are committed by this chat. No source repair or remote action occurred.
Actual model/effort was verified as gpt-6.1-sol/high by the coordinator. The
coordinator owns session measurements; no transcript or telemetry scan was made.

### Verdicts — repair round 0

| Pass             | Verdict              | Basis                                                                                                                                                                                                                                                         |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional       | **Changes required** | F1–F4 below reproduce; normal paths and persistence races otherwise pass.                                                                                                                                                                                     |
| Coding standards | **Changes required** | Duplicated publication eligibility causes F4 (DRY/single authority). The separately specified attempt-contract module is also missing (S1). Static checks pass.                                                                                               |
| Security         | **Changes required** | F4 permits attempt reads/writes for a question rejected by canonical learner visibility validation. Role, identity, origin, strict input, body-limit, escaped-text and retained-reference checks pass. No other-account attempt/code disclosure was observed. |

This is an expected-red acceptance handoff, not green integration. The existing
Luna builder should receive all findings in one repair packet; this testing chat
remains available for the authorized repair verification. No source correction
round has yet been used.

### Consolidated source findings

**F1 — P1: successful Save drops the guard for edits made during the request.**
`apps/frontend/src/pages/PublishedQuestionPage.tsx:115–116` unconditionally calls
`updateDirty(false)` although code/reasoning remain editable while saving
(`apps/frontend/src/components/LearnerWorkspace.tsx:112`, `:135`). Reproduction:
enter code/reasoning → delay PUT → Save → edit code again → release the successful
reply → Back. Navigation proceeds without the required discard dialog and loses
the newer unsaved code. Reproduced in Chromium desktop and mobile by independent
test `edits during a successful save…` at
`tests/e2e/learner-workspace-acceptance.spec.ts:53`. Preserve the submitted snapshot
and compare against current edits before clearing the guard, or prevent editing
while the mutation is pending. Keep the returned revision for the next Save.
The test accepts either safe strategy.

**F2 — P1: final read-only content can differ from the actual final submission.**
`apps/frontend/src/pages/PublishedQuestionPage.tsx:103–116` stores the returned
attempt but never reconciles the visible code/reasoning with it. Reproduction:
submit `print('confirmed final')`, edit to `print('not submitted')` while POST is
pending, then release a success containing the confirmed snapshot. The UI reports
received/read-only and disables a textarea showing `print('not submitted')`;
that text was never submitted. Both browser projects fail
`…a completed final shows the submitted snapshot…` at acceptance test line 231.
Lock editing during finalization or render the authoritative final response
after completion, while preserving local content on errors.

**F3 — P1: a disposed account's save clears the new account's unsaved guard.**
`apps/frontend/src/pages/PublishedQuestionPage.tsx:111–120` has no mutation
identity/lifecycle disposal check. Reproduction: delay account A's PUT, switch
the `/me` focus response to learner B, type B's new code/reasoning, then release
A's valid success. B's code remains visible but Back no longer warns and loses
B's work. Both projects reproduce in `…a disposed account's save response…` at
acceptance test line 139. Ignore success/error/finally effects from obsolete
question/account instances; a disposed callback must not mutate shared dirty
registration. Preserve existing sessionEpoch/identity-keyed routing behavior.

**F4 — P2: attempt eligibility is weaker than canonical published visibility.**
`apps/backend/src/exercises/learner-attempts.ts:79–91` and `:111–135` duplicate
only non-null predicates from the publication service. Canonical public
projection additionally validates the stored contract in
`apps/backend/src/exercises/instructor-questions.ts:153–157`. A retained/legacy
PUBLISHED Python-v1 row with `generationProvenance: {}` is unavailable through
`getPublished` (safe 503), yet attempt GET succeeds and save/finalize create work.
All three independent real-PG cases in
`tests/integration/learner-workspace-acceptance.test.ts:225` fail as expected.
The fixture creates/deletes only its own synthetic row. Reuse a shared canonical
eligibility/validation authority **inside the existing publication lock**;
validation before an unlocked mutation must not reopen the archive race.

**S1 — P2: specified attempt-contract module was not delivered.**
`packages/contracts/src/index.ts:403–440` adds all learner attempt definitions to
the central index, whereas approved technical boundary 1 calls for a separate
attempt contracts module with named exports. Extract the coherent attempt
contract/validation responsibility while preserving existing package exports,
or obtain and record the coordinator's explicit plan exception. Avoid circular
initialization when sharing existing validators; rerun declarations/package
checks. This is a standards/approved-plan deviation, not a new functional defect.

### Environment and reproducible commands

Every connected command used the verified assigned container, loopback port and
database. Docker inspection returned `127.0.0.1:51817 → 5432`; `psql` returned
`debugclinic_lws_test|debugclinic`. The coordinator owns container cleanup.

```sh
export PATH=/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin:$PATH
export DATABASE_URL=postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test
export DATABASE_URL_POOLED=postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test
export TEST_DATABASE_URL=postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test
export E2E_TEST_DATABASE_URL=postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test
# Verified: node v24.22.2, npm 11.19.0
npm run db:deploy
npm run db:seed
npm test
npm test -- --config tests/frontend/vitest.config.ts
npm run test:integration
npm run lint
npm run typecheck
npm run build
node --import tsx scripts/verify-built-frontend.ts

# Normal intercepted browser suite; source backend/runtime is real local Express.
E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- --workers=2
# Independently added browser matrix, expected red until F1–F3 are repaired.
E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- tests/e2e/learner-workspace-acceptance.spec.ts --workers=2
# Real cookies/PG, captured SMTP, fake AI; no browser request interception.
E2E_AUTH_COMPLETION=1 E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- tests/e2e/auth-completion.spec.ts \
  tests/e2e/f01-composed.spec.ts tests/e2e/f02-composed.spec.ts \
  tests/e2e/learner-workspace-composed.spec.ts --workers=1
# Existing Google-controller fixture hardcodes Origin 5173; rerun those four
# cases on their required origin after checking both default ports are free.
E2E_AUTH_COMPLETION=1 E2E_APP_ORIGIN=http://127.0.0.1:5173 E2E_BACKEND_PORT=3001 \
  npm run test:e2e -- tests/e2e/auth-completion.spec.ts \
  --grep Google-controller --workers=1
```

Loopback sockets, Docker and tsx IPC were run with scoped sandbox escalation.
The first un-escalated `npm test` had 66 EPERM socket failures and 419 passes;
escalated rerun passed all 485 original cases. This was environment evidence,
not a product failure. No suite was replaced with hand checks.

### Results actually observed

| Layer                      | Result and evidence                                                                                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting                 | All supported changed source/test/report files pass scoped Prettier. Manifest `.workflow-state/lws-acceptance/format-paths.nul`; command `xargs -0 npx prettier --check < .workflow-state/lws-acceptance/format-paths.nul`. SDD paths and unrelated dirty files were excluded before collection.                     |
| Lint/typecheck             | `npm run lint` and `npm run typecheck` pass with independent tests. Separate renderer test typecheck also passed with JSX enabled.                                                                                                                                                                                   |
| Deterministic              | Final `npm test`: **516/516 pass**, 29 files; includes 31 independently added HTTP denial/failure/bounds cases.                                                                                                                                                                                                      |
| Output renderer            | **5/5 pass** via separate frontend Vitest config: default unavailable and all four injected result variants, malicious text escaping and whitespace preservation. No execution service or production test hook.                                                                                                      |
| Production/declarations    | `npm run build` passes after locked-dependency reconciliation. Only dependency comment/chunk-size warnings; emitted backend/contracts declarations and Vite output verified.                                                                                                                                         |
| Built frontend             | **16 route/viewport loads pass** with anonymous synthetic API, keyboard/role-choice/focus/mobile checks, no JavaScript errors/external assets/clipping. Distinct from learner dev-server and packaged-function evidence.                                                                                             |
| Full PG integration        | Original suite **191/191 pass** after fixture preparation. Final full suite **195 pass / 3 expected failures**, 11 files / 198 cases. All three failures are F4; four added search/concurrency/reference cases pass.                                                                                                 |
| Original normal Playwright | **128 pass / 18 opt-in skips**, both Chromium projects. Includes F01/F02/session refresh, builder pointer/keyboard resizing, escaped learner content, and 320px overflow checks.                                                                                                                                     |
| Independent browser matrix | **10 pass / 6 expected failures** (8 scenarios × 2 projects). F1–F3 each fail on desktop and mobile. Passing cases cover load/retry, failed save, confirmation cancellation, lost-final-reply identical retry, focus/expiry/account disposal, disabled Run/no AI or execution request and responsive text rendering. |
| Composed local             | Initial combined run **14 pass / 4 failures** (hardcoded Google Origin). Failed four rerun at default origin: **4/4 pass**. New publish→learner save/reload/final→remove→denial/retained-review journey passes on both projects. Auth traces/screenshots remain off.                                                 |
| Packaged Netlify           | Existing extracted ESM smoke passes, then independent authenticated learner service wiring/save/final/retry/archive smoke passes. No live deployment or provider claim.                                                                                                                                              |

Focused concurrency cases exercise duplicate first-save, duplicate first-final,
same-revision Save/Save, Save/Finalize, Finalize/Remove and first-Save/Remove.
Exact revision/content assertions and retained review/version/attempt assertions
pass. These are bounded adversarial schedules, not proof of all schedules.
Migration duplicate refusal and no automatic deletion are covered by the passing
full PostgreSQL migration suite. Search uses 55 owned matching rows plus a
distinct oldest-title match, testing actual database filtering before page 50.

### Setup failures, corrections and evidence limits

1. First integration: **187 pass / 4 fail**. The assigned database lacked seed
   identities; seeding removed that failure. Remaining three public-list failures
   came from pre-existing fixture
   `learner-exercise-c8c468bc-c4cf-4bc8-bdb3-b15fcccc6cc2`, with invalid `{}`
   provenance. Archived exactly that row in this owned disposable DB, preserving
   all data/references; then the unchanged original suite passed 191/191. No
   reset/truncate or broad fixture deletion. The new isolated F4 tests separately
   establish the source eligibility mismatch; the stale fixture itself is not
   attributed to the reviewed patch.
2. First independent Save fixture accidentally echoed `expectedRevision` into a
   strict response DTO. Its validation failure was corrected before attributing
   F1 to source. The current valid-response reproduction fails at the absent
   unsaved dialog, not at a malformed test response. Updated the existing AGENTS
   fixture lesson as required by personal instructions, preserving its existing
   dirty changes and leaving the entire file unstaged for the coordinator.
3. First package smoke selected the Lambda bootstrap instead of the documented
   `netlify/functions/api.mjs`; corrected selection exposed a missing root
   `@better-auth/core` in stale local node_modules. Offline reconciliation failed
   with ENOTCACHED. `npm ci --ignore-scripts --no-audit --no-fund` restored exactly
   the committed lockfile (563 packages); no manifest/lockfile changed. Node24
   root-core and Rollup imports, full unit suite, build and packaging then pass.
4. The Google-controller fixture has a hardcoded Origin 5173. Alternative-port
   run safely returned 403 in four cases; those exact cases pass at Origin 5173.
   No auth source or existing expectation was changed.

Local logs are preserved under `.workflow-state/lws-acceptance/logs/`, outside
Git. These contain only synthetic test data. Main records:
`lws-unit-final.log`, `lws-integration-final-matrix.log`,
`lws-independent-browser-final.log`, `lws-e2e-normal.log`, `lws-composed.log`,
`lws-composed-google-default.log`, `lws-output-renderer.log`,
`lws-build-reconciled.log`, `lws-built-frontend-final.log`,
`lws-packaged-smoke-final.log`, `lws-packaged-learner.log` and static-check logs.

Requested synthetic screenshots were captured and visually inspected:

- `.workflow-state/lws-acceptance/screenshots/workspace-desktop-1440x900.png`
  (viewport 1440×900, full-page image 1440×900).
- `.workflow-state/lws-acceptance/screenshots/workspace-mobile-320x800.png`
  (viewport 320×800, full-page image 320×1186).

They show escaped script-like buggy code, real editor/reasoning/actions, disabled
Run and actual unavailable output. Mobile stacks without page overflow. Browser
failure screenshots/context are retained under
`.workflow-state/lws-acceptance/browser-failures/`; original Playwright outputs
are in ignored `test-results/`. No screenshots/traces of composed auth journeys
were produced.

Extracted artifact used for both passing package checks:
`.netlify/node_modules/auth-smoke-fecc6389-1075-4965-a69e-f8d7cf1b5a4a/extracted/netlify/functions/api.mjs`.
Rebuild locally, run
`node scripts/package-netlify-artifact.mjs /Users/zhenghaofang/.npm/_npx/e9adb3c3f6de0f20/node_modules/netlify-cli/package.json`,
extract the emitted ZIP, then run both commands with the absolute extracted Web
function path and the explicit environment above:

```sh
node --import tsx scripts/verify-netlify-artifact.ts <absolute-extracted-api.mjs>
node --import tsx tests/support/verify-learner-netlify-artifact.ts <absolute-extracted-api.mjs>
```

No remote CI, deployment, live SMTP/Google/SoC or real Python runner was tested.
Manual screen-reader and contrast audit remains unperformed; keyboard, pointer,
focus-refresh and browser layout assertions are automated evidence. Synthetic
injected runner-state SSR tests prove renderer escaping, not execution or live
assistive-technology behavior. Request disposal coverage is scenario-based;
F3 shows why identity-keyed mounting alone does not protect shared dirty state.
Raw timing/token telemetry stays with the coordinator. No budget overrun is
inferred from unavailable usage data; local verification ran within the two-hour
soft wall-clock allowance.

### Required next step and reflection evidence

Return F1–F4 and S1 together to the existing builder. Preserve the frozen
acceptance expectations and existing privacy/auth/F01/F02 cases. After source
repair, rerun the failed browser and PG cases, affected static/declaration/build
and package layers, then the appropriate integrated suites. Mark green only
after actual observed results; two review/correction rounds remain available.

Useful supported reflection: 485 pre-existing deterministic cases and the normal
browser suite passed while independent adversarial response timing found three
user-visible failures. Real-PG setup inspection separated missing seeds/stale
data from product defects. Extracted packaging caught dependency-layout issues
that source tests/builds did not. Restoring exact dependencies and correcting test
fixtures improved verification validity; none constitutes evidence of token-cost
savings, live-provider behavior or a production deployment.
