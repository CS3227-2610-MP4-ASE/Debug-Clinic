# DebugClinic feature and verification map

Maintained against the foundation on 2026-11-03. Update this map when routes,
journeys, API boundaries, or verification prerequisites change. Read route and
test definitions before choosing a check; this map distinguishes delivered
foundation from intended future behavior.

| Surface                                          | Current source / boundary                                                | Evidence route and limitation                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public home `/`                                  | `apps/frontend/src/pages/HomePage.tsx`                                   | `tests/e2e/app-shell.spec.ts`: public copy and navigation; described practice loop is intended product behavior                                                                     |
| `/sign-in`, `/register`                          | frontend pages and `src/auth/auth-client.ts`; Better Auth `/api/auth/*`  | Both e2e files cover entry, verification feedback, Google error/retry; browser registration/provider feedback uses intercepted responses                                            |
| Session restore / sign-out                       | frontend `AuthProvider`, `AppShell`, `lib/api`; backend session resolver | `tests/e2e/auth-feedback.spec.ts` covers delayed/failing sign-out and route protection with mocked session endpoints; integration covers real sessions/revocation                   |
| `/learner`, `/instructor`                        | role routes and dashboard pages                                          | Current dashboards are empty workspaces; `app-shell.spec.ts` checks unauthenticated learner redirect. Authoring, attempt, coaching, and review journeys are future feature work     |
| `/forbidden`, unknown routes                     | frontend ForbiddenPage / NotFoundPage                                    | Inspect route and role guard; add targeted assertions when affected                                                                                                                 |
| `/api/health`, `/api/ready`                      | `apps/backend/src/app.ts`                                                | backend `app.test.ts`; readiness uses injected DB probe in unit/API tests                                                                                                           |
| `/api/v1/me`, `/api/v1/profile`, instructor ping | backend app, Better Auth, shared contracts                               | backend `app.test.ts` and `tests/integration/auth-database.test.ts`: role enforcement, profile validation, DB-backed sessions                                                       |
| `/api/v1/ai/hint-preview`                        | backend app, `ai/provider.ts`, contracts                                 | backend `app.test.ts` / `providers.test.ts`: fake provider, transport-injected SoC adapter, safe failures. Real SoC acceptance and future usage accounting remain separate evidence |
| PostgreSQL data and auth                         | `prisma/schema.prisma`, migrations, seed                                 | integration fixture/schema/session tests; seed creates synthetic user records, not usable password-login credentials                                                                |
| Netlify function                                 | `netlify/functions/api.ts`, backend web handler/build policy             | backend web-handler/netlify-build-policy/deployment tests; test deployment package when affected; no implied deployment permission                                                  |

## Existing check routes

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
  `npx playwright install chromium`. Existing configuration starts `npm run dev`
  and may reuse an existing server outside CI. Inspect that server's identity and
  environment before reuse; leave unrelated processes untouched.

Playwright's current base URL is `127.0.0.1:5173`; its synthetic environment has
auth-origin settings at `127.0.0.1:4173`. Existing mocked browser tests do not
establish real auth correctness under that configuration. Plan a verified
isolated runtime setup for new real-auth journeys and record this limitation
instead of claiming end-to-end authentication from the smoke set.

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
