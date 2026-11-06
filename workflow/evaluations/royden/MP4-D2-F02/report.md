# Workflow telemetry

Feature: MP4-D2-F02-implementation

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --- | ---: | ---: | ---: | ---: |
| coordination | 25256148 | 26254.42 | unavailable | unavailable |
| backend | 12092565 | 27205.906 | unavailable | unavailable |
| frontend | 14280165 | 27205.395 | unavailable | unavailable |
| functional-review | 5602680 | 386.176 | 25438.485 | unavailable |
| standards-review | 3833640 | 231.526 | 25206.681 | unavailable |
| security-review | 3277143 | 25206.808 | unavailable | unavailable |

Wall seconds: 26254.42

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached

Diagnostics: legacy_cumulative_tokens_unsupported_v1=475, unknown_record_schema=139

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: coordination: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; backend: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; frontend: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; functional-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; standards-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; security-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
