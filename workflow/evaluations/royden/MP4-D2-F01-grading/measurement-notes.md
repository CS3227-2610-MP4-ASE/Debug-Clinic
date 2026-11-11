# Grading measurement notes

The monitoring manifest maps only explicitly verified session metadata, actual
thread identities and parent relationships. Raw sessions, the manifest and state
remain outside Git in the MP4 sibling `.workflow-runs/MP4-D2-F01-grading/`.
The committed reports contain allowlisted derived data. [Monitoring report](monitoring/report.md)

The collector observed 648 response records at the final checkpoint. Its token
lower bound includes repeated cached input. It represents observed response
context and usage records, and supplies no account billing or quota calculation.
Soft token and duration estimates were exceeded. Legacy cumulative usage and
unknown record schemas are diagnosed explicitly in the JSON report.

Three final-review start bounds and six matching assignment/start events were
initially recorded with a locale-sensitive PowerShell date conversion. It
transposed the month and day and inflated wall time. The coordinator preserved
the private pre-repair state, recovered the exact ISO strings from the mapped
sessions' original `session_meta` records, validated the corrected state and
regenerated the report. The corrected event-derived wall interval is about
19,507 seconds and includes owner waits and runtime interruptions.

Some interruption transitions and targeted follow-up timings were not captured
at their original occurrence. Consequently, event-derived active and wait
subtotals do not reconstruct uninterrupted working time. Reports can also show
missing per-task requirement tags where evidence was recorded at the integrated
checkpoint. The criteria-to-observed-evidence record identifies the actual
automated results and the remaining manual observations. [Verification record](verification.md)

The acceptance interpretation was committed before builder-diff exposure.
Writers used the default runtime models, with role instructions passed to generic
collaboration agents. Named role configuration files served as instructions.
Three fresh independent reviewers assessed the repaired tree after earlier
workers were interrupted by usage limits. Review verdicts retain their separate
functional, standards and security scope. [Independent review record](review.md)
