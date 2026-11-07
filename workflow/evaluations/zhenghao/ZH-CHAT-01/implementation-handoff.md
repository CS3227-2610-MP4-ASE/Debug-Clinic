# ZH-CHAT-01 implementation handoff

## Scope and provenance

- Branch: `zh/learner-chatbot-assistant`
- Approved implementation base: `87520f63844010567c844388bb725b8a8deee10a`
- Implementation agent: `implementer`, task `implementation`, run `build-1`
- Session: `01a1b448-99c6-7861-bd1d-3ea7613baff1` (local project chat, existing checkout)
- Model/effort: `gpt-6-luna/medium`
- Runtime: `/opt/homebrew/opt/node@24/bin/node`, v24.22.2
- Package approval and separate implementation authority were verified by the coordinator. This handoff records implementation evidence only; independent security, testing and documentation stages remain required.

The implementation follows CHAT-01 through CHAT-14 in the approved plan. The approved implementation packet forbids provider calls, remote writes, deployment, merge and push during this stage; none were made. The initial estimate was 90 minutes / 1,500,000 observed response tokens. Coordinator monitoring recorded an observed total of 1,580,948 tokens, above the estimate; the implementation agent did not independently collect or reconcile account usage, and that total is not billing.

## Implementation coverage

| Requirement | Implementation and current evidence                                                                                                                                                                                                                 | Remaining evidence                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| CHAT-01     | Learner/version-scoped service and protected routes; API and PostgreSQL coverage for owner isolation and denial paths.                                                                                                                              | Independent authorization review.                                                                                                      |
| CHAT-02     | Server-owned three-level progression; only a validated, persisted successful reply changes eligibility. Integration and browser tests cover successful and failed Next-hint requests.                                                               | Independent semantic review of progression wording.                                                                                    |
| CHAT-03     | Coaching system prompt defines progressive guidance and disallows complete exercise solutions.                                                                                                                                                      | Meaningful no-solution behavior is not established by deterministic tests; adversarial and benign semantic evaluation remains pending. |
| CHAT-04     | Per-message code consent defaults on; reasoning and output are independent opt-ins; scratch tests/stdin are excluded. Snapshots and whole-exchange filtering are tested in PostgreSQL.                                                              | Independent data-flow/privacy review.                                                                                                  |
| CHAT-05     | Stored snapshots label the context actually shared; provider runs outside transactions and checks exercise/conversation generation before persistence. Chat mutations do not use Attempt writes.                                                    | Independent race review.                                                                                                               |
| CHAT-06     | Private learner/version history, no instructor chat-read route, and final-submission read-only behavior. PostgreSQL tests cover final state; API tests cover role/access boundaries.                                                                | Independent route and deployment review.                                                                                               |
| CHAT-07     | Confirmed clear removes content while retaining stage/counters; 30-day expiry hides content and scheduled cleanup physically deletes it. PostgreSQL tests cover clear, expiry and cleanup behavior.                                                 | Verify deployed scheduled function and its one-hour operational bound.                                                                 |
| CHAT-08     | Request IDs are digest-bound and reconciled; clear/finalization/late-reply invalidation use database locks and generations. PostgreSQL tests cover changed-payload conflict and clear-vs-pending behavior.                                          | Independent concurrency review.                                                                                                        |
| CHAT-09     | Durable learner-wide quota rows serialize reservations across exercises; rolling-window and Singapore-day limits, retry-after and failed-call reservation semantics are implemented. Integration tests cover cross-exercise limits and retry-after. | Independent abuse/rate-limit review.                                                                                                   |
| CHAT-10     | Draggable launcher, keyboard move/reset, minimized draft/history preservation and focus restoration; opening does not request advice. Desktop and mobile Playwright cases passed.                                                                   | Independent accessibility review at zoom and alternate input settings.                                                                 |
| CHAT-11     | The shared coaching panel is reachable from Get Hint and remains usable as a desktop panel/mobile sheet. Desktop/mobile learner E2E passed.                                                                                                         | Wider long-content, 320px and mobile keyboard review remains for the testing stage.                                                    |
| CHAT-12     | Backend-only configured SoCLaaS envelope, strict response validation, bounded payload/deadline/retry handling, nullable usage and deterministic fake provider. Provider tests passed.                                                               | No live call was made. Configured-model compatibility and coaching quality remain unverified.                                          |
| CHAT-13     | Server-side authorization, context exclusion, inert text rendering and fake-provider boundaries have implementation tests.                                                                                                                          | The planned independent OWASP-mapped security review and adversarial/benign evaluation have not run.                                   |
| CHAT-14     | This handoff and the implementation monitoring record distinguish local fake/database/browser evidence from live, CI and deployment evidence.                                                                                                       | Developer/user guides, independent verdicts and incremental reflection remain assigned to later stages.                                |

