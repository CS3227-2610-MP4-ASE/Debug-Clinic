# TDD: Authentication completion

| Field            | Value                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Feature / writer | MP4-D2-AUTH / Developer 2, Royden; generic technical-design agent                                                           |
| Date / baseline  | 2026-11-03, Asia/Singapore / `royden/auth-prerequisites`, `579e43cbb69758a385a4f3792b4b58afca987975`                        |
| Status           | Local technical draft; independent package review, human package approval and separate implementation authorization pending |
| Predecessors     | [Mission Brief](../../mission-brief/MP4-D2-AUTH-authentication-completion.md), [accepted PRD](PRD.md)                       |

## 1. Architecture and feasibility evidence

Retain React/MUI, Express, Better Auth, Prisma/PostgreSQL and the thin Netlify adapter. Backend auth policy owns normalization, initial-role admission and OAuth intent. Better Auth owns password hashing, provider validation, OAuth/PKCE/state cryptography, sessions and reset/verification tokens. Frontend auth actions own feedback and navigation. Existing server session/role middleware remains authoritative.

Read-only inspection found installed `better-auth` and backend-local `@better-auth/prisma-adapter` **1.7.14**, Prisma Client **7.10.1**. These exact installed sources establish feasibility, not executed acceptance:

| Installed source                                                               | Relevant supported mechanism                                                                                                                                          |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node_modules/better-auth/dist/api/index.d.mts`, `api/state/oauth.{mjs,d.mts}` | Public `better-auth/api` exports `createAuthMiddleware`, `addOAuthServerContext`, `getOAuthState`; server context cannot be supplied through client `additionalData`. |
| `api/dispatch.mjs`, `db/with-hooks.mjs`                                        | `hooks.before` runs before endpoint validation/handler; `databaseHooks.user.create.before` can supply data; update hooks can reject mutations.                        |
| `apps/backend/node_modules/@better-auth/core/src/types/init-options.ts`        | `user.validateUserInfo` receives `source.action` (`create-user`, `link-account`, `sign-in`), method and raw OAuth profile.                                            |
| `oauth2/link-account.mjs`                                                      | Implicit linking checks incoming ownership and `requireLocalEmailVerified`; existing account lookup uses immutable provider/subject first.                            |
| `api/routes/password.mjs`, `utils/password.mjs`                                | `resetPassword` consumes a recovery token; `resetCredentialPassword` creates a missing `credential` account, otherwise replaces its hash, and revokes sessions.       |
| Backend-local Prisma adapter `dist/index.{mjs,d.mts}`                          | `transaction: true` enables actual `$transaction`; default is false. Atomic `consumeOne` is implemented.                                                              |
| `state.mjs`, `plugins/oauth-proxy/index.mjs`                                   | Database OAuth state has expiry and signed browser cookie; proxy restores state on originating completion, intentionally skipping its state-cookie check there.       |

Explicitly enable `prismaAdapter(prisma, { provider: "postgresql", transaction: true })`; retain database-backed verification/sessions and keep session cookie cache disabled. Freeze compatible dependency versions for delivery and re-inspect these seams after upgrades. No new framework or invented authentication API is needed.

## 2. Interfaces and ownership requests

Reuse `RoleSchema`, `Role`, `CurrentUserSchema` and `ProfileUpdateSchema` from `packages/contracts/src/index.ts` unchanged. Proposed auth wire extensions below require recorded package-owner acceptance before edits; they are deliberate replacements for learner-only registration, not an open role updater.

```ts
type PasswordRegistration = {
  name: string;
  email: string;
  password: string;
  registrationRole: Role;
};
type GoogleFlow =
  | { provider: "google"; requestSignUp: false }
  | {
      provider: "google";
      requestSignUp: true;
      additionalData: { registrationRole: Role };
    };
type Intent = {
  mode: "sign-in" | "register";
  role?: Role;
  origin: string;
  returnTo?: "/learner" | "/instructor";
};
```

`registrationRole` is a command input, never a writable user field. Keep `user.additionalFields.role.input: false`; use `required: false` without a Better Auth default because its input parser executes before database hooks. The create hook always supplies a validated role or aborts. Prisma's existing enum/default stays compatible for existing fixtures; auth provisioning never relies on that default. Session output still passes required-role `CurrentUserSchema`.

| Request / proposed paths                                                                    | Owner, compatibility and required checks                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/src/auth/auth.ts`, new `auth/policy.ts`; frontend auth boundary/pages         | Developer 2 feature owner: require `registrationRole` on password signup; Google registration uses explicit `requestSignUp` plus role. Old learner-only clients cannot register silently. Exercise both roles, direct requests, duplicate signup, mutation rejection and declaration builds. |
| Normalization preflight/apply utility under `scripts/`, using existing `User.email @unique` | Database/shared-data owner must approve the deployment data operation. No new table, column, shared schema export or unique-account contract is proposed. Exercise collision abort, rollback, concurrent creation and preserved relationships.                                               |
| `apps/frontend/src/App.tsx`, auth pages; affected tests and feature map                     | Developer 2 feature owner: add public recovery/verification/completion routes and replace learner-only copy. Exercise accessible desktop/mobile journeys and existing protected routes.                                                                                                      |

