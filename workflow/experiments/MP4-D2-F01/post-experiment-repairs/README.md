# Targeted pre-push repair

Date: 5 November 2026, Asia/Singapore. Baseline:
`7707aeee09af4baa1623ce8449c22cc3a77f53b0` (`royden/f01-multi`).

The owner requested resolution of the final review findings, testing only the
specific failure cases, with at most two repair/test cycles. That request
authorizes this post-experiment prompt revision and test-harness corrections.
The original paired comparison, approved SDD snapshot and frozen candidate
remain historical evidence; their files, hashes and scores are unchanged.

## Changes and rationale

- Shared F01 tests use the existing loopback PostgreSQL `_test` target validator.
  They accept the committed CI target and retain query/fragment, remote-host and
  non-test database rejection. The experiment wrapper retains its own exact
  port/database pinning; shared tests no longer require that experiment target.
- The composed real-cookie browser journey skips when the captured-outbox runtime
  is not opted in. When enabled, it still verifies that application and cleanup
  use the same explicitly validated database. Its real-cookie assertions remain.
- `soc-question-v2` clarifies eligible beginner concepts, list/array terminology
  and introductory linear-time tasks. It asks for one short function, one
  behavioral mistake, an actual failing input and a correction/explanation that
  agree. It does not add Python execution, a classifier or a runtime judge.
  The output grammar, two-message topic-only context, refusal categories,
  transport limits and instructor-review requirement are unchanged. The prompt
  text and provenance version share one source module.

## Bounded verification

The pre-repair regression run reproduced rejection of the committed CI target
and a second safe local target; six safety cases passed. A ninth test deliberately
asserted the forthcoming v2 provenance and was red on v1.

Cycle 1 checks only the new URL/provenance regressions, exact outgoing prompt
context, one existing PostgreSQL provenance case, the composed-browser skip,
and formatting/lint on changed files. Three predeclared live topics are sampled
once each: `Python loop accumulators`, `Python function return values`, and
`Reversing an array in python in O(n) time complexity`. A fresh calibrated
independent evaluator applies the existing semantic rubric without executing
generated Python. Every outcome is retained. Any remaining finding permits one
further repair/test cycle only; unresolved results then return to the owner.

Private commands, logs and exact synthetic captures:
`.workflow-runs/MP4-D2-F01-comparison/repair-two-cycle/` relative to the MP4
root. Sanitized outcomes and final disposition are recorded here after review.
This focused check does not replace the original 11-sample comparison or claim
full-suite, hosted-CI, human-accessibility or release acceptance.

## Cycle 1 outcome

PASS: 12 focused unit/transport cases, one PostgreSQL provenance case, two correct
browser skips, changed-file formatting/lint, backend declaration build and all
three independently assessed live cases. Standards, scoped source/spec and
security repair reviews pass. A second cycle was not required. The source-review
reports predate the independent semantic report; their pending-quality wording is
resolved only by the separate three-case result, not by assuming prompt text is
proof. Exact synthetic outcomes and criterion evidence are retained in
`cycle-1-samples.json` and `cycle-1-quality.json`. `RESULTS.json` lists commands
and limits. The original common batch remains a historical failure.
