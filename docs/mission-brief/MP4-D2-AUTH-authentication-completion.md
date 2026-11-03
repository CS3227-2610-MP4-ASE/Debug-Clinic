# Mission Brief: Authentication completion

| Field    | Value                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| Feature  | `MP4-D2-AUTH`                                                                     |
| Owner    | Developer 2 / Royden                                                              |
| Recorded | 2026-11-03, Asia/Singapore                                                        |
| Baseline | `royden/mp4-agent-workflow` at `579e43cbb69758a385a4f3792b4b58afca987975`         |
| Status   | Approved conversational scope recorded; PRD and delivery package pending approval |

## Scope provenance and authorization

The source is the user-approved plan **Authentication completion through MP4 feature delivery**, followed by **implement this plan** and **plan mode off** in this chat. This brief records that conversational scope; its newly authored bytes have not received separate artifact approval. Plan approval is not PRD approval, package approval, or package-bound implementation authorization.

The sequence remains scope -> human PRD approval -> TDD and Requirements-to-Tests -> independent package review -> human package approval -> separate implementation authorization identifying the approved package/version. Production configuration changes, migrations, deployment, push, and merge require separate authorization.

## Problem and intended outcome

Users reported Google: "Google sign-in could not start. Try again or use email." Registration: "Registration failed. Review your details and try again."

Complete authentication while preserving Better Auth. One normalized email identifies one user with one initial role, accessible through email/password and Google after verified ownership. Diagnose production failures before selecting fixes; repair claims must follow evidence.

## Approved behavior

1. Trim surrounding whitespace and lowercase emails consistently. Do not collapse aliases or remove dots. One normalized email corresponds to one application user; provider credential rows represent login methods.
2. Anyone may choose Learner or Instructor at initial email/password or Google registration. Persist that role.
3. Login, linking, profile updates, and repeated registration cannot change an existing role. Preserve existing users' roles; no self-service role switching.
4. Support both login methods for the same verified identity without duplicate users or unsafe linking. Google-first users establish a password through verified recovery; no arbitrary account merging.
5. Include forgot-password/reset-password screens and verification resend, with clear outcomes, next steps, and relevant failure cases.
6. Show safe actionable errors, allow retry/recovery, and clear loading states after failures.

## Baseline and diagnostic evidence

The inspected foundation uses Better Auth with Prisma, email/password, optional Google configuration, and configurable email verification/reset delivery. Current UI and backend enforce learner-only signup; role defaults to LEARNER and direct client role input is disabled. Changing initial registration requires deliberate design that preserves protection against later role mutation.

Existing browser tests intercept selected authentication responses; they do not establish real-provider correctness. Coordinator read-only production probes on 2026-11-03 at approximately 21:17 Asia/Singapore observed:

| Probe                        | Result                       |
| ---------------------------- | ---------------------------- |
| Homepage                     | HTTP 200                     |
| /api/health                  | HTTP 200                     |
| /api/ready                   | HTTP 503; database not ready |
| /api/v1/me without a session | HTTP 401                     |

This establishes database-probe failure at that time, not the root cause of either reported authentication failure. Distinguish database/configuration/provider/email/application failures without exposing credentials or user data.

## Boundaries and dependencies

Preserve Better Auth, existing roles, unrelated behavior, and workflow machinery. No role-switching/admin feature, arbitrary account merging, unrelated feature work, or workflow tooling changes.

If normalization exposes conflicting existing identities, stop the affected migration and obtain an owner decision; do not automatically merge users or reassign roles.

Dependencies: human-approved PRD and reviewed technical/test package; explicitly verified isolated test database; controlled provider access for live acceptance. Keep missing evidence visible. Escalate changed requirements, ownership, and shared interfaces before dependent work.

## Required completion evidence

- Evidence-backed diagnosis, separating observations from hypotheses.
- Isolated database/browser tests for both roles and methods, normalization, verified linking, Google-first recovery, role preservation, verification/resend, failure feedback, and loading recovery.
- Controlled live-provider checks reported separately from mocked and isolated checks.
- Session, sign-out, protected-access, build, and runtime-packaging regression evidence.
- Independent functional and coding-standards verdicts and a separate security review.
- Explicit limitations, unresolved failures, and pending manual/provider checks.

Package approval must bind exact artifact bytes through hashes and a verified external backup. No application implementation, production mutation, or commit is authorized by this document's authorship assignment.

## Owner update: local delivery and Dev 1 handoff

On 2026-11-03 the user stated they lack access to Dev 1-owned Netlify and directed proceeding locally before handoff to Dev 1. Continue the existing local requirements; defer production diagnosis and controlled live-provider checks to the deployment owner without claiming production readiness. No additional Netlify membership or credentials are required from this user. This evidence/ownership update does not authorize changes to workflow machinery or waive complete-package review.
