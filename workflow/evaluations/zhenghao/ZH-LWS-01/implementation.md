# ZH-LWS-01 implementation handoff

Status: scoped repair commit created; awaiting the tester's final integrated
verdict. The coordinator owns the delivery ledger and monitoring artifacts.

## Revision and scope

- Branch: `zh/learner-workspace`
- Base: `2fa9dfe4650f481e867e75bdacdce71c498db031` (includes reviewed PR #9 via
  `ae0097c734372bb675c75ce7451bf23dd9229aac`)
- Implementation commit: `3e733516f74e3fe9bb68943415ce7352dc5a32da`
- No push, remote PR, merge, or deployment was performed.
- The commit contains only learner contracts, service and HTTP wiring, list and
  workspace UI, attempt migration, focused tests, and the real browser-auth
  server seam. User `.gitignore`/reflection edits and coordinator workflow files
  remain unstaged and untouched by this commit.

The list adds server-side case-insensitive title/topic search before the existing
50-item pagination, while retaining deduplication and query state on return.
The detail page reuses PR #9's published-question routes and DTOs. The workspace
has a Python 3 code field, reasoning field, explicit save/final-submit controls,
a disabled Run action, and a typed injectable output-state panel. Desktop editor
resizing supports pointer capture and keyboard arrows; the mobile layout stacks
and was checked at 320px. Existing hint behavior remains disabled.

Learner attempt reads and writes use the authenticated learner and the
published version 1 identifier. Writes validate bounded UTF-16 text and expected
revision, lock the parent exercise row in a parameterized transaction before
checking publication state, and atomically finalize immutable submissions.
The separate migration preflights duplicate learner/version records and stops
without deleting data. Learner mutations require an allowed `Origin` and JSON;
CORS now allows PUT. Existing instructor mutation methods and session guard
semantics were not changed.

## Verification observed

Runtime: standalone Node `v24.22.2`, npm `11.19.0`.

- Focused F01/F02 contracts, F02 HTTP, and learner attempt HTTP:
  `npm test -- packages/contracts/test/f01-contracts.test.ts packages/contracts/test/f02-contracts.test.ts apps/backend/test/f02-http.test.ts apps/backend/test/learner-attempt-http.test.ts` — 4 files, 112 tests passed.
- Learner attempt persistence and migration preflight, using the explicitly
  verified disposable PostgreSQL 17 database at `127.0.0.1:51817`:
  `npm run test:integration -- tests/integration/learner-attempts.test.ts tests/integration/learner-attempt-migration.test.ts` — 2 files, 6 tests passed. The persisted-attempt cases cover own-attempt reads, revision conflicts, immutable replay, concurrent same-revision writes, submit/archive serialization, private response projection, and post-archive denial. Migration tests cover both duplicate-data refusal and compatible revision/index creation.
- F02 learner regression plus workspace journey:
  `npm run test:e2e -- tests/e2e/f02-learner.spec.ts tests/e2e/learner-workspace.spec.ts` — 8 tests passed across desktop Chromium and mobile Chromium. This includes pointer/keyboard resizing, draft save, confirmed submit, return-to-search, disabled Run/hint, preserved F02 error/paging states, and 320px horizontal-overflow checks. HTTP in these browser journeys is intercepted; they are not real-cookie browser evidence.
- `npm run typecheck` — passed for backend, frontend, contracts, functions, and
  integration TypeScript projects.
- `npm run lint` — passed.
- Scoped Prettier check on all changed TypeScript/TSX sources and tests — passed.
- `npm run build` — passed, including declaration-emitting backend/frontend and
  production Vite build. Vite reported existing dependency annotation notices
  and the main JavaScript chunk exceeds its 500 kB advisory threshold.
- `node --import tsx scripts/verify-built-frontend.ts` — passed: 16 public
  route/viewport loads plus existing desktop/mobile smoke checks, with no page
  errors, external assets, or horizontal clipping.
