# PR review fixes verification

Verified locally on 1 November 2026 with Node 24.22.2 and disposable PostgreSQL 17.
All seven reported issues were confirmed in the current source and fixed on
the existing `zh-infra-setup` branch.

## Changes

- Issues 1 and 3: both example development URLs match the existing loopback
  port `55432`; the test service now binds `127.0.0.1:5433`. Regression tests
  compare the examples with Compose. `docker compose config --format json`
  also confirmed both resolved host bindings. No existing development database
  or local secret file was changed.
- Issue 2: HTTP request serialization strips query strings and reset-token
  path segments without modifying the request consumed by authentication.
  Request headers, parsed queries, and params are omitted; response redirect
  locations and cookies are redacted. Raw JSON log tests cover verification,
  Google code/state, OAuth proxy profiles, encoded reset paths, and headers.
- Issue 6: only known JSON parse/size errors map to safe 400/413 responses;
  unknown errors still return generic 500 responses. Raw malformed JSON and
  JSON above 64kb are covered without exposing their contents.
- Issues 4 and 5: Google errors are visible, pending actions are disabled, and
  sign-out waits for server success before clearing the user. In-flight session
  reads cannot restore a signed-out user. Failed logout remains explicit and
  retryable. The PostgreSQL integration flow verifies cookie expiry and rejection
  of the revoked session after real Better Auth sign-out.
- Issue 7: the user guide now describes SMTP-dependent verification, the working
  password-reset API, the deferred reset screen, and sign-out behavior.

## Checks

- `npm run typecheck`, `npm run lint`, `npm run format:check`: passed.
- `npm test`: 81 tests passed.
- `npm run test:e2e`: 16 desktop/mobile Chromium tests passed.
- `npm run db:verify`: migrations, idempotent seed, and all three integration
  tests passed in a disposable PostgreSQL 17 container, removed afterward.
- `npm run build`: passed. Existing third-party Zod comment-annotation warnings
  remain non-blocking.
- Impeccable's mechanical detector reported no findings for the changed frontend
  targets. This is a structural check, not proof of UX correctness. Desktop and
  emulated Pixel 7 captures were separately inspected for error visibility,
  navigation placement, 44px sign-out controls, and horizontal overflow.

Browser provider responses were mocked. No live Google login, SMTP delivery,
production database operation, Netlify deployment, or physical-device test was
performed. Existing `.env` files using the old local port must be updated by
their owner if they are intended to connect to the Compose development service.
