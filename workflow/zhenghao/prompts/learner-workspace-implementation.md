# Generated implementation prompt — ZH-LWS-01

Status: authorized by the human's explicit green pass after the plan and PR #9
compatibility review. Requested model: `gpt-6-luna`, medium effort.
Local integrated base: `ae0097c734372bb675c75ce7451bf23dd9229aac`.
Proceed with implementation; do not request the already-granted authorization.
No independent package-review result is fabricated; independent review is the
subsequent testing stage under the human's compact four-conversation workflow.

You implement Zhenghao's approved learner workspace in DebugClinic. Work in
`/Users/zhenghaofang/Documents/NUS documents/Y3S1/CS3227/MP4/Debug-Clinic`, branch
`zh/learner-workspace`. Read AGENTS.md and the approved version of
`workflow/zhenghao/specs/002-learner-workspace.md`. Inspected planning base was
`69d3a30ec8e581739d52a1491111736dbcd2e34d`; verify the actual dispatched base.

## PR #9 dependency and compatibility

Read `workflow/zhenghao/verification/005-pr9-compatibility.md` before coding.
Reviewed PR #9 head is `7ac19d563bf269dbb75f0ac373058385a08511a1`.
The local branch now contains it through the authorized local merge ae0097c.
Do not change Royden's branch or retrieve excluded SDD contents.

Reuse PR #9's `/learner/questions[/:id]` pages and GET
`/api/v1/learner/questions[/:id]` APIs, PublishedQuestion schemas, versionId,
CONFLICT/mutationOutcome errors, question client and UnsavedWorkProvider.
Do not create competing `/exercises` APIs or replace owner mutation logic.
Search is an optional q extension applied before pagination with unchanged
no-q/50-item/nextOffset behavior. Publication currently uses immutable version 1;
pin attempts to its authoritative versionId. Do not select another version by
timestamps or require hints for browsing: F02 publication explicitly has no hint
prerequisite. Preserve the disabled no-call hint placeholder.

Keep instructor publish/save/remove, revision and idempotency rules unchanged.
Removal archives while retaining references; learner mutation state checks must
serialize against archive transitions. Preserve Exercise.editRevision,
previewPublicationKey, archivedAt and AiUsageEvent.generationTopicDigest, plus
the existing F02 migration. Put attempt changes in a separate additive migration.
AppShell must retain confirmDiscard. AuthProvider's background focus refresh and
RoleRoute identity/sessionEpoch semantics must survive. Learner editor guard
changes require existing instructor regression coverage.

Run the existing F01/F02 publication, learner privacy, session-refresh, migration
and composed journeys on the integrated base as well as the new learner tests.
Add publication -> learner attempt/submission -> archival coverage. A clean
textual merge alone is insufficient evidence of behavioral compatibility.

You are not alone in this repository. Preserve user edits to `.gitignore` and
`docs/Reflections-ZhengHao.md`; never revert or stage unrelated changes. Exclude
Developer 2 SDD directories from reading/search/diffs as specified in AGENTS.md.

## Goal and authority

Deliver LWS-01 through LWS-06: compact searchable published-question browser;
protected two-column Python 3 workspace; accessible editor/output resizing;
private-data-safe learner APIs; saved code/explanation and confirmed immutable
final submission. Run remains unavailable until a secure runner is approved.
Read the attached approval evidence before product-code edits. Raise missing or
contradictory authorization to the coordinator.

## Skills and design

Inspect available skills and read relevant instructions. The checked-in
`.agents/skills/mp4-feature-delivery/SKILL.md` and
`.agents/skills/verify-app/SKILL.md` exist. If available use impeccable for the
UI, including its context command and craft-floor before editing. The user has
pinned simple LeetCode-style composition in the existing light MUI theme.
Preserve typography/tokens; do not generate a new visual world, add unrelated
features, create extra conversations or run a concept tournament.

## File ownership

Own learner pages/components/library under apps/frontend/src; learner service
under apps/backend/src/exercises; their focused tests; a learner contracts module
and named index exports; compatible route wiring in frontend App.tsx, backend
app.ts/server.ts; learner-only AppShell layout; reviewed additive Prisma changes
and migration if needed. Use existing ESM and createApp injection conventions.
Do not edit instructor business logic, auth policy, deployment, monitoring
scripts, Royden artifacts, existing lessons, or reflection/guide files. Return
any changed shared-interface decision to the coordinator before dependent edits.

The compatible optional search extension, learner attempt endpoints, CORS PUT
addition, additive Attempt revision/unique constraint, learner editor retention
and learner-only shell layout are approved shared-file edits in this scope.
Use expectedRevision null to represent no saved attempt, revision 0 for a newly
created attempt, and compare-and-swap revision increments thereafter. Scope GET
and writes to authenticated learner plus canonical published versionId; no
arbitrary attempt ID selection. Lock the parent Exercise row inside attempt
mutation transactions before checking PUBLISHED so archival races serialize.
Use Prisma parameterized SQL if a row lock is required, never string interpolation.
Detect duplicate existing attempts in migration preflight and stop rather than
deleting data. Bound Unicode/null validation consistently with F02 contracts.

Explicitly preserve Get Hint disabled/no-call behavior. Keep output state types
and component testable through injection, with real production Run unavailable.
Add unit/HTTP tests and appropriate integration/browser tests; new attempts must
also be wired into tests/support/browser-auth-server.ts for real composed tests.
Modify F02 learner assertions only where the approved new editor/request behavior
requires it, preserving security expectations and pagination regressions.

## Execution directions

Use the approved technical contract rather than guessing APIs/version/submission
semantics. Validate server role/ownership/state and bounded Zod input before data
access. Use strict explicit public DTOs and Prisma selects; keep corrected
solutions, private explanations, provenance and hints out of learner responses.
No arbitrary Python, AI requests, output HTML, localStorage of code, live services
or fake production exercises. The disabled Run state has clear nearby copy.

Use an accessible multiline Python field, compact explanation field and explicit
Save draft/Submit actions. Confirm final submission; a successful response makes
the attempt read-only. Preserve edits across resize and failures. Obsolete loads
cannot overwrite current edits. Keyboard and pointer resizing must stay bounded;
mobile stacks the workspace and keeps controls visible.

## Checks and handoff

Node 24.22.1 is available at
`/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node`. Prefix PATH with
that bin directory for npm and child processes. Docker exists at
`/Applications/Docker.app/Contents/Resources/bin/docker`.
Use Node 24; verify it rather than using default Node 26. Implement meaningful
unit/HTTP/contract tests. Use only an explicitly verified disposable local test
database. Run focused tests, static/declaration builds and appropriate browser
checks. Keep failure evidence, repair one cause at a time, maximum three attempts
per failure; do not weaken tests. The independent testing chat performs final
acceptance and review after your handoff.

Record assignment/start/handoff, retries and checks through the coordinator's
explicit private workflow-monitor mapping. Initial implementation budget is
1,500,000 cumulative tokens and two hours; these are uncalibrated soft estimates.
Collect at checkpoints, report overruns and narrow unnecessary reads/output.
Model must actually be gpt-6-luna; if unavailable report it, do not substitute.

Return changed paths and exact revision/patch, observed checks and counts,
mock/database/browser boundaries, migration caveats, remaining blockers, useful
reflection observations and telemetry coverage. Wait for the coordinator's next
repair packet in this same chat. Do not create a testing/documentation chat,
push, publish, merge or deploy. Meaningful local commits of explicitly owned,
verified paths are authorized; inspect staged paths and exclude all user edits.
Write your handoff to workflow/evaluations/zhenghao/ZH-LWS-01/implementation.md.
