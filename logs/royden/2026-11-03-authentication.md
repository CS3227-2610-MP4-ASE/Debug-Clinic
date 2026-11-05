# Authentication completion — 3–4 November 2026

## Owner decisions

The owner requested completion of password and Google authentication, public initial Learner/Instructor registration, and one role per normalized email. The owner explicitly included password recovery and verification resend. Production Netlify access belongs to Dev 1; the owner directed proceeding locally and handing off deployment-owner checks. This log records available statements and observations without reconstructing missing conversations.

The complete reviewed `MP4-D2-AUTH-20261103-R2` package received **Approve package** and the separate **Authorize local implementation** reply. [ApprovalRecord.md](../../docs/features/MP4-D2-AUTH/ApprovalRecord.md) binds the exact four hashes and actual reply provenance. Snapshot `9011d4664d873789677ca658e397e2f7e2f77a4e` was committed before dependent source changes on `royden/auth-completion`, stacked on the verified prerequisite checkpoint. No push, merge, deployment or production mutation is authorized.

## Local delivery checkpoints

- Prerequisite checkpoint `441838145f719f02810737fc435c4b59c2682901` repaired the browser/auth origin and startup isolation. Its unit/browser results and independent review are separate from expanded-feature acceptance.
- The first builder dispatch failed immediately with a reported account usage limit and produced no implementation evidence. On **resume**, the coordinator checked the clean approved snapshot and dispatched fresh generic `/root/auth_builder_resumed` with the implementer instructions and complete approved package. No named TOML runtime selection or model override is claimed.
- Resumed shell selected Node 22; required Node 24.14.0/npm 11.9.0 was located in `C:/Program Files/nodejs` and explicitly selected. Dependency installation required scoped local recovery and escalation. Builder reported installation complete and backend typecheck passing; these are writer-local reports pending integrated verification.
- Builder owns coupled source, unit/integration/browser tests and normalization utility. Coordinator owns packaged-function smoke tools, guides, evidence and handoff. Approved requirements/design/test interpretation and workflow machinery remain unchanged.
- The owned synthetic PostgreSQL 16 instance uses `127.0.0.1:55434/auth_completion_test`. Builder reported initialization and migration success. No production target or pre-existing PostgreSQL service is used for these checks.
- Coordinator downloaded the pinned Netlify CLI 27.16.1 after a sandbox EACCES fetch failure. Inspection found `functions:build` does not forward resolved function configuration; the local packaging helper uses that pinned CLI's actual packager/config normalization with the repository settings. Scripts passed focused lint/format; artifact execution remains pending at this checkpoint.
- Backend slice `0c1625af6b9bc89939ebb4dfb826cbf766fc6047` passed writer-local API116/116, PG3/3 and backend declarations. A failed Google proxy test established installed hook-header replacement; emitting the signed intent cookie after dispatch repaired that flow. Broader acceptance is still being implemented.
- Actual extracted package first failed module loading: compatible core existed only in the backend workspace while the flattened ESM module resolves at the package root. Adding the exact root dependency repaired resolution. Rebuilt packaged Web-handler smoke passed readiness, canonical instructor signup, cookie/session, allowed/denied role access, sign-out/revocation and malformed input. The owned synthetic user was removed. This is local packaged-application evidence, not AWS bootstrap, deployment or live-provider evidence.
- Complete BW reruns exposed and repaired an initial-session/completion ordering issue. Builder committed UI/fixtures/tests as a276f61804dda752c92b7fa4217d1544594b8d11 with writer-local unit126/126, PG34/34, BW10/10 and default feedback/smoke58pass/12opt-in skips; final integrated verification and independent reviews remain pending. Controller-substituted Google authorization and private outbox capture are explicitly labelled.
- Coordinator's built-file browser check reproduced a blank public page with an AsyncMode initialization error despite passing dev-server journeys. Removing the existing manual vendor/React chunk graph repaired it in one meaningful attempt. A new emitted-file regression passes16 exact page/viewport loads. This does not establish the deployed failure's cause. Final backend ZIP smoke passes after the explicit resend HTTP200 repair; existing workflow regressions34/34 pass. No workflow machinery was changed.

## Evidence boundaries

Final closure recorded4November2026: application codea1645b9d42ccaed896bf94ba571713dbd9eb6a41,
all three independent reviews pass after two targeted repair batches. Initial review
found unsafe legacy/pooled fixture targets and raw unexpected auth/session logging;
targeted evidence added reset boundaries, actual Google mapper/callback substitution
and deeper keyboard observation. Re-review found callback API-JSON recovery unsuitable
for navigational failures; the second repair returns known GET callbacks to the fixed
app error page. Findings and independent reproductions remain in the review record.

Coordinator final results:142unit/API,42realPG,10complete desktop/mobile journeys,
58feedback passes/12opt-in skips, lint/typecheck/format, production build/declarations,
16emitted route/viewport plus deep keyboard checks and actual extracted package smoke
all pass. Existing workflow suite34/34 passes; approved hashes and machinery unchanged.
The first root unit worker-exit log is retained; unchanged rerun and final run pass.
Owned PG55434 was verified/stopped; test app/preview ports are clear. Source guides,
feature map, acceptance/evaluation/ledger and permitted Dev1 handoff are updated.
Nothing was pushed, merged or deployed; production/provider/CI evidence remains deferred.

Final evidence is in [implementation evidence](../../workflow/evaluations/royden/MP4-D2-AUTH/implementation.md).
Production readiness503 has an unknown cause; local changes cannot establish either
reported production failure's root cause. Real Google, SMTP receipt and CI are
unobserved. Private telemetry preserves original exceeded soft estimates and coverage
limits; it is not billing or quota attribution.

## 4 November — local Google acceptance and publication authorization

The owner approved a separate loopback-only OAuth Web client and ignored local
credential configuration. Google initiation passed after the owned API restart.
At the owner's request, their password-only local test identity was removed with
exact database/identity/dependency guards; other users and production were untouched.
The owner completed Google registration. Read-only database inspection and the real
protected Instructor workspace confirm a verified Google-only local identity with
an active session; this is one real provider journey, separate from automated doubles.
Returning Google login, other live permutations, SMTP receipt and production remain
unverified. Local services remain available for the owner's tests.

The owner then authorized updating Dev1's handoff, final inspection and feature-branch
push. Merge/deployment/production operations remain separate. The handoff now records
the live local observation and exact production OAuth origin/callback requirements.
Application source remains at the independently reviewed/tested checkpoint; the
publication follow-up changes evidence only.
