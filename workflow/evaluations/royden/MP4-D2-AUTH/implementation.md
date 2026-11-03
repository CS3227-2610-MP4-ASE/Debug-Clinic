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

Full integrated unit/API, expanded PostgreSQL, captured-outbox/provider-double, desktop/mobile browser, full declaration/build, final packaged runtime and independent functional/standards/security results are **pending**. The scoped backend/package checkpoint above is separate from complete acceptance. Prerequisite results remain in [prerequisites.md](prerequisites.md) and do not count as expanded-feature acceptance.

No real Google authorization, SMTP receipt, CI or production readiness result has been observed for this implementation. Dev 1 owns the deferred production diagnosis, configuration/data transition and controlled live-provider acceptance. Production readiness 503 remains an observation with unknown cause, not proof of either reported authentication failure's root cause.

Monitoring stays under the private MP4 `.workflow-runs/MP4-D2-AUTH` directory. Original overall soft estimates were already exceeded and their warnings are preserved. The resumed builder estimate is 90 minutes / 1,500,000 observed tokens. Event capture and response telemetry have coverage limits; estimates and reports do not establish subscription billing or quota attribution. Record actual outcomes below before claiming completion.
