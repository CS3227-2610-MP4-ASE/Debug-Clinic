# Authentication local-delivery handoff for Dev 1

Status: backend/package checkpoint verified; expanded local acceptance and independent feature reviews are in progress. Production diagnosis remains pending owner access.
Date: 3 November 2026, Asia/Singapore.
Branch: royden/auth-completion. Stacked parent: prerequisite checkpoint441838145f719f02810737fc435c4b59c2682901.
This concise handoff uses application code, tests, and sanitized observations; it does not include Developer 2 SDD.

## Current application checkpoint

Backend commit0c1625af6b9bc89939ebb4dfb826cbf766fc6047 supports explicit initial Learner/Instructor registration, canonical trim/lowercase email handling, preserved existing roles, verified Google association, browser-bound Google role intent and transactional authentication. Direct account linking/unlinking bypasses are blocked. Verification resend and recovery return safe acceptance without promising delivery; Google-first identities establish a password through recovery. Expanded UI/browser acceptance is still in progress at this checkpoint.

Writer-local checks: API116/116, isolated PostgreSQL3/3 and backend declaration build pass. Coordinator commit98e41026ce9d80804ef0161e54056011ebc93ffe adds real packaged-runtime tools. Extracted ESM Web-handler smoke passes against owned PG55434: readiness, canonical instructor registration, cookie roundtrip, allowed/denied role access, sign-out/revocation and malformed input. This does not exercise AWS bootstrap or establish live Google/SMTP behavior. Final integrated checks and independent functional/standards/security verdicts remain pending.

The new exact compatible core dependency must remain at both backend and root runtime locations. An initial real package failed because the flattened function could not resolve backend-only core; rebuilding after root placement passes. Do not deploy a lockfile/manifest combination different from the verified build. Initial registration now requires `registrationRole`; release compatible frontend/backend together.

Before an authorized rollout, the database owner must pause old and new authentication writers, back up, preflight **all** JavaScript-canonical emails and stop on any collision. Never merge users, choose a winning role or overwrite an identity automatically. Rehearse the normalization transition on synthetic data, preserve stable IDs/roles/relationships, revoke sessions and database-backed reset/OAuth/intent artifacts, then enable compatible canonical writers. Existing verification JWTs are stateless and may remain valid until expiry only for their intended identity. The supplied CLI is deliberately restricted to local loopback `_test` rehearsals; a production operator must separately validate/authorize the real target and protected rollback-map procedure. Do not weaken the test-target guard to run a test suite against production. Rollback must not restore old sessions/tokens or re-enable incompatible writers.

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
