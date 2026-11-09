# ZH-LHF-01 implementation handoff

## Scope and ownership

Implemented the approved learner hotfix package on branch
`zh/learner-hotfixes-20261109`, based on `667a5bc4049a5eddbf41d00f80ae3fc5665c2e92`.
The scope covers LHF-01 through LHF-06: assistant quota, learner dashboard
counts and resumable drafts, search focus, Home/workspace routes, loading and
retry feedback, and authenticated static branding. No schema migration was
needed. This handoff is implementation-owned; `acceptance.md`, `verification.md`,
root `AGENTS.md`, and coordinator monitoring/reflection artifacts remain
coordinator-owned.

## Behavior delivered

- Assistant `MESSAGE` and `NEXT_HINT` requests share a limit of 100 per learner
  across exercises in a rolling ten-minute window. Daily limiting was removed.
  Existing idempotency, locked quota-row concurrency handling, and retry timing
  remain in place. Reads do not consume quota.
- The authenticated learner dashboard reports distinct owned exercises, uses
  final-submission precedence for completion, and exposes only current public
  canonical drafts as resumable items. Its API derives identity from the
  authenticated session and returns a strict contract.
- `/learner/question` is the canonical list route. The plural legacy route
  redirects while preserving search parameters. Home and workspace links are
  role-aware; signed-in branding is static, while anonymous branding remains a
  Home link.
- List search retains keyboard/mouse focus with the local focus treatment.
  Dashboard, list, and detail views expose loading, retryable error, and empty
  states as applicable, with request cancellation/session guards on the
  dashboard.

## Verification evidence

Node 24.22.2 was used. These local checks passed before the final browser-test
repair:

- Root contracts/backend unit and API suites: 31 files, 540 tests passed. The
  first un-escalated attempt was blocked by loopback `EPERM`; the same command
  passed with scoped local-network permission.
- Frontend unit suite: 3 files, 11 tests passed.
- Disposable PostgreSQL integration verification: 14 files, 206 tests passed;
  five migrations and synthetic seeds were applied, then the container was
  removed.
- `npm run typecheck` passed for backend, frontend, contracts, functions, and
  integration sources.
- Production `npm run build` passed. Output included upstream Zod comment
  warnings and the existing large JavaScript chunk warning.
- Focused learner hotfix/workspace browser run passed 8 tests across desktop
  and mobile Chromium. Six dashboard/list/detail screenshots were inspected:
  `/private/tmp/zh-lhf-01-dashboard-chromium.png`,
  `/private/tmp/zh-lhf-01-dashboard-mobile-chromium.png`,
  `/private/tmp/zh-lhf-01-list-chromium.png`,
  `/private/tmp/zh-lhf-01-list-mobile-chromium.png`,
  `/private/tmp/zh-lhf-01-detail-chromium.png`, and
  `/private/tmp/zh-lhf-01-detail-mobile-chromium.png`.
- A subsequent three-spec desktop/mobile run passed 51 of 52 tests. It found a
  mobile Home-navigation test race after dismissing the unsaved-work dialog.
  The frozen test now selects mobile navigation from viewport width, waits for
  the dialog to close, and waits for Home to become visible. The focused rerun
  of that case passed on desktop and mobile (2/2, 11 seconds). The other 51
  targeted cases passed in the preceding run.
- The coordinator's earlier full Playwright run recorded 209 passed, 20
  expected skips, and 5 failures. The focused repair run covers the affected
  sign-out, dashboard retry, and IDE Home journeys; the independent full-suite
  failures should remain separately recorded. The coordinator reported the
  packaged API smoke test passed using synthetic data and its temporary database
  was removed.
- Changed-file formatting and `git diff --check` passed before the final mobile
  test adjustment. The three touched E2E specs were formatted again after that
  adjustment. The coordinator owns the final whole-tree lint and changed-file
  formatting checks.

All API/database/browser data was synthetic and local. No live AI provider,
external account, deployment, push, or production mutation was used. The
database verification used a disposable local container. The prior full-suite
failures and successful targeted repairs remain separate observations; this
handoff does not represent them as a clean rerun of the entire browser suite.

## Commit record

The implementation is recorded in two concern-separated local commits below.
The coordinator's unrelated `AGENTS.md` change remains unstaged.

- Assistant rolling quota: `e1f0c9e` (`fix: use rolling learner assistant quota`).
- Dashboard, routes, loading feedback, docs, and tests: `2329786`
  (`feat: add learner dashboard and route polish`).
