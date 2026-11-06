# DebugClinic feature and verification map

Maintained against authentication, instructor drafts and F02 publication on 2026-11-06. Update this map when routes,
journeys, API boundaries, or verification prerequisites change. Read route and
test definitions before choosing a check; this map distinguishes delivered
foundation from intended future behavior.

| Surface                                                         | Current source / boundary                                                                                     | Evidence route and limitation                                                                                                                                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public home `/`                                                 | `apps/frontend/src/pages/HomePage.tsx`                                                                        | `tests/e2e/app-shell.spec.ts`: public copy and navigation; described practice loop is intended product behavior                                                                                                                         |
| `/sign-in`, `/register`                                         | frontend pages and `src/auth/actions.ts`; Better Auth `/api/auth/*`                                           | Explicit initial learner/instructor selection; full local captured-outbox/browser journeys in `auth-completion.spec.ts`, plus intercepted action-feedback matrices                                                                      |
| `/verification`, `/verification/result`                         | `RecoveryPages`, auth verification/resend boundary                                                            | Real signed verification and non-enumerating resend in isolated PG/BW; invalid/expired and delivery-failure cases remain distinct from live SMTP proof                                                                                  |
| `/forgot-password`, `/reset-password`                           | `RecoveryPages`, Better Auth reset routes                                                                     | Captured recovery links, password replacement/Google-first establishment, token history removal and session revocation; no public outbox endpoint                                                                                       |
| `/auth/complete`, `/auth/error`                                 | session refresh/completion and safe result pages                                                              | Google transport doubles with real local state/cookies/PG; controller substitutes external authorization hop. UI failure tests are separately intercepted                                                                               |
| Session restore / sign-out                                      | frontend `AuthProvider`, `AppShell`, `lib/api`; backend session resolver                                      | `tests/e2e/auth-feedback.spec.ts` covers delayed/failing sign-out and route protection with mocked session endpoints; integration covers real sessions/revocation                                                                       |
| `/learner`, `/instructor`                                       | role routes and dashboard pages                                                                               | Dashboards link to learner publication browsing and instructor question management. `app-shell.spec.ts` preserves unauthenticated learner redirect; F01/F02 specs cover authoring and publication.                                      |
| `/forbidden`, unknown routes                                    | frontend ForbiddenPage / NotFoundPage                                                                         | Inspect route and role guard; add targeted assertions when affected                                                                                                                                                                     |
| `/api/health`, `/api/ready`                                     | `apps/backend/src/app.ts`                                                                                     | backend `app.test.ts`; readiness uses injected DB probe in unit/API tests                                                                                                                                                               |
| `/api/v1/me`, `/api/v1/profile`, instructor ping                | backend app, Better Auth, shared contracts                                                                    | backend `app.test.ts` and `tests/integration/auth-database.test.ts`: role enforcement, profile validation, DB-backed sessions                                                                                                           |
| `/api/v1/ai/hint-preview`                                       | backend app, `ai/provider.ts`, contracts                                                                      | backend `app.test.ts` / `providers.test.ts`: fake provider, transport-injected SoC adapter, safe failures. Real SoC acceptance and future usage accounting remain separate evidence                                                     |
| `/instructor/questions/new`, `/instructor/drafts`, detail by ID | Protected instructor pages and `src/lib/instructor-drafts.ts`                                                 | Independent `f01-instructor.spec.ts` uses HTTP doubles for lifecycle/failure states; `f01-composed.spec.ts` uses real local cookies/PostgreSQL and captured email with fake AI. Human accessibility and live semantics remain separate. |
| Instructor generation/draft API                                 | `src/exercises/instructor-drafts.ts`, app routes, shared contracts                                            | `f01-acceptance-*` covers HTTP policy/injected SoC transport; `tests/integration/f01-drafts.test.ts` covers actual PG ownership, usage, bounds, rollback and paging. No generated Python execution.                                     |
| PostgreSQL data and auth                                        | auth schema plus four additive nullable draft-version fields; auth policy and normalization rehearsal utility | Real PG auth tests preserve identity/session invariants; F01 tests cover private drafts and usage. Seed records are synthetic fixtures without passwords.                                                                               |
| Netlify function                                                | `netlify/functions/api.ts`, backend web handler/build policy                                                  | backend web-handler/netlify-build-policy/deployment tests; test deployment package when affected; no implied deployment permission                                                                                                      |
| Built frontend                                                  | Vite production output; `scripts/verify-built-frontend.ts`                                                    | Real browser loads emitted assets for eight public routes × desktop/mobile with a local anonymous API stub. This catches chunk initialization failures hidden by the dev server                                                         |

## Existing check routes

F02 adds owner `/instructor/questions?status=DRAFT|PUBLISHED|ARCHIVED` and detail,
retaining old `/instructor/drafts[/:id]` URLs. Draft editors share six-field
validation, review, same-draft Save, publication recovery and discard state.
Published/Removed views are read-only; Remove archives without deleting references.
Learner `/learner/questions[/:id]` uses a separate public renderer/strict DTOs and
a disabled Get Hint/Coming soon placeholder. No functional hints or attempts are
added, and hints do not gate publication.

`InstructorQuestions` supplies the corresponding role-guarded HTTP APIs. New
contracts are separate from literal-DRAFT F01 contracts. Source server and Netlify
function both inject the Prisma implementation. The F02 migration adds revisions,
owner-scoped forever publication keys, archive time and trusted-topic digest.

