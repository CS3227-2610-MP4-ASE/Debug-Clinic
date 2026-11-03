# Authentication local implementation evidence

Package `MP4-D2-AUTH-20261103-R2`; approved snapshot `9011d4664d873789677ca658e397e2f7e2f77a4e` on `royden/auth-completion`, stacked on prerequisite checkpoint `441838145f719f02810737fc435c4b59c2682901`. The owner separately approved the exact package and authorized local implementation. Approved four-artifact hashes remain unchanged.

## Resumption checkpoint

The initial builder dispatch reported an account usage limit immediately and produced no feature source or checks. On the owner's **resume**, coordinator verified the clean snapshot and dispatched fresh generic `/root/auth_builder_resumed` using the implementer instructions and complete approved package. Actual child identity `01a1a1e3-33dd-7811-a4cf-ba00cd9fc2eb`, parent/task corroborated against its own first session metadata; no named-role runtime or model override claimed.

Resumed shell default was Node 22.23.3/npm 10.9.9. Installed `C:/Program Files/nodejs` provides the required Node 24.14.0/npm 11.9.0; commands explicitly prepend that directory. Initial sandbox fetch of pinned Netlify CLI failed with EACCES before packaging. The elevated same-command retry succeeded and returned actual `functions:build --help` for 27.16.1; this downloaded a local tool, without site connection or deployment. Application dependency preparation is builder-owned and not yet recorded as passing here.

Coordinator is adding an isolated packaged-function smoke runner. The pinned CLI's `functions:build` implementation calls `zipFunctions(src, dst)` without resolved function configuration; passing only source/destination would omit this repository's included files/external settings. Actual packaging verification must therefore retain the repository configuration and report the precise packager invocation. Neither downloading the CLI nor compiling source establishes packaged runtime correctness.

## Results and limitations

Early packaging checkpoint: `node scripts/package-netlify-artifact.mjs <absolute pinned CLI package.json>` produced a real ZIP using CLI 27.16.1, API v2, ESM output and actual `nft` tracing (the API v2 packager chooses this bundler). The extracted `netlify/functions/api.mjs` failed startup with allowlisted category `ERR_MODULE_NOT_FOUND`. Module-resolution inspection confirmed the new core context import existed only under the backend workspace, while the flattened packaged module resolves from the package root. This is a confirmed local packaging defect; it does not establish a production failure cause. A compatible dependency-placement repair is assigned to the builder; no passing runtime result is claimed. Sandbox-only esbuild path-access and tsx `userInfo` failures were retried with the same commands outside the sandbox before diagnosing the actual module issue.

Focused coordinator tool checks: ESLint on the two packaged-verification scripts and Prettier on those scripts, ledger and this report passed under Node 24.14.0. These are static tool checks, not application acceptance.

### First green backend and packaged-runtime checkpoint

Builder commit `0c1625af6b9bc89939ebb4dfb826cbf766fc6047`: writer reports `npm run test:api` **116/116**, `npm run test:integration` **3/3**, backend declaration build and focused ESLint pass; pure canonical cases **5/5** are included in the API result. These are scoped writer-local checks, not the final integrated suite. Existing proxy integration initially failed with `google_intent_invalid`; inspection established that installed dispatch overwrites before-hook response headers. Moving signed intent-cookie emission to the after hook repaired that observed flow. The broader race, rollback and browser cases remain pending.

Dependency placement repair adds exact compatible core at the root, retaining the explicit backend dependency. Coordinator rebuilt with the same pinned packager/config and extracted the real ZIP. With Node 24.14.0, identical explicit direct/pooled/test target `127.0.0.1:55434/auth_completion_test`, and synthetic `auth_builder` trust-auth role, the command
`node --import tsx scripts/verify-netlify-artifact.ts <absolute-extracted-netlify/functions/api.mjs>`
**passed all smoke checks**: ESM startup, health/readiness 200, anonymous `/me` 401, mixed-case/spaced instructor signup, cookie roundtrip, persisted canonical email/role, instructor access 200, learner-only denial 403, sign-out and revoked cookie 401, malformed auth JSON safe rejection. The unique synthetic user was deleted in `finally`; no other fixtures or services were reset. No source-created Prisma pool existed before loading the artifact.

