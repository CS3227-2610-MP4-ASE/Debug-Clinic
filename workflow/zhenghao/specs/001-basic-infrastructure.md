# Specification 001: Basic infrastructure

## Goal

Provide a secure, testable foundation on which learner and instructor feature specifications can be implemented without reorganizing the repository or replacing core boundaries.

## Non-goals

- Full exercise authoring, publication, attempt, coaching, submission, or review behavior
- Arbitrary Python execution
- Live Google, email, SoC LLM, managed PostgreSQL, or Netlify verification
- Production creation or secret management

## Functional requirements

1. A React/MUI shell exposes public, authentication, learner, instructor, forbidden, and not-found routes.
2. Express exposes health/readiness probes and versioned protected routes.
3. Better Auth provides Google and email/password foundations using database sessions.
4. PostgreSQL/Prisma models the canonical DebugClinic workflow and auth records.
5. Zod contracts are shared across browser and server boundaries.
6. AI access is backend-only and defaults to an offline fake.
7. Netlify and GitHub Actions keep preview and production configuration separate.

## Security requirements

- Roles cannot be set through public account or profile input.
- API middleware enforces authentication and instructor-only access.
- Cookies are HttpOnly and production-secure; CSRF checks remain enabled.
- Inputs and structured AI outputs are validated.
- Logs and client errors do not disclose credentials, cookies, learner code, private prompts, or provider payloads.
- Tests remain isolated from external services.

## Threats considered

| Threat                             | Current control                                        | Remaining work                                  |
| ---------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Client role tampering              | Strict schemas, Better Auth non-input role, API RBAC   | Test final administrative role flow             |
| Session theft/replay               | HttpOnly/Secure cookies, expiry, DB revocation         | Verify final domains and OAuth callbacks        |
| Login CSRF                         | Better Auth origin/CSRF checks, SameSite cookies       | Live OAuth tests                                |
| Brute force                        | Route rate-limit hook                                  | Shared production limiter                       |
| Prompt injection/invalid AI output | Backend boundary and Zod output validation             | Provider-specific prompt hardening/evaluations  |
| Secret leakage                     | env placeholders, redaction, safe errors, `.gitignore` | Secret scanning in hosted CI                    |
| Unsafe code execution              | Feature excluded                                       | Separate sandbox specification                  |
| Preview touching production        | Separate secret names and environments                 | Configure protected GitHub/Netlify environments |

## Acceptance criteria

- A clean clone can install, generate Prisma Client, build, lint, type-check, and run deterministic tests.
- A local PostgreSQL instance can apply the committed migration and seed deterministic fixtures.
- Public pages render and protected routes reject unauthenticated/wrong-role users.
- The fake AI provider returns validated deterministic data; malformed output and failures are not shaped as success.
- External integrations are clearly identified as unverified.
