# DebugClinic Developer Guide

## Architecture

DebugClinic is an npm-workspace monorepo:

| Area                 | Responsibility                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/frontend`      | React/Vite application shell, MUI components, routing, and role-aware navigation                     |
| `apps/backend`       | Express application, Better Auth, authorization middleware, AI boundary, errors, logging, and probes |
| `packages/contracts` | Shared Zod request/response schemas and inferred TypeScript types                                    |
| `prisma`             | PostgreSQL schema, migrations, and deterministic development seed                                    |
| `netlify/functions`  | Thin serverless adapter around the separately testable Express application                           |
| `tests/e2e`          | Playwright browser journeys                                                                          |
| `workflow`           | Specifications, architecture decisions, and verification evidence                                    |

The browser calls same-origin `/api` endpoints. Local Vite development proxies these calls to Express. Netlify rewrites the same path to a serverless function using `serverless-http`.

## Authentication and authorization

Better Auth was selected because its maintained documentation covers Express, Prisma/PostgreSQL, email/password authentication, Google authentication, database-backed sessions, and revocation.

- Authentication routes are mounted under `/api/auth/*` before `express.json()` consumes the request stream.
- Session identifiers remain in `HttpOnly` cookies. Production cookies are `Secure` and use `SameSite=Lax`.
- Better Auth's CSRF/origin protections remain enabled. Trusted origins come from validated environment variables.
- Session cookie caching is disabled so server-side revocation is not delayed by a client cache.
- Initial registration requires the explicit `registrationRole` command, either
  `LEARNER` or `INSTRUCTOR`. The stored `role` remains non-input; later sign-in,
  recovery, association and profile updates cannot change it.
- Auth email ingress trims JavaScript whitespace and lowercases consistently.
  Dots and aliases remain distinct. The existing unique email constraint arbitrates
  competing registrations; credentials and roles are never overwritten to resolve a duplicate.
- Google sign-in disallows implicit new-user creation. Explicit Google registration
  binds the selected role to a signed browser cookie and expiring database intent.
  A conditional root-client claim is consumed independently of provisioning.
  Verified same-email association requires both local and incoming ownership;
  direct link/unlink bypasses are disabled.
- Frontend route guards improve navigation, but Express authorization middleware is the security boundary.

Verification and reset email delivery use Nodemailer over authenticated SMTP,
defaulting to a dedicated Gmail mailbox over TLS on port 465. Configuring
`SMTP_USER` and `SMTP_PASSWORD` enables mandatory verification for email/password
accounts; both are required in production. `EMAIL_FROM` defaults to `SMTP_USER`
and must match it when using Gmail. Gmail app-password setup and production
callback URLs remain team-owned configuration. No domain/DNS setup is needed for
the Gmail sender. See
[CredentialsSetup.md](CredentialsSetup.md).

Verification resend and recovery use fixed application callbacks and safe,
non-enumerating acceptance responses. Delivery exceptions are caught without
returning recipient-specific failures or promising delivery. Google-first users
can establish a password through recovery. Recovery revokes existing sessions;
verification does not automatically sign in a user. The adapter enables real
transactions for provisioning/reset invariants. Controlled Google and SMTP
acceptance on the deployed runtime remain deployment-owner checks.

The exact compatible `@better-auth/core` dependency is declared in the backend
and at the root: the backend uses its public request-state API, and Netlify's
flattened packaged module must resolve it from the package root. Declaration
builds and extracted-package execution check different compatibility boundaries.

`scripts/normalize-auth-identities.ts` is an owner-operated **local rehearsal**
utility. Its CLI accepts only an explicit loopback `_test` database. Preflight
checks all canonical collisions before any changes; apply requires paused writers
and a protected, new `AUTH_NORMALIZATION_MAP` file outside Git. It preserves IDs,
roles and relationships while revoking sessions and database-backed verification
artifacts in a transaction. Stateless email-verification JWTs are not globally
revoked by deleting database rows. Windows operators must protect the map location
with filesystem permissions; a POSIX file mode alone does not establish Windows ACLs.
Production transition/rollback requires the database owner's separately authorized
target validation and operator procedure; do not point local tests at production.

## Data model

The Prisma model includes authentication records plus versioned exercises, ordered hints, attempts, AI feedback, reviews, AI usage, and authentication audit events.

The initial SQL migration adds checks that Prisma cannot express directly:

- hint and feedback stages remain between 1 and 3;
- final submissions require `finalSubmittedAt`;
- published exercises require `publishedAt`;
- usage counters cannot be negative.

MP4-D2-F02 explicitly permits publication without hints or hint approval.
Developer 1 owns future functional hint integration; F02 does not create hint
rows or impose a future hint lifecycle. A future sibling-row prerequisite would
need a separately approved transaction-level policy rather than a row SQL check.

## AI adapter

`AiProvider` isolates product code from provider-specific transport. Local
development and tests use `FakeAiProvider`, which is deterministic and offline.
`SocLlmProvider` implements the official SoCLaaS bearer-authenticated chat API,
validates structured message content, owns the response stage/request identity,
and uses an overall deadline with bounded transient retries. Tests inject an
offline transport; a live key and chat model are still required for acceptance.

All AI requests originate from the backend. Input and structured output use Zod
contracts, errors are mapped to non-secret responses, and request logging redacts
learner code and reasoning. Question generation records minimal usage events;
hint-preview behavior is unchanged. No custom quota subsystem is introduced.

Instructor draft preparation is owned by
`apps/backend/src/exercises/instructor-drafts.ts`. It exposes generate, Save,
list and get operations behind the instructor HTTP boundary. Generation records
usage metadata without creating an exercise. Explicit Save creates a private
`DRAFT` Exercise and Python version 1 in one transaction, retaining the topic,
six editable fields and server-snapshotted provenance. The association is
instructor-reported; the generation ID does not attest to edited content.
The additive migration adds four nullable version fields without backfilling
legacy records. Incomplete legacy records are excluded from this draft surface.

`soc-question-v2` sends exactly fixed system instructions and one topic JSON
message. Structured output, two streaming byte caps (65,536-byte envelope and
32,768-byte selected content), one overall deadline and bounded transient retries
protect the boundary. String limits explicitly use JavaScript UTF-16 length.
Provider token counts outside PostgreSQL's nonnegative Int32 range become null.
No topic, code or provider content enters usage records or feature error logs.
The fake adapter is explicitly configured and never an automatic fallback.
All generated/edited/saved content remains unverified; Python is never executed.

## Environment separation

| Environment       | Database                                 | AI                         | Credentials                                  |
| ----------------- | ---------------------------------------- | -------------------------- | -------------------------------------------- |
| Local development | Docker PostgreSQL                        | Fake provider              | Local `.env`, never committed                |
| Tests             | Isolated test database or injected fakes | Fake provider              | Test-only values                             |
| Deploy preview    | Dedicated preview database               | Fake provider by default   | Protected GitHub/Netlify preview environment |
| Production        | Managed pooled PostgreSQL                | SoC LLM after verification | Protected production environment             |

`DATABASE_URL` is the direct connection used by Prisma migrations. `DATABASE_URL_POOLED` is preferred by application traffic in Netlify Functions. A preview environment must never reuse either production URL.

Only offline Prisma generation, formatting, and validation may use a placeholder
URL when `.env` is absent. Migrations, seeding, and other database commands require
an explicit `DATABASE_URL`; there is no implicit database write target.

## API conventions

- `/api/health` proves the process is running.
- `/api/ready` additionally checks PostgreSQL connectivity.
- `/api/v1/me` restores the authenticated user.
- `/api/v1/profile` accepts only a strict name update; attempts to send `role` fail validation.
- `/api/v1/instructor/ping` demonstrates server-enforced instructor authorization.
- `/api/v1/ai/hint-preview` demonstrates authenticated, learner-only AI validation and safe failure mapping.
- `POST /api/v1/instructor/questions/generate` produces one unsaved six-field
  preview and generation metadata.
- `POST /api/v1/instructor/drafts` explicitly saves edited fields, retained topic
  and a successful generation ID belonging to the current instructor.
- `GET /api/v1/instructor/drafts` lists the owner's complete drafts in descending
  creation-time/ID order, 50 at a time, with a bounded optional offset.
- `GET /api/v1/instructor/drafts/:id` returns an owner-only draft DTO.
  Missing, foreign, non-DRAFT and incomplete records share the same safe 404.

Both instructor POSTs require an exact configured Origin and JSON content type
after server session/role checks. Save performs no publication or verification.

### Reviewed publication and withdrawal

`InstructorQuestions` is the server boundary for owner list/get, same-draft Save,
Publish, Remove and learner list/get. Both the long-running server and Netlify
function compose the real Prisma implementation. Missing composition returns503.
F01 draft contracts retain their literal DRAFT status and fresh-per-Save creation.

| HTTP boundary                                                        | Contract                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/v1/instructor/questions?status=DRAFT\|PUBLISHED\|ARCHIVED` | Own state list, max50 plus bounded offset/nextOffset                                        |
| `GET/PATCH /api/v1/instructor/questions/:id`                         | Full owner record; PATCH updates current DRAFT using expectedRevision                       |
| `POST /api/v1/instructor/questions/publish`                          | Confirmed saved or preview discriminated request; published/existing authoritative response |
| `POST /api/v1/instructor/questions/:id/remove`                       | Confirmed archive; repeated Remove returns retained archive                                 |
| `GET /api/v1/learner/questions[/:id]`                                | LEARNER-only currently published explicit public projection                                 |

All mutation guards enforce real session, role, configured Origin, JSON, strict
schemas, ownership and current state. Parent-first conditional updates and version
writes run in one short READ COMMITTED transaction. Save and initial saved Publish
increment the bounded revision once. Database time supplies first publication and
archive timestamps. Published/archived content is immutable; archive retains IDs,
version references, provenance, timestamps and preview key.

One lowercase UUID per preview workflow is retained in an owner-scoped unique
publication key. Same-key replay returns existing authority before new association
lookup, including an archived result. Only that named uniqueness collision permits
one authoritative reread after transaction abort. Ambiguous commit acknowledgment
is UNKNOWN, never inferred rollback. The client freezes an uncertain publication's
captured normalized payload/key/revision and retries that exact attempt.

New generation events store a server-private normalized-topic SHA256 digest.
Bound previews must match it; old unbound previews use Save/open/Publish or
regeneration. Existing saved drafts use their persisted fixed topic. This binds
topic association, not the correctness or original generation of edited content.
Shared validation rejects NUL/unpaired surrogates before hashing or persistence,
retains UTF16 maxima, trims prose and preserves code verbatim.

Learner selection and DTOs expose identity/title/topic/instructor display name/
publication time plus version ID/problem/buggy code/expected behavior in detail.
Solutions, explanations, generation metadata, author email, hints and attempts
are absent. A separate public renderer displays literal text. Get Hint is disabled
and performs no request.

UI routes are `/instructor/questions?status=...`, `/instructor/questions/:id`,
`/instructor/questions/new`, `/learner/questions` and `/learner/questions/:id`.
Legacy `/instructor/drafts[/:id]` URLs remain supported. The data-router discard
boundary covers Link/POP/New/reload/sign-out; beforeunload uses the browser warning.
An admitted editor stays mounted with mutations disabled after expiry. Identity
keys dispose prior editor memory before another identity receives an authorized
fresh read. No autosave or cross-reload recovery is implemented.

Apply the additive F02 migration before new code rollout; migration/function
deployment is not atomic. Its archive preflight stops existing undated archived
rows for owner reconciliation rather than inventing dates. Rollback disables new
routes while retaining additive fields and committed outcomes. Structural
old-schema/FK rehearsal is separate from public behavior integration tests.

Every response carries an `x-request-id`. Error bodies contain a stable code, recoverable message, request ID, and optional validation details. Internal stack traces, Prisma errors, provider responses, cookies, and credentials are not returned.

## Testing strategy

F02 checks include contracts, focused HTTP policy doubles, real-cookie/PG public
behavior, CAS races and real SQL rollback faults, PG wire faults for unavailable
replay reads/lost COMMIT acknowledgments, intercepted desktop/mobile UI, composed
browser cookies/PG/fake AI, and extracted Netlify publication/read/archive smoke.
The opt-in browser runtime's owned loopback transport proxy can drain one committed
publication success then drop the downstream response via a private marker; this
fault is outside production composition. See the F02 implementation handoff for
actual commands/results and remaining manual/CI limitations.

When defaults are occupied, set `E2E_APP_ORIGIN=http://127.0.0.1:5273` and
`E2E_BACKEND_PORT=3101`; the test origin validator allows only a bare HTTP loopback
origin. The harness forwards that backend port to Vite's test proxy. Defaults stay
5173/3001. Preserve unrelated listeners and always use a verified owned `_test`
database with matching direct/pooled/test/E2E URLs for composed checks.

- Contract tests cover accepted and rejected shared schemas.
- Vitest covers configuration parsing and AI response validation.
- Supertest covers probes, safe errors, unauthenticated access, revoked sessions, role checks, role-escalation rejection, deterministic AI output, and provider failures.
- Playwright covers the public page, authentication entry points, responsive rendering, and unauthenticated role-route behavior. Its opt-in `auth-real.spec.ts` additionally checks real local PostgreSQL password registration, session restoration, denied login, retry, and logout on desktop/mobile without response interception. Set `E2E_REAL_AUTH=1` and an owned migrated loopback `_test` target through `E2E_TEST_DATABASE_URL`; the default target is port 5433. Both browser/auth origins are 5173, and the harness awaits backend and proxied API health. SMTP/Google are disabled in this synthetic runtime; live-provider and production acceptance remain separate.
- CI runs PostgreSQL 17, applies committed migrations, seeds fixtures, and performs all deterministic checks before deployment.

Tests must not call Google, the NUS SoC LLM, Netlify, or production services.

`E2E_AUTH_COMPLETION=1` selects the private captured-outbox browser runtime.
Use an explicit owned `E2E_TEST_DATABASE_URL` and run
`npm run test:e2e -- tests/e2e/auth-completion.spec.ts --workers=1`; leave the
separate no-SMTP `E2E_REAL_AUTH` flag unset. Both role journeys use real local
HTTP, cookies and PostgreSQL without browser interception. Google authorization
is substituted by the test controller, with typed server exchange/profile
doubles; it is not live Google or successful UI initiation evidence. The
six-action feedback suite deliberately intercepts error/pending responses.

After a build, `node --import tsx scripts/verify-built-frontend.ts` checks the
emitted frontend on desktop/mobile using an owned ephemeral local preview with
only a synthetic anonymous API. It rejects page errors, external assets and
horizontal clipping across public auth routes. Hand-selected vendor chunks once
produced a circular initialization failure despite passing dev-server journeys;
Rollup now chooses the chunk graph. A bundle size warning is not suppressed.

Local packaging checks use the pinned CLI's real packager without site linkage or
deployment. After a local build, install/locate Netlify CLI 27.16.1, then run
`node scripts/package-netlify-artifact.mjs <absolute-netlify-cli-package.json>`.
The helper reads `netlify.toml`, retains included/external file settings, and emits
a ZIP and manifest under a fresh ignored `.netlify/node_modules/auth-smoke-*` directory. Extract
the ZIP and pass its `netlify/functions/api.mjs` to
`node --import tsx scripts/verify-netlify-artifact.ts <absolute-extracted-api.mjs>`.
Set explicit identical `TEST_DATABASE_URL`, `DATABASE_URL` and
`DATABASE_URL_POOLED` to an owned, migrated loopback `_test` database first. The
runner disables external credentials, creates/deletes only its synthetic user,
and checks readiness, both allowed/denied role access, cookies and revocation.
This executes the packaged application Web handler; it does not exercise AWS's
bootstrap or establish deployed-platform, live Google or SMTP correctness.

## Deployment

Netlify publishes `apps/frontend/dist` and packages `netlify/functions/api.ts`.
The default Web handler selects the modern ESM runtime for Prisma's
`import.meta.url`; a tested adapter preserves Express requests and auth cookies.
`/api/*` is rewritten to the Express function;
other paths fall back to `index.html`.

The contracts workspace builds first and exports JavaScript in production;
development conditions retain live TypeScript source. `npm ci` prepares its
compiled export before tests, so the Function never depends on an external
workspace TypeScript file being executable in the deployed artifact.

GitHub Actions provides:

- CI for formatting, linting, type-checking, Prisma validation/migrations/seed, tests, and builds;
- a production workflow restricted to `master` and the protected production environment.

Native Netlify owns trusted-team PR previews on the development site; there is no
duplicate GitHub preview deployment job. The dependency-free ignore command allows
that site's `deploy-preview` context and production-context builds from `master`.
It skips branch deploys and all production-site native builds before the build
command runs. Its `npm run build:netlify` validates
the development Supabase target, applies migrations, and builds before publishing.
Build metadata bundles each preview's exact origin with its Function. It contains
no secrets, and simultaneous PRs do not overwrite shared origin variables.

Google login uses Better Auth's dev-only OAuth proxy through the stable dev
callback. Configure the same dedicated proxy secret on stable dev and trusted
previews, and deploy stable dev first. Actual production cannot enable this proxy.
The stable dev callback updates automatically after merges to `master`, along
with the development frontend and API. It remains required for Google preview
login; PR builds publish their own preview URLs without replacing stable dev.
See [credential setup](CredentialsSetup.md#automatic-preview-origins-and-a-fixed-google-callback)
for the required one-time dashboard configuration and trust boundaries.

The production workflow installs dev build tools explicitly, applies migrations,
and deploys the immutable build with `--no-build`. Keep native production Git
builds disabled so they cannot bypass the protected GitHub environment. A
migration failure stops publication. Schema changes must remain backward-compatible
with running deployments because migration and function deployment are not atomic;
all development previews still share one development database.

The production CLI command explicitly selects `@debugclinic/frontend` using
`--filter`; otherwise a noninteractive runner stops at workspace selection.
It passes absolute publish and Functions paths because selecting a
workspace changes the CLI working directory for relative Functions arguments.
Netlify CLI 27.16.1 rejects `--context` together with `--no-build`. The job sets
`CONTEXT=production` in its environment and uses `--no-build --prod` to upload
the existing artifact without invoking another build.

If `debugclinic-prod` reports "Production must use the protected GitHub workflow,
not a native Netlify build", its native builds are still active. On that site,
open **Project configuration → Developer settings → Continuous deployment → Build
settings → Configure**, then set **Build status → Stopped builds**. This still
allows GitHub's CLI deployment. Keep native builds active on `debugclinic-dev`.
Do not remove the production guard or confuse this setting with stopping auto
publishing. After the corrected workflow reaches `master`, run **Deploy production**
from GitHub Actions on `master`; retrying an old failed job uses its old workflow.

References: [Netlify deploy flags](https://cli.netlify.com/commands/deploy/),
[stopping native builds while allowing CLI deploys](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/).

## Security notes

- Arbitrary Python execution is intentionally absent. It requires a separately specified sandbox with CPU, memory, time, filesystem, process, and network isolation.
- Rate limiting is process-local in this milestone; production should use a shared backend or platform control to remain effective across function instances.
- Authentication audit tables exist, but Better Auth event hooks still need to be wired after email and OAuth flows are verified.
- Provider usage tables exist, but live SoC usage writes await the official contract.
- Account-linking behavior must be tested against the final Google configuration before production launch.

## Acknowledgements

- [Better Auth documentation](https://better-auth.com/docs/) informed the Express, Prisma, cookie, session, and Google authentication foundation.
- [Netlify Express documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/) informed the `serverless-http` function adapter and rewrite.
- [Prisma Netlify deployment documentation](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-netlify) informed the pooled application connection requirement.
- React, MUI, Express, Prisma, Zod, Vitest, Supertest, and Playwright are used under their respective licenses.
