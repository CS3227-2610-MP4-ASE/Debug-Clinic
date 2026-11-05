# PRD: Authentication completion

| Field        | Value                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| Feature      | `MP4-D2-AUTH`                                                                                                   |
| Owner        | Developer 2 / Royden                                                                                            |
| Date         | 2026-11-03, Asia/Singapore                                                                                      |
| Baseline     | `royden/mp4-agent-workflow` at `579e43cbb69758a385a4f3792b4b58afca987975`                                       |
| Status       | Requirements accepted for local design continuation; technical package and implementation gates pending         |
| Scope source | [Approved conversational scope and Mission Brief](../../mission-brief/MP4-D2-AUTH-authentication-completion.md) |

## Purpose and scope

Complete authentication so a person can explicitly register as Learner or Instructor, verify ownership, and access one application identity through Google and email/password. Preserve Better Auth, existing users and roles, session protections, and unrelated behavior.

The reported Google and registration failures require evidence-backed diagnosis. This feature includes email normalization, public initial role selection, safe reuse of identities across login methods, verification resend, password recovery and establishment, useful failure feedback, and authentication regression evidence.

Excluded: self-service role switching, administrative role management, arbitrary account merging, unrelated features, workflow machinery changes, and unapproved production configuration, migration, deployment, push, or merge.

## Users and journeys

A new user explicitly chooses a role before completing password or Google registration. A password registrant receives verification guidance when verification is required, verifies their email, and signs in to the appropriate workspace.

An existing user signs in through their established method or uses another method after verified ownership establishes that it belongs to the same identity. A Google-first user requests password recovery to establish a password while retaining Google access and their original role.

A user who cannot finish authentication can understand the next step, resend verification or request recovery where relevant, and retry after failures. Sign-out, session expiry, revocation, and wrong-role access continue to protect workspaces and APIs.

## Requirements and acceptance criteria

### AUTH-01 — Diagnose failures against an identified environment

Separate observations, hypotheses, and confirmed causes before claiming a repair.

- **AUTH-01-AC1:** Diagnostic evidence records the environment, time, sanitized observation, and database readiness. A healthy homepage or health endpoint alone does not establish authentication readiness.
- **AUTH-01-AC2:** Database, application configuration, Google/provider, email delivery, and application failures are distinguished where evidence permits. Unknown causes remain explicitly unknown.
- **AUTH-01-AC3:** Real authentication acceptance uses an explicitly verified isolated database and identified application runtime. Missing readiness or provider access is recorded as a blocker or evidence gap, never as a passing result.

### AUTH-02 — One identity per normalized email

Normalize email consistently by trimming surrounding whitespace and lowercasing. Do not remove dots, collapse aliases, or apply provider-specific transformations.

- **AUTH-02-AC1:** Registration, password sign-in, identity lookup, verification resend, recovery, and Google email handling resolve equivalent normalized addresses consistently. Distinct aliases and dotted addresses remain distinct unless their normalized strings are equal.
- **AUTH-02-AC2:** Repeated and concurrent registration or method-association attempts cannot create duplicate application users for one normalized email. The first successful registration establishes the identity and role; competing attempts cannot overwrite either.
- **AUTH-02-AC3:** Existing identity IDs, roles, and related application data remain associated with their owners. If normalization exposes existing collisions, the affected migration stops for an owner decision; users are not automatically merged, deleted, or reassigned.

### AUTH-03 — Explicit initial role, immutable existing role

Anyone may choose Learner or Instructor at first password or Google registration. The server must preserve the distinction between initial selection and later mutation.

- **AUTH-03-AC1:** Both registration journeys visibly require an explicit role choice. Missing or unsupported choices cannot complete new registration, and the product flow does not silently default to Learner.
- **AUTH-03-AC2:** Successful registration persists the selected role. Following authentication, the user reaches their role-appropriate workspace or an authorized return destination.
- **AUTH-03-AC3:** Existing users retain their roles during login, repeated registration, verification, recovery, method association, and profile updates, including when a different role is submitted. Client input cannot change an existing role.
- **AUTH-03-AC4:** Registration copy describes public registration for both roles. Existing learner-only registration expectations are replaced while role-mutation protection remains covered.

