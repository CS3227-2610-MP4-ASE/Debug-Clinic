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
- Public registration cannot supply `role`; new accounts default to `LEARNER`.
- Instructor access is assigned through a controlled seed or future administrative process.
- Frontend route guards improve navigation, but Express authorization middleware is the security boundary.

Verification and reset email delivery use Nodemailer over authenticated SMTP,
defaulting to a dedicated Gmail mailbox over TLS on port 465. Configuring
`SMTP_USER` and `SMTP_PASSWORD` enables mandatory verification for email/password
accounts; both are required in production. `EMAIL_FROM` defaults to `SMTP_USER`
and must match it when using Gmail. Gmail app-password setup and production
callback URLs remain team-owned configuration. No domain/DNS setup is needed for
the Gmail sender. See
[CredentialsSetup.md](CredentialsSetup.md).

## Data model

The Prisma model includes authentication records plus versioned exercises, ordered hints, attempts, AI feedback, reviews, AI usage, and authentication audit events.

The initial SQL migration adds checks that Prisma cannot express directly:

- hint and feedback stages remain between 1 and 3;
- final submissions require `finalSubmittedAt`;
- published exercises require `publishedAt`;
- usage counters cannot be negative.

The requirement that a published version have exactly three approved hints requires a transaction-level service check; a row-level SQL constraint cannot count sibling rows safely.

## AI adapter

`AiProvider` isolates product code from provider-specific transport. Local
development and tests use `FakeAiProvider`, which is deterministic and offline.
`SocLlmProvider` implements the official SoCLaaS bearer-authenticated chat API,
validates structured message content, owns the response stage/request identity,
and uses an overall deadline with bounded transient retries. Tests inject an
offline transport; a live key and chat model are still required for acceptance.

All AI requests originate from the backend. Input and structured output use Zod
contracts, errors are mapped to non-secret responses, and request logging redacts
learner code and reasoning. Quota persistence and usage-event writes remain
future feature work.

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

Every response carries an `x-request-id`. Error bodies contain a stable code, recoverable message, request ID, and optional validation details. Internal stack traces, Prisma errors, provider responses, cookies, and credentials are not returned.

## Testing strategy

- Contract tests cover accepted and rejected shared schemas.
- Vitest covers configuration parsing and AI response validation.
- Supertest covers probes, safe errors, unauthenticated access, revoked sessions, role checks, role-escalation rejection, deterministic AI output, and provider failures.
- Playwright covers the public page, authentication entry points, responsive rendering, and unauthenticated role-route behavior.
- CI runs PostgreSQL 17, applies committed migrations, seeds fixtures, and performs all deterministic checks before deployment.

Tests must not call Google, the NUS SoC LLM, Netlify, or production services.

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
only that site's `deploy-preview` context. It skips native master, branch, and
production-site builds before the build command runs. Its `npm run build:netlify` validates
the development Supabase target, applies migrations, and builds before publishing.
Build metadata bundles each preview's exact origin with its Function. It contains
no secrets, and simultaneous PRs do not overwrite shared origin variables.

Google login uses Better Auth's dev-only OAuth proxy through the stable dev
callback. Configure the same dedicated proxy secret on stable dev and trusted
previews, and deploy stable dev first. Actual production cannot enable this proxy.
The stable dev callback is a separately bootstrapped service; it is not updated
automatically on master pushes. Retain its existing deployment for Google preview
login, or explicitly replace this callback design before removing it.
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
