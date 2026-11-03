# Authentication prerequisite handoff for Dev 1

Status: local prerequisite repair verified and independently reviewed; production diagnosis remains pending owner access.
Date: 3 November 2026, Asia/Singapore.
Branch: royden/auth-prerequisites. Parent: 579e43cbb69758a385a4f3792b4b58afca987975.
This concise handoff uses application code, tests, and sanitized observations; it does not include Developer 2 SDD.

## Production observations and required owner checks

Read-only probes at approximately 21:17 and 21:40 Singapore time:

- Homepage and /api/health: HTTP200.
- /api/ready: HTTP503, DEPENDENCY_UNAVAILABLE, "The database is not ready".
- Unauthenticated /api/v1/me: HTTP401 (expected).
- Anonymous /api/auth/get-session at 21:40: HTTP200, no session (does not prove database-backed auth).
- Example readiness request ID: 01M6GT7936XY9AMDAG5XYMNKE3.
- User reported registration and Google-start fallback messages. Their root causes are unconfirmed.
- The requesting Developer 2 has no access to the Dev 1-owned Netlify project; paid membership is not required to continue local work.

Dev 1 should:

1. Inspect the published production api function logs while reproducing readiness and a controlled Google/password flow. Capture sanitized database/provider error codes; the readiness route currently replaces its caught database error with a generic message, so a readiness-only log may be insufficient.
2. Verify function-runtime database settings and target availability. Application runtime uses DATABASE_URL_POOLED when present, otherwise DATABASE_URL; migrations and a successful CI build do not prove the deployed function's runtime connection.
3. Verify Google production client/callback and SMTP function-runtime settings after database readiness succeeds. Do not infer their correctness from mocked tests.
4. Complete controlled registration, verification delivery, password login, Google login, session restoration and sign-out after an explicitly authorized deployment. Record provider outcomes separately from local tests.

Do not paste secrets, connection strings, cookies, tokens or token-bearing callback URLs into issue/chat evidence. Do not change settings, run migrations or deploy solely because this document lists diagnostic checks; owner authorization remains required.

## Local prerequisite repair

Confirmed baseline browser/auth-origin mismatch: browser 5173 versus auth 4173. Scoped repair uses one browser/auth origin, explicit Vite host/port, no unknown-server reuse, a validated loopback *_test database override that rejects query strings/fragments, and disabled external-provider credentials/API-base overrides in the synthetic harness.

A real local-browser check additionally exposed a startup race: Vite accepted requests before the backend listened, causing proxy ECONNREFUSED and registration500. Direct same-environment backend registration succeeded. The harness now starts a direct non-watching Node/tsx backend and awaits backend plus proxied API health. The precise reason the watch subprocess stalled under the harness remains unproven; no application-auth code fix was needed.

Final origin/isolation regression: 26 passed. Full Vitest suite: 114 passed across 11 files. Full lint, workspace typecheck, scoped formatting and diff whitespace checks passed. Independent functional and coding-standards review passed after two test-isolation findings were corrected.

Real PostgreSQL password-browser journey: desktop/mobile 2 passed, no interception, SMTP/Google disabled. An additional desktop run passed with a deliberately hostile inherited frontend API URL, proving the harness overrides it. Default mocked smoke: 16 passed, 2 opt-in cases skipped. None of these results establishes production, SMTP, Google, or the future expanded authentication feature as complete.

The disposable PostgreSQL 16.15 target was 127.0.0.1:55433/debugclinic_test; migrations and synthetic seed ran against that verified local target. The owned cluster and app servers were stopped. The pre-existing PostgreSQL service on 5433 was left untouched.

Local evidence and commands are recorded in workflow/evaluations/royden/MP4-D2-AUTH/prerequisites.md. The prerequisite commit is identified in the feature ledger/git history. Full application authentication feature changes are not part of this prerequisite checkpoint.