Confirm concrete source/test write ownership in implementation packets. Prerequisite worker owns only its assigned Playwright/configuration repair; integrate its green checkpoint separately. Dev 1 retains production configuration, migration/deployment and controlled live acceptance. Approval of this design does not silently authorize those operations.

The frontend auth boundary sends the extended password command using typed fetch with credentials to the existing Better Auth endpoint; do not assume generated `signUp.email` types accept undeclared fields. Parse outcomes without trusting duplicate-signup synthetic user data. For request-local role admission use installed public `defineRequestState` from `@better-auth/core/context`; declare that existing 1.7.14 package directly in the backend dependency manifest rather than relying on a transitive import. Keep exported auth/plugin types explicit and declaration-buildable.

## 3. Canonical identity and migration

Define one pure `normalizeEmail(value) = value.trim().toLowerCase()`. Apply it in the server before hooks for signup, password signin, resend and recovery, before Better Auth email schemas validate. Reuse it in Google `mapProfileToUser` for the email only; preserve raw profile/subject and provider ownership validation. Database user create/update hooks normalize any email write defensively. Frontend normalization improves feedback but grants no authority. Dots and aliases remain untouched.

Use the existing unique canonical `User.email` column as the race arbiter. Every supported application writer must pass the canonicalizer; do not mix old writers with the data transition. Unique `(providerId, accountId)` already prevents duplicate association of the same provider subject; credential `accountId` is the user ID.

Before rollout, identify the explicit database target, pause authentication writes and backup through the database owner. An offline/apply utility computes canonical values in JavaScript with this same function, groups **all** users by canonical value and reports only sanitized counts/opaque IDs. Any collision aborts the entire operation before writes for an owner decision. Never merge/delete users or select a winning role. Do not substitute PostgreSQL `lower(btrim(...))` for JavaScript Unicode trimming/case behavior.

With writes paused, repeat preflight inside one Prisma transaction and update email values by stable user ID. Preserve roles, account/session bindings and all foreign keys. Existing uniqueness prevents conflicting commits; transaction failure rolls everything back. Invalidate DB-backed recovery/OAuth artifacts, including application intent rows, and revoke sessions during the owner-authorized transition; users request fresh recovery links/sign in. Store a protected before/after map outside Git for authorized rollback. Local synthetic rehearsals precede any production operation.

Verification email links are different: installed `email-verification.mjs` verifies a stateless signed JWT containing email, then calls `findUserByEmail(parsed.email)`. Deleting `Verification` rows does not revoke those JWTs. An unexpired link for an unchanged address may remain valid until its configured expiry; canonicalization may also let an old link resolve to the same intended user. Preserve that truthful behavior without secret rotation or a new revocation policy. Migration tests must prove an old link either fails safely or verifies only its intended existing user ID, never a different identity or role; test unchanged-address validity and expiry explicitly. Collision preflight and the absence of address reassignment are essential to that invariant.

Concurrent new registrations may both pass lookup: only one insert commits. The loser receives a safe retry/signin/recovery outcome; never retry by updating the winner's role/password. Better Auth transaction coverage keeps new user plus credential/provider account coherent. Concurrent identical linking/reset-establishment attempts are constrained by provider/subject uniqueness; failed attempts cannot replace another user's binding.

## 4. Initial role and Google flow

Password signup's before hook parses `registrationRole` using `RoleSchema`, including duplicate requests, and retains it in request-local policy context. `databaseHooks.user.create.before` obtains only that validated selection for password creation. Missing context fails closed. `user.update.before` rejects any role update; the existing strict profile schema continues accepting only name. Signin, verification, reset and linking never carry role changes.

Set Google `disableImplicitSignUp: true`. `/sign-in` starts with `requestSignUp: false`: unknown identities receive signup guidance, with no automatic user creation. `/register` visibly requires an initially unselected Learner/Instructor radio group for either method. Its Google start sends `requestSignUp: true` and the selected role. The server parses this input and permits new creation only from that registration flow. Existing linked or verified same-email users retain their persisted roles even if another role was selected.

The server before hook on `/sign-in/social` rejects unsupported providers, direct `idToken` shortcuts, malformed registration intent and unauthorized/missing browser Origin. Require Origin exactly equal to configured `appOrigin`; preserve Better Auth's CSRF/trusted-origin checks. Construct completion/error URLs from configuration, rejecting arbitrary supplied destinations. Restrict return paths to the two workspace routes; after fetching the session allow only the matching role, otherwise choose its workspace.