- Impeccable detector on the four changed learner UI targets — returned `[]`.
- `prisma migrate deploy` applied all four migrations, including the new additive
  attempt migration, to the same disposable test database. No production URL was
  supplied.

The coordinator reported the implementation session at 2,082,406 cumulative
tokens against its 1.5m soft estimate. This was reported as a measurement
checkpoint; no budget increase or verification reduction was requested.

## Boundaries and remaining work

The broad F01/F02 integration, migration/publication, composed-auth, session
refresh, and full browser matrices were left to the separate testing stage, as
coordinated. No real Google/SMTP/AI provider or live deployment behavior was
tested. Screen-reader behavior remains a manual observation.

Historical handoff finding, since resolved: commit `4eb3447` injected
`createLearnerAttempts` into the Netlify composition. The extracted ESM Web
handler and learner save/final/retry/archive smoke checks now pass locally.

Useful reflection observation: an integration fixture that reused a fixed topic
matched a stale synthetic row after an early failure. Making its search term
unique per run removed that collision and made the real PostgreSQL search check
deterministic. No reflection document was edited in this implementation stage.

## Next authorized stage

The independent tester owns the final full compatibility matrix and separate
functional, standards, and security verdicts. No deployment or external service
checks are implied by this local repair evidence.

## Repair round — 6 November 2026

- Independent expected-red handoff: `4181ba4`. Tester-owned acceptance tests
  and `testing.md` were not changed.
- Repair commit: `a13af3e` (`fix(learner): guard workspace writes and canonicalize attempts`).
- Save and final submission lock the editor while pending. Final success displays
  the returned submitted snapshot; failures keep the learner's current content.
  Async completions now check component lifecycle, learner identity revision, and
  session epoch. Dirty-state updates carry a page owner so a disposed page cannot
  clear the next learner's guard. Temporary session expiry keeps the editor's
  unsaved text, and controls remain disabled until identity recovery.
- Learner attempt reads and writes now use the same canonical published-question
  query and DTO validation as the public detail route. Mutations still validate
  eligibility inside the parent-row-lock transaction. Malformed legacy versions
  cannot authorize attempts, and the established public-detail 503 behavior for
  corrupt stored DTOs is preserved.
- Learner-attempt contracts moved into `learner-attempts.ts`, with shared
  primitives and Unicode storage validation extracted to dependency-safe modules.
  The package root re-exports the named contracts without a circular import.
- Learner UI adjustments are local to its fields and layout: focused textareas
  retain a visible MUI border without the inner global focus ring, the desktop
  resize handle has a visible grip, and the title/Back action stack at narrow
  widths. The accepted desktop split and light theme tokens remain unchanged.

Verification on Node `v24.22.2`:

- `npm run typecheck` and scoped ESLint/Prettier checks passed.
- Focused contracts and learner HTTP tests: 5 files, 143 tests passed.
- Focused PostgreSQL learner-workspace acceptance: 7 tests passed against the
  coordinator-owned disposable database at `127.0.0.1:51817`; all four database
  URL variables were explicitly set to that target.
- Independent Playwright learner matrix: 16/16 passed across desktop Chromium
  and mobile Chromium. The session-retention case and refreshed visual case also
  passed after their final focused adjustments. Desktop and 320px screenshots
  were inspected for the focus ring, title stacking, and resize affordance.
- `npm run build` passed, including contract/backend declarations and Vite.
  Existing upstream comment and main-chunk-size advisories remain.
- Netlify CLI 27.16.1 extracted-package smoke and the learner save/final/retry/
  archive smoke both passed against the same disposable database. No deploy,
  production database, live provider, or external service was used.
- The first unprivileged unit/build attempts hit sandbox `EPERM` on local test
  sockets/tsx IPC; reruns with local socket access passed. One initial F4 rerun
  exposed the public-route error-status compatibility detail; the implementation
  was adjusted to preserve 503 publicly while attempts reject the invalid row,
  and the 7-case PostgreSQL acceptance rerun passed.

The tester's broader final suite and independent verdicts remain the next gate.
