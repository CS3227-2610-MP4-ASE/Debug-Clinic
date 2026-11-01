# Verification 002: Infrastructure limitations

Date: 2026-11-01. Supersedes the environment limitations in Verification 001.

## Resolved local limitations

| Original limitation         | Current evidence                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Docker unavailable          | Docker Desktop was installed outside PATH. Its CLI and daemon were verified; PostgreSQL 17 containers ran successfully.                                                                                                              |
| Migration/seed untested     | Initial migration applied successfully to a fresh PostgreSQL 17 database. Seed ran twice, preserving two fixture users and three hints. Database check constraints rejected invalid hint stages and publication without a timestamp. |
| Node 26 verification        | All final checks ran under isolated Node 24.22.2, preserving the system runtime. The old Homebrew Node 24 binary was unusable because its linked simdjson library no longer exists.                                                  |
| 12 moderate lint advisories | Updated ESLint 10.14.0, @eslint/js 10.0.1, and typescript-eslint 8.72.1. A minimatch override resolves all consumers to 11.0.3. Full `npm audit` reports zero vulnerabilities; lint passes.                                          |

`npm run db:verify` repeats the PostgreSQL verification on a random loopback port
and removes only its own disposable container. The image remains cached.

## Integration work and exact remaining boundary

- Google OAuth was already implemented. Its client and exact callback setup are
  now documented. Actual Google consent and callback acceptance still require a
  team-owned Google client and a test user.
- Email verification and password reset are now wired through a Resend adapter.
  Real Better Auth/Prisma tests use an injected outbox to verify registration,
  verification-before-login, strict learner role assignment, successful login,
  password reset, and immediate session revocation. Actual mail delivery needs a
  Resend key and verified sender domain. Production configuration rejects missing
  delivery credentials. The registration UI explains the verification step.
- SoCLaaS transport now follows the [official API contract](https://soclaas.comp.nus.edu.sg/guides/api.html).
  Offline tests check request fields, structured output, transient retry limits,
  unauthorized failure, malformed output, and overall timeout. A live key and
  chat-capable model ID remain required for provider acceptance.
- Managed PostgreSQL credentials remain unconfigured. Local PostgreSQL 17 proves
  the migration/schema/client path; it does not prove the remote provider's TLS,
  networking, pooling, or permissions.
- GitHub CLI authentication is valid. Read-only checks returned no configured
  repository secrets or environments. No remote settings were changed.
- Netlify runtime secrets are distinct from GitHub job secrets. The exact
  mappings, Function scopes, preview alias/callback constraints, and production
  branch restriction are documented and reflected in the workflow configuration.
  No live site, deployment, or Netlify credential was verified.

Follow [CredentialsSetup.md](../../docs/CredentialsSetup.md) to enter the values.
Live acceptance is pending those values; no placeholder credential is treated as
a successful live integration.

## Final checks

- Node 24.22.2: formatting, lint, complete type-checking, build, and diff checks.
- 25 unit/API/provider tests passed.
- 2 real PostgreSQL/Better Auth integration tests passed.
- 8 desktop/mobile browser tests passed, including the verification-required
  registration notice.
- Configuration checker accepts isolated test settings and rejects production
  without mail credentials without printing secret values.
- Prisma database-connected commands fail when `DATABASE_URL` is absent.
- Full dependency audit: zero vulnerabilities.

The database smoke test first exposed a missing explicit URL in the invocation.
No connection/migration succeeded on that attempt. Prisma now disallows implicit
database targets for connected commands, and the repeatable verifier passes only
its own container URL. The browser test also exposed exact label matching against
MUI's required marker; semantic role queries fixed the test. Lessons are recorded
in `AGENTS.md`.