Use maintained Better Auth state/cookie facilities, plus an application replay claim:

1. Create an unpredictable intent ID with Node `randomUUID`. Persist one existing `Verification` row (`id`, namespaced `identifier`, JSON `Intent`, `expiresAt` ten minutes ahead), using the captured root Prisma client. It contains no password/provider token.
2. Use `context.createAuthCookie` and middleware `setSignedCookie` to bind that ID to a host-only, HttpOnly, SameSite=Lax cookie, Secure in production, expiring with the intent. Call public `addOAuthServerContext({ debugClinicIntentId: id })`. Never trust callback/body `additionalData` as server intent.
3. Better Auth generates OAuth state/PKCE and performs provider exchange. Keep database state strategy and `skipStateCookieCheck: false`; keep the existing maintained proxy plugin.
4. On originating callback, `user.validateUserInfo` reads `getOAuthState().serverContext`, narrows the ID, verifies the signed intent cookie using `getSignedCookie`, loads the row and checks expiry, configured originating app/auth runtime, and allowed destination. Require verified Google user info. For `create-user`, require registration mode and a valid role.
5. Claim the row with root-client `verification.deleteMany` matching its ID, namespace, exact stored value and unexpired timestamp; count must equal one. This committed, independent claim prevents concurrent callbacks from reusing intent, including the proxy path. Do not substitute find-then-delete or an in-memory lock. Keep the admitted role in request-local context for the create hook, then expire the cookie.

This supplementary claim is necessary because installed generic database-state parsing reads then deletes, and proxy completion skips the library browser-cookie check. It supplements maintained cryptography. A failed post-claim callback requires restarting Google; no half-created identity commits. A second tab replaces the browser's active intent cookie, making the earlier flow safely restartable. Cancelled/denied/expired flows create no session and leave only an expiring row. Periodic cleanup is unnecessary for correctness; delete expired namespaced rows during subsequent starts with bounded housekeeping.

The stable proxy performs provider exchange without local provisioning; the originating runtime performs admission/claim/provisioning. Compare against captured configuration, not the proxy-mutated `context.baseURL` or untrusted forwarded host. Test both direct and proxy callbacks, including copied completion URLs without the originating cookie.

## 5. Ownership, verification and recovery

Configure linking explicitly: enabled, implicit linking permitted, `requireLocalEmailVerified: true`, `allowDifferentEmails: false`, `updateUserInfoOnLink: false`, and no provider-name trust bypass (`trustedProviders: []`). `validateUserInfo` additionally requires incoming Google `emailVerified === true` for creation/link/signin. Preserve Better Auth's provider subject ownership checks and unique account key. Reject direct `/link-social` and `/unlink-account` calls in the auth before hook; provide no new set-password product flow. This keeps association on the verified implicit flow and prevents bypassing local verification, signed intent or immutable role policy.

A verified password user can sign in through same-email Google; Better Auth links the provider to the existing user. An unverified local identity blocks association and receives safe verification/recovery guidance. Profile text alone never authorizes association. A Google-first user requests recovery; installed reset behavior creates the missing credential account while preserving Google access, ID and role. Reset does **not** mark an unverified local email verified; its verification requirement still applies.

Retain password length 12–128, `revokeSessionsOnPasswordReset: true`, existing verification-dependent signin and `autoSignInAfterVerification: false`. The stock reset transaction consumes the token, revokes sessions and writes the hash together. Invalid/expired/reused reset tokens cannot mutate credentials; concurrent consume losers fail. A storage failure rolls back these database operations.

Use these existing Better Auth routes, with fixed configured callbacks:

| Route                                    | UI and result                                                                                                                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST `/api/auth/send-verification-email` | `/verification` accepts email/resend; every valid pending/unknown/already-verified address receives HTTP 200 with exactly `{ "status": true }`, including delivery-callback failure. No delivery guarantee.      |
| GET `/api/auth/verify-email`             | Library verifies its signed link then redirects to `/verification/result`; display success/signin or mapped invalid/expired guidance. Already-verified/reused links are safely idempotent and create no session. |
| POST `/api/auth/request-password-reset`  | `/forgot-password` reachable from signin and password-establishment guidance; identical public acceptance for existing/unknown addresses.                                                                        |
| GET `/api/auth/reset-password/:token`    | Library redirects to `/reset-password` with token or `INVALID_TOKEN`.                                                                                                                                            |
| POST `/api/auth/reset-password`          | `{ token, newPassword }`; success clears token/password and offers signin. Failure offers retry/new recovery link.                                                                                               |

