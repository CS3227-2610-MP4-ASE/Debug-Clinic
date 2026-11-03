# Workflow implementation review — 3 November 2026

Independent general agent, supplied scoped instructions rather than a selected
TOML identity. Base `c551906`; first review covered `1ecd976` plus the authored
workflow documentation. No raw session data, product SDD or production resources
were reviewed. This is a workflow/tooling review, not product acceptance.

## Round 1

Functional and standards: changes required. Security: pass within reviewed scope.
The existing 28 tests passed, but independent synthetic reproductions found five
P2 defects:

1. Stored command/item metrics ignored historical `as_of` and revised `since` bounds.
2. Reassigning a task could not resolve an earlier agent's check/recovery failure.
3. A passing suite associated with a second requirement overwrote the first one's evidence.
4. Success after excessive repairs/review rounds erased the limit violation.
5. Markdown omitted task-level budget warnings visible in JSON/CLI output.

The original writer corrected these in `9e782fd`, integrated as `73ada5c`, with
six meaningful regression cases. Requirement evidence accumulates across passes
and is invalidated by a later failure of the same task/run/check. Resolved
over-limit work retains a violation separately from unresolved-blocker flags.

## Round 2

Independent original reproductions pass; **34/34 tests observed passing**.
Functional: **pass**. Coding standards: **pass**. Security: **pass within reviewed
workflow scope**. No blocking findings remain in the targeted re-review.
Additional bounded-report privacy sentinels did not appear in state/derived output.
No cumulative-token accounting defect was found: large repeated/cached inputs
can produce large totals even after response deduplication.

## Skill evaluation

Both skills passed the skill-creator structural validator. The documentation
writer also observed an isolated missing-description fixture rejected with exit 1,
parsed ten role TOMLs, and checked links. The integrated coordinator reran both
positive validators and TOML parsing. These checks establish packaging, not behavior.

The independent reviewer performed three read-only instruction-execution exercises:

| Synthetic case                                                | Observed decision                                                                      | Scope | Validity | Context | Resources | Recovery |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----: | -------: | ------: | --------: | -------: |
| Approved header, absent approval provenance, changed TDD hash | Stop dependent implementation at unsupported gate; preserve both discrepancies         |     2 |        2 |       2 |         2 |        2 |
| Dev 1 broad diff without SDD permission                       | Exclude protected content before collection; retain permitted code/test/handoff review |     2 |        2 |       2 |         2 |        2 |
| Mocked browser sign-in claimed as real authentication         | Preserve mock pass; reject broader claim; list real-session/provider/manual gaps       |     2 |        2 |       2 |         2 |        2 |

These exercises support the instructions' decision paths. They are not mutation
tests, OS sandbox tests, observed production behavior or proof of future compliance.
The eight authored scenarios in `workflow/agents/skill-evaluation.md` remain
separately labelled manual instruction-path walkthroughs.

## Remaining limits

- Legacy cumulative-only telemetry is unsupported; unknown schemas are diagnosed.
- Aggregate tool totals and response-to-slice attribution are unavailable; verified
  item metrics are separate, partial observations.
- The collector runs on invocation. It does not interrupt agents in the background.
- Hosted CI, live provider, real application journeys and production deployment
  were not exercised by this workflow-only change.
