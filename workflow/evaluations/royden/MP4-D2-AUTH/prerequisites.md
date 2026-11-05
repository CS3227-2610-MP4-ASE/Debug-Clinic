# Authentication prerequisite verification

Date: 3 November 2026, Asia/Singapore. Feature: MP4-D2-AUTH. Contributor: Royden / Developer 2.
Branch: royden/auth-prerequisites; exact parent 579e43cbb69758a385a4f3792b4b58afca987975.

## Authority and scope

Owner explicitly requested diagnosing/fixing the existing prerequisites before feature work, then directed local progress with Dev 1 production handoff because Netlify is owned by Dev 1. This checkpoint changes only Playwright configuration, related tests and truthful verification documentation. It does not implement the pending expanded authentication product or waive its package gates. Workflow skills, role configuration, monitor tooling and evaluation machinery remain untouched.

## Reproduced causes and repairs

- Baseline browser origin 5173 versus APP_ORIGIN/CORS_ORIGINS/BETTER_AUTH_URL 4173: imported-config regression 5 failed before repair. Use one origin.
- Genuine browser registration returned 500 because Vite proxy encountered ECONNREFUSED while the watching backend was not listening. Direct same-environment backend registration returned 200. Final test setup starts backend directly using Node/tsx without watch or .env loading, awaits backend health, starts strict-port Vite, and awaits proxied API health. Do not claim the underlying watch-process mechanism is proven.
- Independent review P1: PostgreSQL connection-string query parameters overrode the authority host after the original validator accepted it. Reject all query strings/fragments; regress remote-host, encoded-key, socket, database and other parameter cases.
- Independent review P2: inherited VITE_API_BASE_URL could direct browser auth elsewhere despite local health probes. Explicitly clear it for both servers and verify a hostile-parent-env browser run remains local.

Security corrections were test-isolation repairs, not production configuration changes. The expanded regression demonstrated 7 failures/19 passes before correction, then 26 passes.

## Final checks and evidence boundaries

Node 24.14.0; npm 11.9.0; Playwright 1.64.1; PostgreSQL 16.15.

| Check                                                               | Execution                                                      | Result                                               |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| npm test                                                            | Coordinator; full Vitest suite                                 | 114/114 pass, 11 files                               |
| npm run lint                                                        | Coordinator; full repository ESLint                            | pass                                                 |
| npm run typecheck                                                   | Coordinator; all workspaces/functions/integration types        | pass                                                 |
| Scoped Prettier check of changed source/docs                        | Coordinator                                                    | pass                                                 |
| git diff --check                                                    | Coordinator and independent reviewer                           | pass                                                 |
| Final imported Playwright config regression                         | Prerequisite writer                                            | 26/26 pass                                           |
| Genuine password browser spec                                       | Prerequisite writer, desktop 1280x720 + Pixel 7 actual 412x839 | 2/2 pass                                             |
| Genuine desktop with inherited VITE_API_BASE_URL=http://127.0.0.1:1 | Prerequisite writer                                            | 1/1 pass after isolation repair                      |
| Default browser smoke                                               | Prerequisite writer                                            | 16 pass, 2 explicitly skipped opt-in real-auth cases |

The first coordinator full-suite attempt could not start tests due Windows sandbox temporary-file rename EPERM errors. Rerunning the unchanged command outside the sandbox passed 114/114; this was an environment failure, not a test-expectation change. No test was weakened.

Genuine browser command, run only with a prepared owned local test database:

```powershell
$env:E2E_REAL_AUTH='1'
$env:E2E_TEST_DATABASE_URL='postgresql://debugclinic:debugclinic@127.0.0.1:55433/debugclinic_test'
npm run test:e2e -- tests/e2e/auth-real.spec.ts --workers=1
```

The URL above is a disposable synthetic local fixture, not a published account credential. The writer verified listen_addresses 127.0.0.1, port 55433 and database debugclinic_test before existing migrations/seed. Browser assertions include readiness 200, registration 200, correct learner identity, HttpOnly/Lax cookie, reload/session restoration, logout/revoked-session 401, wrong-password 401 and successful retry 200. There are no intercepted network responses in this spec. SMTP and Google are disabled: verification-email/Google and full future feature coverage are not established.

The existing service on 5433 was preserved; owned cluster 55433 and app listeners 3001/5173 were stopped. Ignored cluster/diagnostic logs remain in .workflow-state/auth-prerequisite-tests. Early screenshots were overwritten by later Playwright runs; original failure output survives in the explicitly mapped private writer session. Do not claim retained screenshots for those failures.

## Independent review and measurements

Actual dispatch: generic collaboration agents with fresh scoped packets, no named TOML selector or model override. AUTH-PRE-TEST-01 and its targeted repair were performed by /root/auth_prerequisite_tests. AUTH-PRE-REVIEW-01/02 by /root/auth_prerequisite_review.

Review round1: functional changes required; standards changes required (P1 database query override, P2 inherited API URL). First targeted correction re-review: functional pass, standards pass, both findings closed and no new actionable finding. Reviewer inspected frozen hashes, source and database parser without database operations; browser executions are writer evidence, not reviewer-run results.

Prerequisite assignment took approximately 19 minutes versus 15-minute soft estimate before the review repair. Dependency/sandbox/startup repairs account for extra work; no criteria were reduced. Initial overall planning token/elapsed soft estimates were exceeded; exact per-response accounting and unsupported-schema limitations remain in private monitor reports. No subscription-billing or causal-efficiency claim is made. Raw telemetry/manifests stay outside Git.

## Production and remaining work

Production readiness was 503 at 21:17/21:40 Singapore time; cause remains unknown. The homepage/health 200 and anonymous no-session response do not establish successful database-backed auth. Production database/configuration diagnosis, controlled Google/email acceptance, any authorized data transition/deployment and CI observation are Dev 1 handoff items. No push, merge, deployment, production database operation or live-provider call occurred in this checkpoint. Full feature implementation remains subject to reviewed package approval and package-bound authorization.
