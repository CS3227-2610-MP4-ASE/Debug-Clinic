# Authentication handoff for Dev 1

Status: local implementation complete; independent functional, coding-standards and security reviews pass.
Recorded: 4 November 2026, Asia/Singapore.
Application checkpoint: `a1645b9d42ccaed896bf94ba571713dbd9eb6a41`, branch `royden/auth-completion`.
Stacked prerequisite parent: `441838145f719f02810737fc435c4b59c2682901`.
This permitted handoff contains application/test observations, not Developer 2 SDD. Apply the repository's access exclusions before inspecting the branch. The owner authorized feature-branch push after final inspection on 4 November; merge, deployment and production changes remain separately authorized operations.

The branch includes the committed agent-workflow and authentication-prerequisite
parents. Compare against current `origin/master` for the complete integration;
compare against the prerequisite parent above for the authentication feature alone.
No workflow machinery changed in the authentication feature slice.

## Delivered behavior

- Explicit public Learner/Instructor choice for initial password and Google registration. The stored role remains immutable.
- One trim/lowercase email identity, preserving dots/aliases and verified Google/password association. Google-first users establish a password through recovery.
- Verification/resend, forgot/reset, completion/error screens, safe messages, retry/loading/focus and truthful session restoration/sign-out.
- Browser-bound Google intent, real transaction/constraint protection, replay/race defenses and safe exception boundaries.
- Repairs for packaged core-module resolution and an emitted frontend chunk-initialization failure. The configured build now loads actual emitted pages successfully.

Release compatible frontend/backend together: initial registration now requires `registrationRole`. Keep the exact compatible core dependency at both backend and root runtime locations and retain the verified lockfile. A backend-only installation originally failed flattened package resolution; the rebuilt actual ZIP passes.

## Final local verification

Node24.14.0/npm11.9.0; owned PostgreSQL16.15 on `127.0.0.1:55434/auth_completion_test`.

| Check                                                | Result                                          |
| ---------------------------------------------------- | ----------------------------------------------- |
| Unit/API                                             | 142 passed                                      |
| Real PostgreSQL integration                          | 42 passed                                       |
| Complete desktop/mobile journeys                     | 10 passed                                       |
| Browser feedback/regression                          | 58 passed; 12 explicit opt-in skips             |
| Lint/typecheck/format, production build/declarations | Pass                                            |
| Emitted frontend public routes/keyboard/focus        | 16 route/viewport loads plus deeper checks pass |
| Actual ZIP/extracted application Web handler         | All smoke checks pass                           |
| Existing agent-workflow regressions                  | 34 passed; workflow machinery unchanged         |

In the automated suite, Google's external authorization hop is controller-substituted and exchange/profile boundaries use typed doubles. The private captured outbox proves callback/link handling, not SMTP receipt. Complete journeys use real local HTTP, cookies and database without browser interception; feedback cases deliberately intercept responses. Package smoke loads the extracted application Web handler, not AWS bootstrap. The separate live Google observation below supplements these results; neither establishes deployed readiness.

Reproduce using an explicitly verified owned, migrated loopback `_test` database. Set identical `TEST_DATABASE_URL`, `DATABASE_URL`, `DATABASE_URL_POOLED`; browser runs also require `E2E_TEST_DATABASE_URL`. Never substitute a production target.

- `npm test`, `npm run test:integration`, `npm run lint`, `npm run typecheck`, `npm run format:check`.
- Set `E2E_AUTH_COMPLETION=1`, leave `E2E_REAL_AUTH` unset, then `npm run test:e2e -- tests/e2e/auth-completion.spec.ts --workers=1`.
- Clear `E2E_AUTH_COMPLETION`, then `npm run test:e2e -- --workers=2` for the separately labelled feedback set.
- `npm run build`, then `node --import tsx scripts/verify-built-frontend.ts`.
- Actual ZIP build/extraction/runtime procedure: public [Developer Guide](../../../docs/DeveloperGuide.md).

The owned PG cluster and app/preview ports3001/5173/5174 were stopped/cleared after verification; pre-existing PostgreSQL was not targeted. Ignored raw packages and stopped disposable data remain local. The first unit worker-exit failure was retained; the unchanged rerun and final142-case run passed.