Actual package metadata: API v2, ESM, `nft` bundler, pinned CLI 27.16.1. Ignored artifact directory `.netlify/auth-smoke-c1cb56db-6cad-456e-b496-c307ba80ef0c`; raw package/manifests remain local. This executes the extracted packaged **application Web handler**, not Netlify/AWS bootstrap or a deployed platform. Library malformed-JSON diagnostic was static and contained no supplied body. The first package failure remains recorded; one dependency-placement repair resolved it. Repackage if subsequent backend changes affect the artifact.

Subsequent tool isolation check: coordinator applies the sanitized environment even when an internal worker marker is inherited. Rerunning the same artifact with that marker, production mode and deliberately invalid synthetic Google/SMTP values inherited still passed all smoke checks; no external provider/mail configuration was used. This tests the runner's isolation repair, not the later application resend-status change. Packaged copies caused repository-wide ESLint to scan traced vendor files because Git ignore does not govern ESLint. All three owned package trees were moved, with resolved source/destination paths verified first, under `.netlify/node_modules/`; future package output uses that ignored subtree. No ESLint/workflow machinery changed and no artifact was deleted. The retained passing artifact is now `.netlify/node_modules/auth-smoke-c1cb56db-6cad-456e-b496-c307ba80ef0c`.

Expanded writer checkpoint: full typecheck and PostgreSQL **23/23** (20 new cases plus three baseline) reported passing. Resend tests established that body-only after-hook replacement retained a prior error status; returning an explicit HTTP200 Response repaired the required uniform acceptance. This source change requires a final rebuilt package. Desktop/mobile browser and remaining adversarial matrix work continue; no complete-feature acceptance is inferred from the count.

### Built frontend defect and repair

Coordinator `npm run build` passed with explicit synthetic local configuration,
including Prisma generation and declarations, but emitted a vendor/React circular
chunk warning. A real browser loading the emitted files on an owned Vite preview
showed a blank `/` and `Cannot set properties of undefined (setting 'AsyncMode')`.
The same public heading was present under the development server. No credentials
or account input were used in this diagnostic; raw output stays in the local
session. The first preview invocation used the monorepo root and correctly failed
because its `dist` is in the frontend workspace; correcting that working directory
enabled the runtime reproduction.

One meaningful repair removed the hand-written `manualChunks` graph from
`apps/frontend/vite.config.ts`, allowing Rollup to arrange dependencies. Rebuilding
the frontend then running `node --import tsx scripts/verify-built-frontend.ts`
passed **16 public route/viewport loads** (eight routes × desktop1280×720 and
Pixel7). This committed regression tool serves emitted files on an owned ephemeral
preview, with only a local synthetic anonymous API; it checks heading rendering,
JavaScript errors, external assets and horizontal clipping. It creates no database
connection and records no account/token traces. Its preview/browser close in
`finally`; the earlier owned port5174 preview was also stopped. Focused lint and
format pass. The replacement bundle is about641kB/201kB gzip; the ordinary size
warning remains visible. This is a confirmed local bundle defect and repair, not
proof of the reported deployed failure's cause. A final complete build and review
remain required.

### Expanded browser and adversarial writer evidence

Writer reports **10/10 BW** on desktop/Pixel7: both password roles with captured
verification/resend/recovery/reset, URL-token removal, retry, restore and logout;
both Google-controller roles with real local callback/cookies/database, recovery,
password signin and immutable returning role; labelled keyboard/overflow checks.
No browser interception or live Google/SMTP was used. External Google authorization
is explicitly controller-substituted; provider exchange/profile are server doubles.
The outbox is private filesystem state, not an HTTP debug route. Sensitive journey
trace/screenshot capture is disabled.

Writer also reports default smoke/feedback **54 passed /12 explicit opt-in skips**,
including six actions × typed/unknown/network failures with pending-lock/retry
checks on both projects. Combined PG **30/30** passed, then two additional proxy
security cases **2/2** passed separately. These add cross-method/Google registration
races, association preservation, direct/proxy callback races and post-claim rollback,
second-tab/cookie/ciphertext/expiry checks, verification-JWT ownership and Google-first
reset races. Final combined run after remaining privacy tests is still pending.

