# PR #10 repair scope and verification

User authorization: repair the failed CI and both listed issues, commit and push
to the existing `zh/learner-workspace`; no new branch or PR. Base is
`89f852cb7cc4c3cc64dc40639c1c4a529e87c8b0`, equal to the fetched remote branch.
Fetched master remains `036cca6`; it is already integrated. Existing four-stage
sessions are reused; no additional working conversation is required.

## Evidence before repair

GitHub run `42192041476`: `verify` succeeded; `browser` job `127806791221`
failed during collection, before browser journeys. The opt-in composed learner
suite constructs Prisma at module scope and calls `f01DatabaseUrl()` without an
explicit test URL. `test.skip` does not prevent module evaluation. Coordinator
reproduced the exact failure locally on Node 24 with all database variables and
`E2E_AUTH_COMPLETION` unset using `npx playwright test --list` (exit 1, zero tests
collected). This is not a failing database service or authorization to weaken
the isolated-target validator.

The page's mutation catch only displays an error: it never rereads an uncertain
save's current revision. Following a committed write with a lost response,
subsequent writes retain the stale revision. The reasoning field also has
unbounded multiline autosizing inside an explicitly clipped fixed-height editor.
Both user findings are valid and are in scope for direct repair.

## Expected observable results

- After a lost save response or revision conflict, read the authoritative
  attempt, preserve local code/explanation and dirty protection, and use its
  revision for the next intentional write. Do not retry writes automatically.
- Block mutations while reconciliation is unresolved. A failed recovery read
  offers an explicit read retry without resetting local edits. Null attempts,
  already-final attempts, navigation, expiration and account changes remain safe.
  Local text must not be presented as a different authoritative final snapshot.
- Valid long multiline explanations scroll without hiding Save/Submit, including
  the desktop minimum editor height and short viewports. Mobile stays usable.
- Normal browser collection/runs require no explicit database URL when opt-in
  composed checks are disabled. Enabled composed checks retain strict explicit
  matching loopback `_test` targets and owned cleanup.

Implementation reuses Luna medium. Independent testing reuses Sol high after
the implementation handoff, freezes its case interpretation before reviewing
the repair diff, and adds regression coverage for these failure paths. Initial
incremental soft estimates: implementation 1.5m tokens; testing 1m; documentation
0.5m. Existing cumulative-budget warnings remain visible; estimates do not
authorize weaker checks. Coordinator owns orchestration and telemetry separately.
No exact token or cost savings are inferred from this routing.

Required checks: no-URL collection, independent browser recovery/layout cases,
normal desktop/mobile suite without database variables, static checks and
production build. The isolated opt-in composed path must also be exercised
without live providers. No database schema/API contract change is planned.

## Execution record

Implementation prompt was sent to the existing implementation session through
`send_message_to_thread`, explicitly requesting `gpt-6-luna` / medium.
Coordinator owns remote push after required checks and independent verdicts.
Raw telemetry remains outside Git; use a separate sanitized PR10 checkpoint.
