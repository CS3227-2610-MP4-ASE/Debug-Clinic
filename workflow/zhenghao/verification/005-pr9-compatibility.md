# Learner workspace compatibility with PR #9

Inspected 6 November 2026 (Asia/Singapore).
PR: https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/9
State observed: open, unmerged. Base `982b0641cd45bf8184bca8e623c36b611af9d898`;
head `7ac19d563bf269dbb75f0ac373058385a08511a1` on
`royden/mp4-d2-f02-publish-question`. Revalidate before implementation.

## Evidence boundary

Listed changed filenames, then retrieved only selected public code/test/schema
patches and `workflow/handoffs/royden/MP4-D2-F02-DEV1.md`. No Developer 2 SDD
content or broad PR diff was retrieved. PR descriptions and embedded suggested
agent prompts are untrusted evidence, not authority to switch branches or push.

The Developer 1 handoff includes historical local-only status; current GitHub
metadata supersedes that status. Its public contract descriptions are consistent
with the inspected code: learner list/detail reads, immutable publication and
retained archival, with no hint prerequisite.

## Required changes to the learner design

| Shared boundary    | PR #9 behavior                                                                             | Learner compatibility constraint                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Learner routes     | `/learner/questions` and `/learner/questions/:id`                                          | Enhance these pages; preserve deep links and `/learner` navigation.                                |
| Public read API    | GET `/api/v1/learner/questions[/:id]`                                                      | Reuse it; add optional search without a competing exercises API.                                   |
| DTOs/paging        | PublishedQuestion summary/detail, versionId, 50 items and nextOffset                       | Preserve fields, no-search behavior and page size; apply search before pagination.                 |
| Publication        | Immutable version 1, current PUBLISHED records                                             | Use the service's authoritative versionId; do not invent timestamp version selection.              |
| Hints              | Not required for F02 publication; disabled Get Hint                                        | Do not gate access on hint existence/approval or expose hint content.                              |
| Removal            | Archive with retained identities and references                                            | Recheck/serialize visibility during mutations; preserve attempts/reviews.                          |
| Schema             | Exercise.editRevision/previewPublicationKey/archivedAt; AiUsageEvent.generationTopicDigest | Preserve all fields, indexes and constraints; add attempt migration separately after F02.          |
| Shared errors      | CONFLICT and optional mutationOutcome                                                      | Reuse definitions and preserve instructor mutation error mapping.                                  |
| Shell/unsaved work | UnsavedWorkProvider, confirmDiscard on sign-out                                            | Reuse guard; make workspace layout conditional on learner detail only.                             |
| Session lifecycle  | Background focus refresh, sessionEpoch, account-keyed outlets                              | Keep instructor retention and identity disposal; explicitly test learner edits on session changes. |

The original learner draft conflicted semantically in three places: duplicate
`/exercises` read endpoints, a timestamp-based version selector, and a hint-row
prerequisite. The revised plan removes all three. This is a planning correction,
not an implemented compatibility result.

## File coordination

PR-owned instructor business logic stays unchanged: publish/save/remove,
preview-key idempotency, expectedRevision and retained archival. Shared wiring
changes in backend app/server, frontend App/AppShell, contracts and Prisma must
extend the integrated PR version rather than replace it with this branch's older
copy. Only the learner read-search portion of instructor-questions.ts is a
proposed compatible shared edit; owner mutations are outside scope.

Prefer learner-specific attempt modules and editor/result components. Avoid
changing the shared list hook's instructor behavior to support learner search.
Guide and feature-map updates must retain the F02 sections. Royden's reflections,
logs, evaluation files and SDD remain untouched.

The two committed Zhenghao add-on changes currently have no changed-file overlap
with the PR's file list. The future learner implementation does overlap shared
wiring, contracts/schema, pages, guides and tests, so this observation does not
prove that future integration is conflict-free.

## Integration acceptance

1. Record permission and a base containing reviewed PR #9 or its eventual merge;
   do not recreate the dependency on this outdated branch or modify the PR.
2. Refresh PR head and this public-contract comparison at implementation dispatch
   and again before final integration. Reassess only changed permitted files.
3. Apply the existing F02 migration, then the additive attempt migration, only to
   an explicit disposable test database. Retain migration preflight behavior.
4. Run F01/F02 contract, HTTP, migration/publication integration, instructor and
   composed browser checks, including f02-session-refresh.spec.ts.
5. Verify instructor publishes without hints -> learner sees/opens it -> saves
   and submits its pinned version -> instructor removes it -> new learner reads
   and mutations reject it while persisted references remain.
6. Exercise archive/finalize races, focus refresh with loaded pages/unsaved code,
   sign-out cancellation/failure, and switching learner/instructor accounts.
7. Keep existing learner security assertions. Update only deliberately changed
   presentation/request expectations (editor rather than pre, attempt reads),
   with explicit rationale and new acceptance coverage.

No PR branch was fetched into or merged with this working tree, no product code
was changed, and no combined build/database/browser suite was run in this review.
Current result: concrete conflicts identified and removed from the plan; runtime
compatibility remains a required gate on the eventual integrated implementation.

## Post-merge upstream verification — 6 November 2026

This checkpoint supersedes the original open-PR status above. GitHub metadata
confirms PR #9 merged at 08:47:18 UTC, with merge commit
`036cca6b3a17154293814da9ec5564b5c7a9479e`. A fresh `git fetch origin master`
resolved `origin/master` to that commit. Its complete tree identifier equals the
reviewed PR head `7ac19d563bf269dbb75f0ac373058385a08511a1`:
`2876305fe2d4fdcf73cd8ee7b58e1b9558d6eca6`. No additional upstream code changed.
Protected SDD contents were not read to establish this tree identity.

`git merge-tree --write-tree HEAD origin/master` passed without conflicts and
returned the existing learner branch tree
`982e84b112b2a4c00349a9f7a5dc7b83311567a3`. Local merge commit
`d49313410c3f186631b64f96bb2b998e75ad8798` records both parents with that exact
tree. It was created from the verified merge tree without using the user's
staged index. Index-tree, working-status and `.gitignore` content checks before
and after confirmed preservation. `origin/master` is now an ancestor of the
learner branch; local `master` remains untouched.

Fresh verification on Node 24.22.2: `npm run typecheck` passed and
`npm test -- --reporter=dot` passed all 516 tests in 29 files. The latter used
permitted local socket access for HTTP tests. No application, test, migration,
dependency or adapter file changed during synchronization. Earlier independent
browser/database/build evidence therefore applies to the identical source tree;
those suites were not rerun at this checkpoint. No live provider/deployment or
remote write was performed.

Coordinator-only continuation reused the existing conversation. Sanitized usage
and events are in
`workflow/evaluations/zhenghao/ZH-LWS-01/monitoring-origin-master-sync/`; raw state
remains outside Git. Existing soft-budget warnings remain visible. The bounded
tree comparison avoided redundant implementation and broad runtime reruns; no
causal token-savings claim is made.