Recovery and verification email callbacks await delivery attempts, catch delivery exceptions, record only a sanitized delivery-failure category and return normally. For resend, normalize the library response at the auth boundary to HTTP 200 and exactly `{ "status": true }` for pending, unknown and already-verified addresses, including when delivery throws. Normalize authenticated `EMAIL_ALREADY_VERIFIED` and `EMAIL_MISMATCH` outcomes to that same acceptance without exposing account/session-specific details. The UI always says: "Request accepted. If verification is needed, check your email. If no message arrives, try again." This describes request acceptance and safe retry, never confirmed delivery or address existence. Retain the library's timing floor and test the complete response matrix; do not expose a per-identity delivery-success/failure oracle.

Configuration-wide failures detected before identity lookup, rate limits, invalid input and unrelated transport/storage failures may return their uniform safe failure response for every address; never promote an identity-specific delivery exception into that public failure path. Missing recovery/verification configuration fails uniformly. Suppressing verification-delivery errors also means successful verification-required signup says verification is pending and offers resend, without claiming a message was delivered or granting protected access. Blocked signin likewise offers generic resend guidance. No SMTP configuration means delivery/recovery acceptance remains unproved; the local fixture supplies a captured test outbox. Do not display raw library messages.

## 6. UI, sessions and failures

Add `/auth/complete`, `/auth/error`, `/verification`, `/verification/result`, `/forgot-password`, `/reset-password`. Completion refreshes `/api/v1/me` before choosing a role-authorized destination; refresh failures remain recoverable and grant no protected view. Informational result URLs never authorize a session. Remove reset tokens from visible history immediately after capturing them in component memory; avoid third-party assets/analytics on token pages and apply no-referrer behavior.

Centralize safe error-code mapping and pending-action handling in the frontend auth boundary. Every registration/signin/Google/resend/recovery/reset handler uses `try/catch/finally`, clears busy state on returned or thrown failures, disables competing submissions and announces progress/outcomes accessibly. Pending verification and duplicate registration offer signin/resend/recovery without claiming a new identity. Network/provider cancellation and callback errors are retryable; keep typed error allowlists and generic fallback.

Preserve `AuthProvider` request-version suppression after successful signout, truthful failed-signout state, explicit restore retry and server revocation checks. Never redirect using an unvalidated URL, trust stale UI identity, or infer authorization from selected role. Keep the auth handler mounted before Express JSON parsing and preserve cookie/multiple-header handling in packaging.

Use request IDs and allowlisted diagnostic categories. Supply a Better Auth logger adapter that discards free-form argument payloads and maps known categories; installed library logs can contain emails/raw exceptions. Redact cookies, authorization, provider material, token-bearing URLs/redirects and intent IDs. Client messages use stable safe text, not exception strings.

## 7. Verification, rollout and remaining evidence

RTT must map all 34 PRD criteria. Pure tests cover canonicalization, role parsing, destination policy, error mapping and malformed intent. Handler/PostgreSQL integration uses synthetic users, a captured outbox and controlled remote-provider doubles; assert IDs/roles/relationships, real cookies, verification outcomes, reset consumption, session revocation, concurrency and rollback. Fault-inject account creation/email/storage failures and replay/cross-origin/proxy callbacks. Browser checks cover both roles, explicit selection, actual verification/recovery journeys, responsive accessibility, retry/finally behavior and signout races. Keep provider identity in raw profile/subject fixtures.

Run Node 24 lint/typecheck/format/unit checks, declaration-emitting builds, isolated database integration, desktop/mobile browser checks, packaged Netlify Function regression and independent functional/standards/security review. Freeze independent acceptance interpretation before implementation. Three meaningful repairs per verification failure and two targeted review rounds remain the runbook bounds.

Writer performed source inspection only: no database commands, tests, credentials, source changes or deployment. Coordinator reports prerequisite origin tests and two real-browser projects passing, with independent-review isolation repairs still pending; these remain separate evidence. Production readiness HTTP 503 establishes a failed database probe, not either auth failure's root cause. Record environment/time/readiness and distinguish DB, config, provider, delivery and application evidence; unknown causes stay unknown.

After package-bound approval and implementation authorization, integrate the prerequisite checkpoint, rehearse normalization/recovery, build and verify locally. Roll back application code only to a compatible checkpoint retaining canonical writes; stop registrations if that cannot be ensured. Do not restore stale reset tokens, revoked sessions or overwrite new accounts using a bulk backup. A data rollback needs the owner's protected mapping, collision preflight and maintenance window.

Give Dev 1 a concise SDD-safe handoff containing code/test checkpoint, sanitized local commands/results, environment/configuration names, required authorized data transition, and pending readiness/Google callback/email/real-user journeys. Netlify access and controlled live checks are deferred, never marked passed. No unresolved product choice is introduced; actual collision data, changed shared interfaces or failed feasibility checks return to the owner. This draft awaits RTT, independent complete-package review and human decision.
