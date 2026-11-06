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

## Verified handoff

Repair source `b5837fe`; acceptance freeze `3427713`; independent tests/report
`792b387`. Functional, standards and security verdicts are pass. Normal no-URL
browser suite: 168 passes and 20 expected opt-in skips (includes 24 new cases).
Deterministic suite: 531 passes (includes 15 isolated opt-in guard cases).
Separate real-cookie/PostgreSQL composed journeys: 8 passes. Lint, typecheck,
scoped format, full production/declaration build and 16 built-asset route/viewport
loads pass. Coordinator workflow-monitor suite: 39 passes. No API/schema/backend
business-logic change; unchanged integration/package checks were not repeated.

Original-source overlays independently reproduce the save/conflict/retry and
desktop clipping failures; repaired source hashes remained unchanged. The first
layout probe permitted locator auto-scroll, and a later unsupported visible-height
threshold rejected a reachable action. The final frozen-outcome test uses actual
clipping-center hit tests and wheel/mouse activation; it fails original desktop
code and passes all six repaired layout cases. Coordinator prematurely announced
the intermediate harness failure as a product defect, then corrected that claim.
AGENTS guidance now requires consolidated reproduction before such claims.

Current-turn model metadata verified implementation `gpt-6-luna` / medium and
testing `gpt-6.1-sol` / high. Implementation observed cumulative checkpoint
35,040,974 minus preceding delivery 33,208,747 = 1,832,227 additional tokens,
exceeding the initial 1.5m estimate. Testing checkpoint 10,918,225 minus 9,033,592
= 1,884,633, exceeding the initial 1m estimate. Both retained the requested model;
execution was already Luna and testing must remain Sol high. Coordinator narrowed
repeated reads/output and omitted unchanged layers without weakening acceptance.
These are cumulative telemetry checkpoints, not final task totals or proof of
cost/token savings. Subsequent documentation and final orchestration are separate.

Documentation checkpoint: cumulative 3,989,276 minus preceding delivery 2,638,905
= 1,350,371 additional observed tokens, exceeding the initial 0.5m estimate.
Current writer model/effort was verified as `gpt-6-luna` / medium. Coordinator
requested bounded reads and completion of only the targeted evidence-based docs;
no budget was raised or unsupported savings claim added. The earlier fixed
reflection snapshot remains unchanged.

The owned disposable PostgreSQL container was inspected by exact ID/name/image
and loopback mapping and removed after all composed checks completed. Product
source/setup still equals tested `b5837fe`; no backend/API/schema repair occurred.
The refreshed origin/master remains `036cca6`, already an ancestor of this branch.
Local master remains untouched. The user explicitly authorizes pushing the
verified changes to the existing `zh/learner-workspace`; no new branch/PR, remote
comment, merge or deployment is authorized here. Remote CI results must be
observed after that push, not inferred from the local pass.

Documentation commit `178e864` passed coordinator accuracy review and scoped
format/link checks. DG/UG describe verified behavior; the singular reflection
adds only relevant supported learning, preserving the fixed resource checkpoint.
The final local handoff snapshot is `monitoring-pr10/`. It includes the original
delivery and continued stage sessions; it is not a pure PR10 bill or quota record.
Historical coverage/unsupported-record diagnostics remain visible, and later
push/CI observation/chat activity is outside this snapshot. No causal savings
claim is made. Royden's monitor/schema/templates/output paths remain unchanged.