## Changed implementation paths

- Shared DTOs: `packages/contracts/src/learner-assistant.ts`, `packages/contracts/src/index.ts`
- Provider: `apps/backend/src/ai/provider.ts`
- Service/API: `apps/backend/src/exercises/learner-assistant.ts`, `apps/backend/src/app.ts`, `apps/backend/src/lib/errors.ts`, `apps/backend/src/server.ts`
- Database: `prisma/schema.prisma`, `prisma/migrations/20261107130000_learner_assistant/migration.sql`
- Netlify: `netlify/functions/api.ts`, `netlify/functions/assistant-cleanup.ts`
- Learner UI/client: `apps/frontend/src/components/LearnerAssistantPanel.tsx`, `apps/frontend/src/lib/learner-assistant.ts`, `apps/frontend/src/components/LearnerWorkspace.tsx`, `apps/frontend/src/pages/PublishedQuestionPage.tsx`
- Tests: `packages/contracts/test/learner-assistant.test.ts`, `apps/backend/test/app.test.ts`, `apps/backend/test/providers.test.ts`, `tests/integration/learner-assistant.test.ts`, `tests/e2e/f02-learner.spec.ts`, `tests/support/browser-auth-server.ts`

No `.env`, credential values, provider bodies, learner data or raw session content is included here.

## Verification

All commands below used Node 24. Loopback-dependent tests ran with narrowly scoped local-network permission after the default sandbox produced `listen EPERM`.

| Check                                                        | Result                                                                                                                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                          | Pass: backend, frontend, contracts, Netlify functions and integration TypeScript.                                                                                                                              |
| `npm run db:validate` and `npm run db:format`                | Pass.                                                                                                                                                                                                          |
| `npx prettier --check` on owned TypeScript/TSX paths         | Pass. Prisma schema and SQL migration were handled by Prisma formatting; Prettier does not infer parsers for those files.                                                                                      |
| `npx eslint --max-warnings=0` on owned TypeScript/TSX paths  | Pass.                                                                                                                                                                                                          |
| `npm test`                                                   | Pass: 31 files, 535 tests. The first default-sandbox run failed on known loopback `EPERM`; the permissioned rerun passed.                                                                                      |
| Focused contract/provider/API tests                          | Pass: 3 files, 29 tests.                                                                                                                                                                                       |
| `npm run db:verify`                                          | Pass: isolated PostgreSQL 17, five migrations, repeat seed, 12 integration files, 199 tests; disposable container and synthetic data removed.                                                                  |
| `npm run test:e2e -- tests/e2e/f02-learner.spec.ts`          | Pass: 8 desktop/mobile tests. Includes Get Hint opening without auto-generation and successful-only progression.                                                                                               |
| `npm run build`                                              | Pass: contract/backend builds and Vite production build. Existing warnings: Zod annotation comments dropped by Rollup and frontend bundle is 1.263 MB minified (402.71 kB gzip).                               |
| Impeccable detector on the three changed learner UI surfaces | Completed with no reported findings. Desktop and mobile screenshots were inspected at `/private/tmp/debugclinic-ZH-CHAT-01/ui/chromium.png` and `mobile-chromium.png`; those files are temporary, outside Git. |
| `git diff --check` on the explicit owned modified files      | Pass.                                                                                                                                                                                                          |

The production build compiles the function source and `tsconfig.functions.json` typecheck passes. A Netlify-extracted artifact smoke test was not run: the repository's native Netlify build path requires explicit deployment metadata and runs `db:deploy` for development/preview. No deployment target was selected and no database migration was pointed at a configured remote environment. CI, deployment, scheduled invocation and live model behavior therefore remain unverified.