### AUTH-04 — Safely reuse identities across methods

Google and password credentials may authenticate the same application user only after verified ownership. Matching user-supplied email text is insufficient.

- **AUTH-04-AC1:** A verified password identity can subsequently use Google for the same verified identity without creating another application user or changing its role.
- **AUTH-04-AC2:** A Google-first identity can subsequently use a password established through verified recovery, retaining the same user ID, role, related data, and Google access.
- **AUTH-04-AC3:** Unverified email claims, incomplete verification, or failed provider authentication do not authorize method association, account takeover, or access to another identity. Where ownership is not established, explain the required verification or recovery step safely.
- **AUTH-04-AC4:** Repeated or concurrent association attempts do not duplicate identities or credential associations and do not replace another person's established credentials. Arbitrary account merging is unavailable.

### AUTH-05 — Complete password registration and sign-in

Preserve the existing password policy and verification-dependent access behavior while supporting both roles.

- **AUTH-05-AC1:** Valid registration for either role creates one user with the selected role and the appropriate verification or authentication outcome. Invalid inputs produce useful validation feedback without a successful registration claim.
- **AUTH-05-AC2:** Correct credentials authenticate the established user after required verification. Incorrect credentials, an unestablished password, and verification-pending accounts do not receive protected access.
- **AUTH-05-AC3:** Registering again for an existing normalized identity cannot replace its password, change its role, or create another user. The user receives a safe path to sign-in or recovery.

### AUTH-06 — Verification and resend

Users can understand verification status and request another verification message without changing their identity.

- **AUTH-06-AC1:** When email verification is required, registration and blocked sign-in explain that verification is pending and provide a reachable resend action.
- **AUTH-06-AC2:** A valid verification link verifies its intended identity and presents a clear success outcome and next step. Invalid, expired, or reused links present a safe outcome and suitable sign-in or resend guidance without granting unintended access.
- **AUTH-06-AC3:** Resend targets the normalized identity, preserves its role and credentials, and reports request acceptance or service failure accurately. Already-verified and unknown-address requests do not disclose unnecessary account information.
- **AUTH-06-AC4:** Verification and resend failure paths remain retryable. The interface does not claim guaranteed email delivery merely because a request was accepted.

### AUTH-07 — Recovery and Google-first password establishment

Provide reachable forgot-password and reset-password screens using verified recovery.

- **AUTH-07-AC1:** Recovery requests for existing and unknown normalized addresses use a consistent, non-enumerating public response. Account existence or login method is not disclosed through account-specific success or error text.
- **AUTH-07-AC2:** A valid recovery link permits a password satisfying the existing policy to be reset or first established for its intended identity. Success preserves the user ID and role and explains how to sign in.
- **AUTH-07-AC3:** Invalid, expired, and reused recovery tokens cannot establish or change a password. The user receives a clear safe outcome and can request another link.
- **AUTH-07-AC4:** Successful password recovery revokes existing sessions as required by the foundation. Previous passwords cease to work after replacement; the new password works, and previously established Google access remains available.

### AUTH-08 — Preserve Google intent and origin

Google registration must retain the user's explicit role choice throughout the authorized originating flow.

- **AUTH-08-AC1:** First-time Google registration persists the role explicitly chosen for that flow. Returning Google users retain their existing roles regardless of new role input.
- **AUTH-08-AC2:** Role intent is bound to the initiating authentication flow and authorized origin. Altered, stale, replayed, missing, or cross-origin intent cannot silently choose a role, change an existing role, or complete an unintended registration.
- **AUTH-08-AC3:** Google start failures, cancellation, provider denial, and callback failures produce safe recoverable outcomes. Success returns only to an authorized destination and establishes the session on the intended application origin.

### AUTH-09 — Preserve sessions and authorization

Authentication changes must retain server-enforced access control and truthful session state.