### Committed builder checkpoint

`a276f61804dda752c92b7fa4217d1544594b8d11` records the coupled UI and expanded
tests after backend commit0c1625a and coordinator package-tool commit98e4102.
Final writer-local results on Node24.14.0/npm11.9.0: full lint, typecheck and format
pass; `npm test` **126/126**; explicit owned-target `npm run test:integration`
**34/34** across four files; completion BW command above **10/10** after the final
refresh/completion repair; default `npm run test:e2e -- --workers=2` **58 passed,
12 explicit opt-in skips**. These results are writer-local until coordinator's
integrated rerun below. One existing signup-race oracle is being strengthened to
assert the precise winning role/password before review; it does not change behavior.

The last BW rerun exposed a real ordering failure: initial AuthProvider restoration
could supersede completion's authoritative read and leave navigation stuck despite
a signed-in header. Completion now waits for initial loading to settle and guards
its one automatic attempt; the repaired BW rerun passed10/10. Session refresh returns
its authoritative user or null and stale request versions cannot authorize navigation.
Feedback mappings reject inherited object keys; action errors receive keyboard focus.
Private captured-outbox journeys disable sensitive traces/screenshots.

Coordinator rebuilt the final backend ZIP after the resend status repair; its
extracted Web-handler smoke passed again. Retained artifact:
`.netlify/node_modules/auth-smoke-c5c3af00-8b0a-44c9-b68f-3af3cc81d412/api.zip`,
SHA256 `2bd7567dfb6adda29245d732e70687536e9f401135357192305e1b940397057c`.
Backend source has not changed since this package. Coordinator also ran the existing
workflow regression suite: **34/34 passed**, with no workflow machinery changes.
Independent reviews and final integrated full build/checks remain pending.

### Coordinator integrated static/build and initial independent review

At clean head6519252, coordinator full lint, format and typecheck passed. The first
unit run had an unexpected worker exit (117/126, no failing assertion); the unchanged
`npm test` rerun alone passed126/126. Both raw logs are retained privately; no source
or expected outcome was changed to obtain green. The worker-exit cause is unknown.
Coordinator full build with explicit synthetic local configuration passed; its
emitted frontend passed the strengthened M03 keyboard and exact-page checks. The
final production-mode build and post-repair database/browser/package runs follow
the review repair checkpoint.

Independent standards review passes at6519252. Functional/security reviews require
changes: strict legacy/pooled fixture target guards, containment of actual raw auth
exception logging, and targeted frozen test evidence. [Independent review record](implementation-reviews.md)
preserves exact verdicts, severity, scope and limitations. The first targeted repair
batch is underway; no local-complete verdict or production readiness is claimed.

First review repair is committed as `b30c32a29c65caf85828b20b38a907b50a73e4c1`.
Writer-local focused guard/privacy units16/16, targeted old/new PG9/9, full typecheck,
backend declarations and scoped lint/format pass. The new handler/session exception
boundaries require rebuilding and executing the backend package again. Coordinator's
deeper M03 emitted-file keyboard checks pass; independent repair-head review and
final complete unit/PG/browser/production-mode build checks follow this checkpoint.

Full integrated unit/API, expanded PostgreSQL, captured-outbox/provider-double, desktop/mobile browser, full declaration/build, final packaged runtime and independent functional/standards/security results are **pending**. The scoped backend/package checkpoint above is separate from complete acceptance. Prerequisite results remain in [prerequisites.md](prerequisites.md) and do not count as expanded-feature acceptance.

No real Google authorization, SMTP receipt, CI or production readiness result has been observed for this implementation. Dev 1 owns the deferred production diagnosis, configuration/data transition and controlled live-provider acceptance. Production readiness 503 remains an observation with unknown cause, not proof of either reported authentication failure's root cause.

Monitoring stays under the private MP4 `.workflow-runs/MP4-D2-AUTH` directory. Original overall soft estimates were already exceeded and their warnings are preserved. The resumed builder estimate is 90 minutes / 1,500,000 observed tokens. Event capture and response telemetry have coverage limits; estimates and reports do not establish subscription billing or quota attribution. Record actual outcomes below before claiming completion.
