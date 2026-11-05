# Developer 1-safe local implementation handoff

## Post-experiment repair update

The owner authorized targeted correction of final-review issues, at most two
cycles. Cycle 1 resolves the shared CI test-database target and default-browser
opt-in regressions. Prompt `soc-question-v2` clarifies beginner topics and one-bug
coherence; provenance uses the same version authority. The unchanged wire grammar,
auth interfaces, migration and publication boundary are preserved.

Observed targeted checks: 12 unit/transport passes, one real-PG provenance pass,
two correct opt-out skips, changed-file lint/format and backend declaration build.
A calibrated independent evaluator passed all three targeted live cases; source,
standards and security repair reviews pass. No second cycle or full-suite rerun.
This does not replace the frozen experiment or establish full release acceptance.
Owner authorization covers pushing this branch after resolving these findings;
PR creation, merge and deployment need their own authority. The earlier frozen
handoff follows as historical evidence.

Local branch `royden/f01-multi`, corrected source commit
`4e610dd504b42cbb4ea648ee0ebc24282605a8ae`. No push, merge or deployment performed.

Instructors can generate an unsaved six-field preview, edit it, explicitly save
a private draft, list their own drafts and reopen read-only. Shared wire schemas
are additive. Four nullable ExerciseVersion columns have an additive migration;
legacy records are not backfilled. Both backend runtime compositions inject the
draft module. Existing authentication, learner and hint interfaces are preserved.

Verified locally with Node24.14.0/npm11.9.0: 365 unit/API cases, 162 PostgreSQL
cases, 100 browser cases/two disclosed opt-in skips, typecheck/lint/format,
declaration build and extracted Netlify ESM/cookie/F01 smoke. Independent
functional, standards and security re-reviews pass after scoped repairs.

Local AI is fake/injected transport only. Actual live-provider quality, human
accessibility/product review, hosted CI/native build and deployed-platform
acceptance remain pending with their respective owners. This handoff requests
no external action and grants no publication/deployment authority. Developer 1
review scope is code, tests and shared contracts; private Developer 2 planning
artifacts remain excluded.