| F02 check                                       | Boundary and limit                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/test/f02-contracts.test.ts` | Strict requests/DTOs, UTF16/storage/boundary policy; no persistence proof                                                                      |
| `apps/backend/test/f02-http.test.ts`            | Explicit HTTP dependency/session doubles; safe policy/error grammar                                                                            |
| `tests/integration/f02-publication.test.ts`     | Real PG/public module + BetterAuth cookies, roles/origins/body limits, CAS races/rollback/replay/privacy/paging and actual PG transport faults |
| `tests/integration/f02-migration.test.ts`       | Owned isolated-schema old-data/FK/preflight/constraint rehearsal; structural evidence                                                          |
| `f02-instructor.spec.ts`, `f02-learner.spec.ts` | Intercepted browser desktop/mobile editor/recovery/expiry/navigation/learner states                                                            |
| `f02-composed.spec.ts`                          | Opt-in real cookies/PG/fake AI and owned committed-response-loss proxy; captured email replaces SMTP                                           |
| `scripts/verify-netlify-artifact.ts`            | Extracted function publication/public allowlist/archive smoke; separate from source or build                                                   |

Manual screen-reader/focus/contrast/unload observations, actual remote CI and
unchanged live-provider evidence remain distinct. The implementation handoff
records actual outcomes and any remaining gaps; test existence alone is no pass.
Alternative owned test ports use validated `E2E_APP_ORIGIN` and
`E2E_BACKEND_PORT`; defaults remain5173/3001.

Inspect `package.json`, `.nvmrc`, `playwright.config.ts`, and
`vitest.integration.config.ts` for the current commands and runtime. Node 24 and
npm 11 are required. Common entry points are:

- `npm test` / `npm run test:api`: deterministic Vitest/Express checks. For a
  focused case, select the actual file/test through Vitest's supported arguments.
- `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`:
  relevant static, declaration, and production-build evidence. Use the required
  complete set at delivery; format only supported files, not `.env`.
- `npm run db:verify`: owns a temporary loopback PostgreSQL 17 container, applies
  migrations, seeds twice, runs integration, and cleans up its own container.
  Requires functioning Docker and the runtime/dependencies used by that script.
- `npm run test:integration`: requires explicit verified loopback
  `TEST_DATABASE_URL` ending in `_test`, prepared migrations/seed, and matching
  direct/pooled target configuration for preparation commands. Tests reject an
  absent or nonlocal target. This command alone does not provision the database.
- `npm run test:e2e` (optionally `-- --grep "<journey>"`): current Playwright
  Chromium desktop and mobile projects. If missing, install the browser with
  `npx playwright install chromium`. The configuration starts its own backend and frontend
  and waits for their health checks. Keep its required ports free; leave unrelated
  processes untouched.

Playwright uses `http://127.0.0.1:5173` consistently for the browser and auth
origins. It starts a direct Node/tsx backend without watch or `.env` loading,
awaits backend health, then starts strict-port Vite and awaits proxied API health.
It refuses reuse of an unknown existing server. External Google, SMTP, and OAuth
proxy credentials are blanked in this synthetic runtime.

`tests/e2e/auth-real.spec.ts` is opt-in with `E2E_REAL_AUTH=1`. Prepare an owned,
migrated loopback PostgreSQL database ending in `_test`; set
`E2E_TEST_DATABASE_URL` when its port differs from the default 5433. The override
rejects malformed, remote, non-PostgreSQL, and non-test targets. Run
`npm run test:e2e -- tests/e2e/auth-real.spec.ts --workers=1` with those explicit
settings. This spec uses real database-backed password registration, session
restoration, denied login, retry and logout with no network interception. SMTP
is disabled; it does not establish email verification, Google or production
correctness. The default browser smoke set still uses intercepted responses;
real-auth cases are explicitly skipped unless opted in.

For complete local verification/recovery journeys, set `E2E_AUTH_COMPLETION=1`
and the explicit owned `E2E_TEST_DATABASE_URL`, then run
`npm run test:e2e -- tests/e2e/auth-completion.spec.ts --workers=1`. Leave
`E2E_REAL_AUTH` unset: its separate foundation fixture assumes SMTP is disabled.
The completion fixture injects delivery into a private filesystem channel and
uses typed Google transport doubles. No browser interception is used in these
journeys. The controller starts the Google flow through the browser's real cookie
jar and navigates the local callback instead of visiting external Google. This
does not prove real Google authorization or UI initiation success. Six-action
failure/pending/retry matrices in `auth-action-feedback.spec.ts` use interception
and are reported separately. Sensitive journeys disable traces/screenshots.

After `npm run build`, run `node --import tsx scripts/verify-built-frontend.ts`
under Node24. It starts/stops an owned ephemeral local preview and browser, uses
only a synthetic anonymous API, and rejects JavaScript errors, external assets
and horizontal clipping. Run extracted Netlify artifact checks separately using
the tools and explicit database procedure in `docs/DeveloperGuide.md`; a build,
source-handler test or frontend preview is not packaged-backend evidence.

## Evidence handling

Use synthetic users and explicit local service targets. The seed's
`learner@example.test` / `instructor@example.test` rows are fixtures, not a
published account/password pair. Integration creates its own verified test
identity and captures email through a test outbox; e2e intercepts selected
requests. Real OAuth, SMTP, and SoC checks require controlled development setup
and separately recorded evidence.

Capture command/runtime/result, tested routes, mock/real boundaries, browser
diagnostics, screenshots/traces when produced, manual RTT observations, and
cleanup. Inspect current reporter settings for output paths; this repository has
no `verify:app` evidence wrapper. Link sanitized checkpoints in the feature
ledger; keep live raw telemetry outside Git as described in
[monitoring](../monitoring.md). CI evidence is pending until an actual Node 24
run is observed. Check the existing CI workflow rather than assuming it runs
every local command.