## Production diagnosis remains owner work

Local follow-up on 4 November: with separate user approval, created the Google
Web client **DebugClinic Local Development** in project `debug-clinic`, using
origin `http://127.0.0.1:5173` and callback
`http://127.0.0.1:5173/api/auth/callback/google`. Credentials are stored only in
the ignored local `.env`; the existing shared client is unchanged. After API
restart, local readiness and Google initiation both returned HTTP200 with the
approved callback. The user then completed real Google registration. Read-only
inspection at approximately13:10 Singapore time confirmed a new email-verified
Instructor identity, one Google provider account, no password provider account,
and one active session in the explicitly verified owned loopback test database.
The actual browser loaded the protected `/instructor` workspace with Sign out
available. This establishes local Google registration/callback/session acceptance
for that one role and account; returning Google login, live Learner registration,
same-email association and live sign-out were not exercised in this follow-up.
SMTP is still disabled. Local services remain running for manual tests. Full configuration
evidence: [local Google setup](../../evaluations/royden/MP4-D2-AUTH/google-local-setup.md).

Read-only observations on **3 November 2026**, approximately21:17/21:40 Singapore time: homepage and `/api/health`200, `/api/ready`503 with database not ready, anonymous `/api/v1/me`401. Anonymous get-session200 did not prove database-backed authentication. Reported registration/Google fallback causes remain unknown; local defects found here do not establish their deployed cause.

After separate owner authorization:

1. Inspect the published API function logs while reproducing readiness. Verify actual runtime target availability: application traffic prefers `DATABASE_URL_POOLED`, otherwise `DATABASE_URL`. A migration/build success does not establish function-runtime connectivity. Record sanitized codes and request IDs, not secrets or raw private exceptions.
2. Set production `APP_ORIGIN`, `CORS_ORIGINS` and `BETTER_AUTH_URL` for `https://debugclinic-prod.netlify.app`; verify the stable production `BETTER_AUTH_SECRET`. Configure server-side `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Netlify using a Web client authorized for that production origin and exact callback `https://debugclinic-prod.netlify.app/api/auth/callback/google`. Verify the existing production client's settings rather than replacing shared credentials unnecessarily. The newly created **DebugClinic Local Development** client only authorizes loopback and must not be copied into production. Never put secrets in `VITE_*` variables or Git. The development preview proxy is not production configuration.
3. Verify runtime `SMTP_USER`, `SMTP_PASSWORD`, SMTP transport and `EMAIL_FROM`; Gmail sender must match its authenticated mailbox. Accepted API requests do not prove mailbox receipt.
4. Authorize the data transition and compatible application release, then require readiness200 and controlled real password/Google registration for both roles, verification/reset receipt and links, Google-first recovery, returning identity/role preservation, denied access, restore and sign-out. Record deployed checkpoint/time separately from local evidence. CI remains unobserved until an actual run.

The protected GitHub production job also reads `PRODUCTION_*` secrets and
`PRODUCTION_APP_ORIGIN` / `PRODUCTION_EMAIL_FROM` variables for build/deployment.
Keep these consistent with the corresponding unprefixed Netlify runtime values;
setting only one side is insufficient. See the exact mapping in
[credential setup](../../../docs/CredentialsSetup.md#7-github-deployment-environments).

Final publication inspection and retained-check evidence:
[publication inspection](../../evaluations/royden/MP4-D2-AUTH/publication-inspection.md).

Before data transition, the database owner must pause old/new auth writers, back up and preflight **all** JavaScript-canonical emails. Stop on any collision: never merge/delete users or select a winning role automatically. Preserve stable IDs/roles/relationships, use a protected rollback map outside Git, revoke sessions and database-backed reset/OAuth/intent artifacts, then enable compatible canonical writers. Stateless verification JWTs may remain valid until expiry only for their intended identity. The provided CLI is deliberately **local rehearsal only**; prepare a separately validated/authorized production operator procedure instead of weakening the test guard. Rollback must not restore stale tokens/sessions or re-enable incompatible writers.

No paid project membership or credentials are requested from Developer 2. Do not publish secrets, database URLs, cookies, tokens or token-bearing links in handoff evidence. This document does not authorize deployment or infrastructure/data changes.
