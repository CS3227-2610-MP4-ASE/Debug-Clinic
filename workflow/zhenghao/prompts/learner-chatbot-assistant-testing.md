# ZH-CHAT-01 — Independent testing stage packet

Dispatch only after implementation and security handoffs plus the exact integrated
base/head are supplied. Use GPT-6.1 Sol/high; reuse this conversation for repairs.

Read AGENTS.md and the approved plan at
`workflow/zhenghao/specs/004-learner-chatbot-assistant-plan.md`. Before inspecting
implementation diffs, derive and record the independent acceptance interpretation,
fixtures and expected failures in
`workflow/evaluations/zhenghao/ZH-CHAT-01/testing-interpretation.md`. Record its
time/commit provenance. Then inspect implementation/security evidence and source.
This is an instruction boundary, not a filesystem sandbox.

You are not alone: preserve existing changes, use the supplied branch/revision,
and exclude Developer 2 SDD paths before searches and diff collection. Own only
new assistant acceptance tests/fixtures and assigned testing reports; source
repairs return to the coordinator and existing Luna implementation conversation.
Do not modify approved requirements, canonical telemetry, Royden artifacts or
another owner's tests without recording an agreed ownership handoff.

Use verify-app and applicable workflow skills. Inspect commands and run configured
standalone Node 24, explicit disposable loopback database targets and synthetic users.
Do not write test files while their browser workers run. Serialize whole-tree lint
with Playwright cleanup. Do not change product assertions simply to get green.

Cover CHAT-01..14, including strict fields/UTF-16 boundaries, no-call denial,
ownership and canonical version changes, stage progression/exhaustion/clear,
context consent including quoted historical sentinels, no silent attempt write,
cross-exercise concurrent quota reservations, idempotency/lost replies,
cleanup-versus-renewed activity, final-submission/clear/pending-response races,
timeouts/malformed/oversized output, missing usage and blocked legacy preview.

Browser coverage includes click versus drag/cancel, keyboard move/reset, clamping
on resize/zoom, desktop modeless focus and mobile modal focus/keyboard, draft/
pending preservation on minimize, stale code labels, account change/disposal,
read-only final state and real pointer access to all exercise actions.
Keep existing auth, instructor and browser-Python regressions in the matrix.

Run focused checks, then applicable format/lint/typecheck/declaration and production
builds, deterministic/API tests, real PG integration, browser suites, built frontend
and packaged backend/cleanup smoke tests. Record baseline failures explicitly.
Independent security findings need regression coverage. Model-semantic/live checks
require separate owner authorization; fake transport proves orchestration only.

Task ID testing; requested soft estimate 90 minutes / 1.5m observed tokens.
Coordinator supplies private state/mapped agent before events. Preserve retry
groups and independent failures; log receiving-task findings before retries.
At most three meaningful repairs per verification failure and two review rounds.
Reuse implementation/security/testing conversations; security-sensitive changes
return to the existing security reviewer for re-verification.

Return separate functional and coding-standards verdicts, exact commands/results,
runtime/environment, code SHA, requirement coverage, mock/real boundaries,
screenshots/traces where appropriate, findings, repairs, usage/model coverage and
remaining manual/live/CI/deployment gaps in
`workflow/evaluations/zhenghao/ZH-CHAT-01/testing.md`.
No push, PR publication, deployment, merge, or new stage conversations.
