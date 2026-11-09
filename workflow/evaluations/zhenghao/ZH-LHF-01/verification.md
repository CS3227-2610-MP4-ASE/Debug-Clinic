# Learner hotfix independent verification

Coordinator: GPT-6.1 Sol/high. Sole implementation writer: a new Codex app
conversation using verified GPT-6 Luna/high, thread
`01a1beda-5226-7ba1-a257-c50b980b8035`. This is the owner-authorized expedited
six-item hotfix, not authorization for the constrained-coaching redesign.

Branch: `zh/learner-hotfixes-20261109`, based on master `44b931c`.
Requirements: [frozen acceptance](acceptance.md).

## Independent observations

- LHF-01: the request ledger enforces 100 logical MESSAGE/NEXT_HINT requests
  across exercises per rolling ten minutes; the daily check was removed.
  Existing serialized reservation and duplicate-replay handling remain intact.
  Real PostgreSQL cases cover 100/101, expiry, Retry-After, earlier same-day
  usage, cross-exercise competition and replay; reads remain uncounted.
- LHF-02: the server derives identity from authenticated session state and
  aggregates distinct exercise IDs across owned versions. Final submission
  takes precedence over drafts for completion. A batched canonical-publication
  lookup excludes inaccessible or invalid drafts from resume links. Independent
  review found premature deduplication could suppress a valid current draft;
  the writer moved deduplication after eligibility and added a regression.
  Both local-server and Netlify composition inject the dashboard service.
- LHF-03–06: local MUI search styling preserves blue keyboard focus; the legacy
  list redirects with query/hash to `/learner/question`, while detail/API paths
  stay plural. Home is role-specific and signed-in branding is plain content.
  Existing dirty-work protection remains exercised. Loading uses MUI progress
  and skeletons with the existing reduced-motion rule.

Desktop/mobile synthetic screenshots were inspected at
`/private/tmp/zh-lhf-01-{dashboard,list,detail}-{chromium,mobile-chromium}.png`
(where produced). They establish local layout evidence, not production behavior.

## Executed checks and repair history

Writer evidence: 540/540 contract/backend tests, 11/11 frontend tests, 206/206
disposable PostgreSQL integration tests, 8/8 focused desktop/mobile browser cases,
root typecheck and production/declaration builds passed. Earlier listener/IPC
permission failures were rerun with scoped execution permission. Invalid new
Prisma fixtures were corrected, including nullable JSON using `Prisma.DbNull`.

The coordinator independently packaged the API with pinned Netlify CLI 27.16.1
and imported the extracted ESM Web handler. Real synthetic sessions verified
anonymous 401, instructor 403, empty dashboard, draft counts/resume, final counts,
and existing save/final/idempotent retry/archive behavior. The fake AI provider
was used. The owned loopback PostgreSQL 17 container and data were removed.
Initial private-probe failures came from implicit CJS under `node_modules` and
packaging before rebuilding contract exports; neither established a product bug.

Full independent Playwright (`--workers=2 --retries=0`) completed with **209
passed, 20 skipped, five failed**. The failures were two old dashboard-heading
expectations, two initial-response-wave races in the new dashboard error test,
and one hidden mobile Home locator. They were returned as one repair packet;
loading, error, sign-out and unsaved-run assertions must remain intact.
Original log: `/private/tmp/debugclinic-lhf-browser.log`; failure artifacts:
`/private/tmp/debugclinic-lhf-first-full-results/`.

The writer's subsequent three-spec rerun completed **51 passed, one failed**;
dashboard retry and sign-out failures were resolved. The remaining mobile case
checked menu visibility during modal dismissal. The second repair waits for
dialog removal and uses the known viewport to open navigation. The coordinator's
final independent two-case rerun passed **2/2** on desktop/mobile (12.0 seconds,
one worker, zero retries). The original 234-case suite was not rerun in full;
keep these separate observations rather than claiming one 214-pass full run.
Its final log is `/private/tmp/debugclinic-lhf-final-mobile.log`. Both owned
PostgreSQL containers were removed. No application code changed during these
browser-test repairs.

Functional verdict: **pass for the six-item hotfix**, based on source review,
real PostgreSQL/package checks and the full-plus-targeted browser evidence above.
Coding-standards verdict: **pass**. Independent whole-tree ESLint with zero
warnings, changed-file Prettier and whitespace checks passed. Root declaration
typechecking/build evidence is recorded above. Final production commits are
`e1f0c9e` (quota) and `2329786` (dashboard/navigation/UI with tests and guides).

## Development usage checkpoint

The [sanitized report](monitoring/reflection.json) fixes observed usage at
2026-11-09 06:36:26 UTC. It maps the new Luna/high thread to implementation
and the existing Sol/high session, from this hotfix request onward, to
verification including coordination/documentation. Both token soft budgets and
the implementation elapsed soft budget were exceeded. Execution already used
the requested cheaper model; no quality or test criteria were reduced.
The checkpoint contains 352 responses, 55,524,880 aggregate tokens, 501,031
cache-miss input tokens and a 99.09% cache hit ratio. These measurements do not
establish cost savings or reduced raw tokens; no comparable baseline/pricing
calculation exists. Unsupported/missing records remain unavailable. Private
manifests, raw sessions and event state stay outside Git, and canonical/Royden
monitoring paths and schemas were unchanged. Later coordinator closeout is
outside this fixed checkpoint.

## CI screenshot portability repair

GitHub Actions run `42574414422` passed 208 browser cases and skipped 20,
but failed all six hotfix cases while writing screenshots to macOS-only
`/private/tmp`. Replace those three paths with Playwright's per-test
`test.info().outputPath()` so Linux CI creates and retains portable artifacts.
The affected desktop/mobile spec passed 6/6 locally (8.4 seconds, no retries),
using fake AI and an owned disposable PostgreSQL container, subsequently removed.
Scoped ESLint and Prettier passed. Remote CI for the repair is pending.

## Evidence limits

The normal browser run skips 20 opt-in composed/auth-completion cases. Browser
journeys combine HTTP doubles with real local fake-provider authentication and
Python execution cases; they do not establish live SoCLaaS/Google/SMTP behavior.
Packaged API checks use real cookies/PostgreSQL but no deployment. Production,
remote CI, live AI usefulness and the earlier assistant security blockage remain
outside this hotfix evidence. Nothing was pushed or deployed.
