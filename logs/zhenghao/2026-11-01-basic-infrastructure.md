# Infrastructure, authentication, and deployment foundation — 1–2 November 2026

## Request and constraints

The initial request established DebugClinic as a secured React/Express application with learner and instructor roles, shared contracts, PostgreSQL persistence, a backend-only AI boundary, automated tests, and separate preview/production deployment paths. Work belonged on `zh-infra-setup`, with concern-separated commits and honest labels for unfinished product workflows. Live Google, email, SoCLaaS, managed PostgreSQL, Netlify, and production changes were initially outside the verified scope.

The repository does not retain the originating Codex thread ID, so this episode is reconstructed from the committed specification, decisions, verification records, Git history, and PR metadata rather than presented as an exact transcript.

## Material decisions and prompt evolution

- npm workspaces separate the React/MUI frontend, Express backend, and shared Zod contracts.
- Better Auth and Prisma/PostgreSQL provide database-backed identity and sessions. Public input cannot select a role.
- Netlify serves the Vite frontend and packages the Express Web handler; GitHub Actions owns the protected production path, while native Netlify builds are limited to development previews.
- The AI provider boundary stays in the backend. Deterministic fake-provider tests are not evidence of live SoCLaaS usefulness.
- The first infrastructure pass explicitly excluded complete authoring, publication, learner-attempt, coaching, submission, and review workflows.

Later owner directions and verification changed parts of the foundation without changing those boundaries. Docker was discovered inside Docker Desktop rather than on `PATH`; a standalone Node 24.22.2 runtime replaced the initially observed Node 26 verification environment; the mail transport moved from a Resend design to Gmail SMTP; and deployment commands were corrected after the pinned Netlify CLI rejected the original prebuilt-production flag combination.

Impeccable was adopted as an external UI/design skill. The record shows its detector and visual review being used; it does not show Zhenghao authoring Impeccable. Its mechanical detector was treated as a structural check, with separate desktop/mobile inspection.

## Work and verification

The initial scaffold added the monorepo, role-aware shell, API/auth/data foundation, offline AI provider, PostgreSQL migration/seed, Netlify functions, CI/deployment workflows, tests, guides, and design/product records. Subsequent work added real local PostgreSQL/Better Auth tests, provider transport logic, Gmail SMTP configuration, OAuth-preview routing, packaged-Function fixes, and seven review-driven security/reliability repairs.

Important failures were retained rather than rewritten as a clean first pass:

- Prisma generation initially required a database variable even though it was offline; database-connected commands were changed to require an explicit verified URL.
- A browser assertion became stale after visible copy changed, and an exact label query failed because of MUI's required marker.
- Packaged ESM resolution and compiled shared-contract exports required repair.
- A production deployment dry-run did not expose that `--no-build` rejects `--context`; the final job uses `CONTEXT=production` with `--no-build --prod`.
- PR review found loopback URL mismatches, credential-bearing URL logging, unsafe raw-JSON error mapping, hidden OAuth errors, and premature client-side sign-out. The fixes were verified locally.

Observed final local evidence in the infrastructure records includes Node 24.22.2 formatting/lint/typecheck/build passes, zero reported dependency vulnerabilities, 81 unit/API tests, 16 browser tests, and disposable PostgreSQL integration checks with three integration tests for the final review-fix checkpoint. Earlier checkpoints have smaller test counts and must not be added to these as independent cases. Provider/browser doubles did not establish live Google, SMTP, SoCLaaS, managed-database, Netlify, or production behavior.

## Outcome

PRs [#1](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/1), [#2](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/2), and [#3](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/3), all from `zh-infra-setup`, merged into `master` on 1–2 November 2026 at merge commits `08a3a507`, `36db1353`, and `c5519060`. The current master contains the resulting foundation, but current source—not those historical branches—is authoritative for present behavior.

## Primary references

- [Specification 001](../../workflow/zhenghao/specs/001-basic-infrastructure.md)
- [Initial verification](../../workflow/zhenghao/verification/001-basic-infrastructure.md)
- [Limitations resolution](../../workflow/zhenghao/verification/002-limitations-resolution.md)
- [Gmail SMTP verification](../../workflow/zhenghao/verification/003-gmail-smtp.md)
- [PR review fixes](../../workflow/zhenghao/verification/004-pr-review-fixes.md)
- [Architecture decisions](../../workflow/zhenghao/decisions/001-monorepo-layout.md)

This AI-generated summary was checked against those records, the three merge commits, and GitHub PR metadata. The unavailable originating conversation remains a coverage gap.