- **AUTH-09-AC1:** Valid sessions restore the correct identity and role. Missing, expired, and revoked sessions cannot access protected APIs or workspaces; wrong-role requests remain denied.
- **AUTH-09-AC2:** Successful sign-out invalidates the session and clears authenticated UI state. An earlier pending session response cannot restore a signed-out user.
- **AUTH-09-AC3:** Failed sign-out does not falsely report success. Session restoration failure clears loading, provides retry guidance, and does not grant protected access from stale UI state.

### AUTH-10 — Safe feedback and reliable retries

Every authentication action must leave the interface usable after unsuccessful completion.

- **AUTH-10-AC1:** Registration, sign-in, Google initiation, verification resend, recovery, and reset clear busy states after returned errors or thrown/network failures. Users can retry without reloading.
- **AUTH-10-AC2:** Pending actions visibly communicate progress and prevent accidental duplicate submission. Successful outcomes provide an accurate next step.
- **AUTH-10-AC3:** Public messages are actionable and safe. They do not expose raw exceptions, database details, credentials, provider secrets, session values, or verification/recovery tokens.

## Compatibility, privacy, and acceptance

Existing users keep their roles and application relationships. Better Auth remains the authentication foundation. Existing session security, protected API contracts, production packaging, and unrelated features must not regress. The new initial-role contract deliberately supersedes learner-only signup; protection against subsequent role input remains mandatory.

Use synthetic users and controlled email/provider accounts for verification. Evidence must omit passwords, cookies, authorization headers, secrets, token-bearing links, and unnecessary personal data. Preserve useful sanitized failure observations without publishing sensitive request or redirect contents.

The subsequent Requirements-to-Tests artifact must map every acceptance criterion to a meaningful automated test or named manual observation. Evidence must distinguish deterministic mocks, real isolated-database integration, browser interaction, controlled Google/email-provider checks, builds, runtime packaging, and CI. Mocked responses cannot establish live-provider or complete browser authentication correctness.

Acceptance includes both roles and methods, normalization and concurrency, safe association, immutable roles, Google-first recovery, token failure cases, retries, sessions, sign-out, and wrong-role access. Required delivery evidence includes independent functional and coding-standards verdicts and a separate security review.

## Local delivery and Dev 1 handoff

The user directs: "Netlify is created by dev 1. Think i have no access to it because adding members into a project requires billing. If there is no other way, we can proceed to implement what we have first, then handoff to dev 1." This is recorded as acceptance of the existing local requirements for continued design, with production diagnosis and controlled live-provider acceptance deferred to Dev 1. It is not approval of technical artifacts that do not yet exist.

Local code, isolated tests, and a concise SDD-safe Dev 1 handoff may progress without Netlify membership. Production readiness remains unclaimed until the deployment owner verifies database readiness, runtime configuration, Google callbacks, email delivery and real authentication journeys. Do not buy access, request secrets in chat, fabricate a database root cause, or mark provider checks passed. The handoff must list exact commands/observations and pending checks.

## Known evidence gaps and decisions

The Mission Brief records production observations at approximately 21:17 Asia/Singapore on 2026-11-03: homepage and health HTTP 200, readiness HTTP 503 with database not ready, and unauthenticated current-user HTTP 401. These observations do not establish either reported authentication failure's root cause.

Baseline browser authentication tests intercept selected responses; Google integration fixtures avoid real provider network calls. The 5173 browser / 4173 auth-origin mismatch was reproduced on 2026-11-03 and is being repaired independently in royden/auth-prerequisites. The new local real-browser test is pending execution; no live-provider proof is implied. Configurable email/provider support is not proof of successful delivery or provider access.

The original PRD authorship performed no tests, live probes, migrations, or application changes. A separately authorized prerequisite repair now proceeds locally; its results will be recorded separately. Live-provider outcomes remain unavailable here. No unresolved product decision has been identified within the approved scope; discovered data collisions or changed requirements require an owner decision.

Next gate: draft technical design and Requirements-to-Tests from these accepted local requirements, then independent complete-package review and human package approval. Feature implementation requires separate authorization identifying that reviewed package/version. The explicit prerequisite-repair authorization applies only to the already-confirmed test configuration problem and local evidence setup.
