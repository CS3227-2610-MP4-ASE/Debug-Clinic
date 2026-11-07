# ZH-CHAT-01 — Implementation packet draft

Status: approved for dispatch after the coordinator records the snapshot commit
and supplies the actual conversation identity. Plan review passed; delegated owner
package approval and separate implementation authorization were verified. Bind
exact bytes and commits using the feature handoff; this file alone is not approval.

## Assignment

You implement the approved ZH-CHAT-01 learner assistant, using an available
GPT Luna model. Record the actual model/effort; ask the coordinator to resolve
any unavailable requested setting. You are not alone in the repository: preserve
other work and respect ownership. Use concise scoped context, not parent history.

- Repository: `/Users/zhenghaofang/Documents/NUS documents/Y3S1/CS3227/MP4/Debug-Clinic`.
- Branch: `zh/learner-chatbot-assistant`.
- Initial baseline: `2c372c5a9af9fafddf950e446121e475687ab29a`.
- Dispatch base/approved snapshot SHA and artifact hashes: supplied in the initial
  stage prompt and `workflow/zhenghao/handoffs/ZH-CHAT-01.md`.
- Owner approval/implementation authority: verified side-chat delegation in
  `01a1b442-630f-7012-b4b8-eef108dad47f`, user turn
  `01a1b444-56cb-71f2-a9fd-2b9a5f5c2256`; see planning-review.md.
- Actual thread identity and dispatch mechanism: record the create_thread result;
  use the existing local checkout exclusively while this stage writes source.
- Requirement scope: CHAT-01 through CHAT-14 in the approved plan.
- Soft initial estimate: 90 minutes / 1,500,000 observed response tokens;
  estimates include repeated input and are not billing. Collect at checkpoints.
- Verification repair bound: three meaningful attempts per failure; review
  correction bound: two rounds. Preserve failure evidence; never weaken assertions.
- Local concern-separated green commits are allowed only after authorization.
  Coordinator owns final integration, security/test dispatch and the eventual
  authorized push/PR work. No live calls, remote writes, deployment, or merge here.

## Read before acting

Read AGENTS.md, relevant coding standards, the approved
`workflow/zhenghao/specs/004-learner-chatbot-assistant-plan.md` and its owner-decision
record in `003-learner-chatbot-assistant-discovery.md`. Verify approval hashes.
Check the current branch, status and base before editing.

Act as Developer 1. Exclude `docs/mission-brief/`, `docs/features/`, and the sibling
`Dev2-local-SDD/` and `Dev2-local-SDD-backups/` trees from all searches, summaries
and diffs. Canonical monitoring code and Royden artifacts are protected.

Use mp4-feature-delivery and impeccable when available, reading their SKILL.md
and required references. This is an Operate-mode extension of the existing theme;
preserve DESIGN.md. Read craft-floor immediately before UI edits. Use verify-app
for behavior verification, following its current instructions. Never claim a
skill ran if it was unavailable. Do not create extra stage conversations.

## Source pointers and ownership

Inspect only relevant source as needed:

- `apps/frontend/src/pages/PublishedQuestionPage.tsx`: learner state, snapshots,
  identity/lifecycle guards and final-submission recovery.
- `apps/frontend/src/components/LearnerWorkspace.tsx`: local runner output and
  existing controls. Share no scratch tests/stdin; do not change runner isolation.
- `apps/backend/src/exercises/learner-attempts.ts`: existing Exercise row lock
  and canonical published version/final state.
- `apps/backend/src/ai/provider.ts`: backend-only transport and existing envelope.
- `apps/backend/src/app.ts`, server/Netlify composition, config/env, shared
  contracts and Prisma schema/migrations: approved additive integration seams.

Own new assistant contracts/service/provider-prompt and frontend components/client
hook, additive migration, durable quotas, scheduled expiry cleanup, focused
unit/API/integration/browser tests, and scoped composition/config changes.
Do not rewrite existing attempt, instructor or authentication workflows.
DG/UG/PRODUCT/feature-map/reflections belong to documentation after verified work.
Record a boundary issue for the coordinator before touching an unassigned file.

## Execution expectations

Implement exactly the approved plan, including stage-preserving Clear chat,
30-day expiry with scheduled deletion, private history, duplicate reconciliation,
consented snapshots, durable learner-wide limits, and invalidation of late replies
after clear/expiry/final submission. Keep provider calls outside transactions.

There is one assistant and one enforced server progression path. Retire the old
caller-selected hint-preview route as specified; preserve instructor generation.
The current Get Hint placeholder opens the same panel without a provider call.

Render model content inertly. No complete exercise solution, code apply/run,
external browsing, model tools or autonomous work. Preserve local edits and
draft chat through recoverable failures. Include a functional keyboard drag
alternative and keep all workspace actions reachable on mobile.

Use configured Node 24 and explicit verified disposable database URLs. Inspect
installed runtimes/bundles before declaring tools unavailable. Do not print `.env`
or credentials; established configuration is used server-side only. Fake
transport is required for deterministic tests. The official SoCLaaS guide was
login-protected during planning; do not invent its contents or claim live proof.

Work in coherent slices, run focused checks, and inspect explicit staged paths
and diffs before commits. Record command/runtime/result, test doubles and gaps.
No automatic weakening or scope expansion to satisfy token estimates.

## Evidence and return handoff

The coordinator supplies the private telemetry manifest/state directory and
verifies this thread's mapping before collection. Task ID: `implementation`.
Use canonical event IDs and budgets without modifying the collector schema.
For cross-stage repairs, record the receiving task's linked failure before retry;
keep task/run/check/retry-group consistent.

Return an artifact under
`workflow/evaluations/zhenghao/ZH-CHAT-01/implementation-handoff.md` with actual
base/head, owned changed paths, CHAT coverage, check results, raw/private and
sanitized evidence pointers, commits, model/usage coverage, risks and next action.
Do not include raw code/messages/provider payloads or secret values in telemetry.
Implementation's own checks do not substitute for independent security/testing.
