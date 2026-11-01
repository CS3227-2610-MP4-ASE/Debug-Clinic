# Verification 001: Basic infrastructure

Date: 2026-11-01

Historical report for the initial scaffold. The limitations below were revisited
in [Verification 002](002-limitations-resolution.md), which records the current
Node 24, PostgreSQL 17, dependency audit, and integration status.

## Verified locally

| Check                       | Result                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| `npm run format:check`      | Passed                                                                           |
| `npm run lint`              | Passed with zero warnings                                                        |
| `npm run typecheck`         | Passed for backend, frontend, contracts, and Netlify function                    |
| `npm run db:generate`       | Passed with Prisma 7.10.1                                                        |
| `npm run db:validate`       | Schema valid                                                                     |
| `npm test`                  | 15 of 15 tests passed across 3 files                                             |
| `npm run test:e2e`          | 6 of 6 Chromium desktop/mobile tests passed                                      |
| `npm run build`             | Backend and frontend production builds passed                                    |
| `git diff --check`          | Passed                                                                           |
| production dependency audit | `npm audit --omit=dev` reported 0 vulnerabilities                                |
| bounded secret-pattern scan | No private-key, AWS access-key, GitHub token, or OpenAI-style key patterns found |
| independent finish review   | `ship`; all six findings resolved with no desktop/mobile regressions             |
| design documentation review | Passed with no remaining factual mismatch                                        |

The frontend build emits multiple bounded chunks; the largest emitted JavaScript
chunk was approximately 273 kB before gzip. Vite also reported harmless
third-party Zod comment-annotation warnings during bundling.

## Corrected during verification

- Prisma generation originally required an environment variable even though it
  does not contact PostgreSQL. The Prisma CLI now falls back to the documented
  local Compose URL; every checked-in hosted workflow still sets an explicit
  environment-scoped URL.
- The first browser rerun caught a stale heading assertion after product copy
  was clarified. The expectation was updated and the complete desktop/mobile
  suite then passed.
- The finish review required a self-hosted display font, truthful future-state
  workflow copy, a persistent design contract, stronger focus treatment, a
  session retry action, and removal of a development badge. All six were
  implemented before final acceptance.
- The final documentation review aligned the motion and reduced-motion tokens,
  44px control targets, semantic green usage, surface radius, and machine-readable
  token sidecar with the shipped source before returning a clean pass.

## Environment limitations

- The workstation does not have the `docker` command. The committed initial SQL
  migration and seed could therefore not be applied to a real local PostgreSQL
  container in this session. CI is configured with PostgreSQL 17 to run
  `prisma migrate deploy` and `prisma db seed`; that hosted run remains pending.
- The local runtime was Node.js 26.8.1, while the repository intentionally pins
  Node.js 24 in `.nvmrc` and `engines`. npm emitted an engine warning during
  installation, but all local non-database checks passed. CI uses Node.js 24.
- The full dependency audit reports 12 moderate advisories in the development
  ESLint/typescript-eslint `minimatch` chain. npm proposes a breaking downgrade
  to ESLint 4, so it was not applied. Production dependencies report zero known
  vulnerabilities.

## Deliberately unverified external behavior

No Google OAuth, email delivery, NUS SoC LLM, managed PostgreSQL, Netlify,
GitHub environment, preview deployment, production deployment, or remote branch
was created or exercised. Those checks require human-owned credentials,
provider contracts, and protected environment configuration.
