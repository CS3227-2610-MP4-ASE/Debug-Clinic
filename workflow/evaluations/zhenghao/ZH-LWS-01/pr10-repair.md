# ZH-LWS-01 PR10 repair handoff

Status: source and test-collection repairs are ready for the independent
tester. The coordinator owns the complete browser/runtime matrix, reports, and
branch push. No push or deployment was performed.

## Scope

- Base: `89f852cb7cc4c3cc64dc40639c1c4a529e87c8b0` on `zh/learner-workspace`.
- Owned source: `apps/frontend/src/pages/PublishedQuestionPage.tsx` and
  `apps/frontend/src/components/LearnerWorkspace.tsx`.
- Owned test setup: `tests/e2e/learner-workspace-composed.spec.ts`. No independent
  acceptance spec was edited.
- Independent tester will add red-first behavior cases after this handoff.

## Changes

- A write error with unknown outcome or HTTP 409 triggers a read-only attempt
  GET. No mutation is retried automatically.
- A successful reconciliation updates the server attempt/revision even when the
  learner's text differs. Matching server content is marked saved; differing
  draft content stays local and dirty, with the refreshed revision used for a
  later learner-initiated Save. A missing server attempt keeps local content and
  permits a later Save with a null expected revision.
- If recovery GET fails, edits remain intact, mutation controls stay disabled,
  and an explicit “Retry attempt check” action performs another GET.
- Recovery uses the existing lifecycle, learner identity, identity revision, and
  session epoch checks. When the server already contains a different immutable
  final, the editor displays the authoritative submitted snapshot while a
  separate warning retains the unsent local code and reasoning.
- Reasoning input is bounded to four visible rows so the Save and Submit actions
  remain reachable inside the minimum-height editor.
- The composed Playwright spec no longer reads its database URL or constructs a
  Prisma client at module import. Opt-in setup validates `TEST_DATABASE_URL`,
  `DATABASE_URL`, `DATABASE_URL_POOLED`, and `E2E_TEST_DATABASE_URL` as the same
  safe loopback `_test` URL before constructing the client. Cleanup runs only
  after client initialization and disconnects in `finally`.

## Verification observed

Runtime: standalone Node `v24.22.2`, npm `11.19.0`.

- `npm run typecheck` passed across backend, frontend, contracts, functions, and
  integration TypeScript projects.
- Scoped ESLint and Prettier checks passed for the three owned source/test files.
- No-database test collection passed after unsetting all database URL variables
  and `E2E_AUTH_COMPLETION`:
  `npm exec playwright -- test tests/e2e/learner-workspace-composed.spec.ts --list`
  — two desktop/mobile cases listed.
- `npm run build -w @debugclinic/frontend` passed. Rollup reported the existing
  Zod annotation notices and the advisory that the main JavaScript chunk exceeds
  500 kB.
- No PostgreSQL-backed or live-browser suite ran in this repair pass; the
  independent tester owns those checks. The opt-in missing/mismatched database
  guard is enforced in `beforeAll` and was not exercised by a database-backed
  run here.

The coordinator's checkpoint measured cumulative usage at `35,040,974`, up
`1,832,227` from `33,208,747`, exceeding the initial incremental estimate of
`1,500,000`. The configured model remains gpt-6-luna medium as verified by the
coordinator. No budget increase was requested and no further broad verification
was run.

## Independent tester follow-up

Please cover unknown write outcomes, 409 with null and newer draft revisions,
failed recovery GET followed by explicit retry, final submission conflicts with
divergent local text, account/session disposal during reconciliation, and short
desktop editor heights with long reasoning. Verify that writes do not occur
until recovery succeeds and that no automatic write retry is issued.
