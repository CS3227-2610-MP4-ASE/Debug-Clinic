# Workflow telemetry

Feature: MP4-D2-F01

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --- | ---: | ---: | ---: | ---: |
| coordination | 24433219 | 186.565 | 1868.901 | 13560.064 |
| grounding | 462475 | 167.58 | unavailable | unavailable |
| mission-brief | 268104 | 165.174 | unavailable | unavailable |
| prd | 264764 | 211.966 | unavailable | unavailable |
| tdd | 3023417 | 405.588 | unavailable | unavailable |
| rtt | 1590374 | 851.553 | 57.142 | unavailable |
| spec-review | 2568667 | 480.385 | unavailable | unavailable |

Wall seconds: 5602.009

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached

Diagnostics: legacy_cumulative_tokens_unsupported_v1=271, unknown_record_schema=72

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: coordination: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; grounding: tokens_soft_budget_reached; mission-brief: tokens_soft_budget_reached; prd: tokens_soft_budget_reached; tdd: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; rtt: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; spec-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
