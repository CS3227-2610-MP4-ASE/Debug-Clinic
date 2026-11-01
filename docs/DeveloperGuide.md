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

Verification and reset email delivery use the backend Resend adapter. Configuring
`RESEND_API_KEY` and `EMAIL_FROM` enables mandatory verification for email/password
accounts; both are required in production. Google credentials, verified sender
DNS, and production callback URLs remain team-owned configuration. See
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

Netlify publishes `apps/frontend/dist` and packages `netlify/functions/api.ts`. `/api/*` is rewritten to the Express function; other paths fall back to `index.html`.

GitHub Actions provides:

- CI for formatting, linting, type-checking, Prisma validation/migrations/seed, tests, and builds;
- an internal-PR-only deploy-preview workflow using a protected preview environment;
- a production workflow restricted to `master` and the protected production environment.

The production workflow applies migrations before deploying. A migration failure stops the job. Database schema changes should remain backward-compatible with the currently running deployment because migration and function deployment are not atomic.

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