Coordinator supplied the public SoCLaaS OpenAPI contract checkpoint at [the API reference](https://soclaas-api.comp.nus.edu.sg/) and [OpenAPI document](https://soclaas-api.comp.nus.edu.sg/openapi.json): non-streamed chat uses required `model`/`messages` and a choices/message response, with optional usage; optional fields vary by model. The implementation agent's browser tool could not independently fetch that OpenAPI URL, so this is attributed to coordinator verification, not independent inspection. The SoC quickstart remained login-protected. No real provider call or credential inspection was performed.

## Independent security correction round 1

Repair base: `9e9ebf0f97905b83fdfe77ef4d32d2378ba0d200`. This round changes only
application service/provider code, their existing backend/provider and
PostgreSQL integration test paths, and this handoff. The independent
`workflow/evaluations/zhenghao/ZH-CHAT-01/security.md` report and
`workflow/zhenghao/security/ZH-CHAT-01/` evaluator were not edited.

- **SEC-01:** expiration is now processed under the existing conversation lock
  and transaction clock before request-ID replay lookup. Messages are deleted
  and pending work cancelled before a successful tombstone can be replayed;
  replay returns the empty state without a top-level old reply or another
  provider dispatch. GET/reconcile before and after cleanup, duplicate replay,
  and cancelled stale-ID behavior have regressions.
- **SEC-03:** `assembleCoachingMessages` is shared by provider transport and the
  budget calculation. The 48,000 UTF-16-unit cap now measures the serialized
  messages actually sent. Oldest whole eligible exchanges are shifted until the
  prompt fits. Required current content that cannot fit is rejected before a
  request/quota reservation.
- **SEC-02:** the system policy now rejects prompt disclosure and exact edits
  while allowing diagnosis and unrelated examples. Direct prompt-repetition
  requests are normalized and replaced with a task-focused question before
  reaching the provider. A local post-response screen checks prompt n-gram
  overlap and changed-line/correction-token alignment against the canonical
  instructor correction. The private correction is queried for this local
  comparison only; the provider input remains the public exercise projection.
  Unsafe candidates fail closed before persistence, without another model call.
  Adversarial fixtures cover Unicode-obfuscated prompt requests, prompt replay,
  exact and prose tiny-exercise edits, operator/operand prose, and cumulative
  fragments; benign diagnosis and unrelated examples remain accepted.

The SEC-02 screen is deliberately bounded and deterministic; it does not prove
semantic safety against arbitrary paraphrases or long-term cumulative disclosure
beyond the eight prior assistant replies retained for model context. Whether the
private canonical-correction comparison is acceptable as a server-only defense
was resolved by the coordinator for this repair, conditional on keeping the
canonical correction and filter metadata out of provider context, responses and
logs. No new provider, capability, or model call was added. The separate six-call
synthetic live allowance remains unused; the security reviewer must re-evaluate
real model behavior before resolving SEC-02.

Repair verification on Node 24:

| Check                                                      | Result                                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                        | Pass across backend/frontend/contracts/functions/integration.                                                                      |
| Owned-file ESLint and Prettier                             | Pass. One initial typecheck failure and one lint failure were preserved in the private monitor and corrected before green reruns.  |
| Focused provider/API tests                                 | Pass: 29/29.                                                                                                                       |
| `npm test`                                                 | Pass: 31 files, 539 tests.                                                                                                         |
| `npm run db:verify`                                        | Pass after final regression edit: isolated PostgreSQL 17, 5 migrations, 12 files, 199 tests; container and synthetic data removed. |
| Unchanged independent `run-isolated.mjs` service evaluator | Pass: 17/17, including SEC-01 expiry replay and SEC-03 three-large-send eviction.                                                  |
| Unchanged independent `provider-checks.ts`                 | Pass: 8/8. No live-provider script was run.                                                                                        |
| `npm run build`                                            | Pass after source changes. Existing Zod/Rollup annotation and 1.263 MB bundle-size warnings remain.                                |

One earlier combined `db:verify` invocation outlived the initial tool wait and
its nested session ID was not retained. Process/container completion could not
be checked before a second isolated run. Do not count that first invocation as
test evidence; its result remains unavailable. The later captured isolated run
passed and removed its own disposable container. Afterward, the coordinator
checked the installed Docker binary directly and observed no remaining
`debugclinic-verify-*` containers, which verifies cleanup at this checkpoint.

The latest private monitor collection covers the mapped implementer session
since 7 November 2026 12:33 SGT, not this repair run alone: 45,105,423 cumulative
observed tokens (44,896,934 input, 208,489 output; cached input 44,428,544 is a
subset) and 6,099 seconds of mapped session wall time. These are not billing or
repair-only figures. Preserve the original 1,500,000-token / 90-minute soft
estimate and the earlier 1,580,948-token checkpoint; the new cumulative snapshot
must not be added to them.

## Commits and next gate

Concern-separated local commits:

- `ebae9a0` — `feat(assistant): add private learner coaching service`
- `d8b9167` — `feat(assistant): add learner coaching panel`
- `e2eb967a602a7243d277e598a5562bcd9f106ca7` — `fix(assistant): address security review round one`
- This handoff is a documentation-only follow-on commit; its resulting branch head is returned with this handoff.

No push was performed. Next: re-review the exact repair head independently. SEC-01/SEC-03 local service checks pass; SEC-02 remains open pending semantic review and the separately authorized bounded synthetic model check. The existing testing and documentation stages follow that review.
