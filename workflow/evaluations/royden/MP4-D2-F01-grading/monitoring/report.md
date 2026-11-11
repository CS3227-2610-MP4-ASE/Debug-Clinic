# Workflow telemetry

Feature: MP4-D2-F01-grading

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --- | ---: | ---: | ---: | ---: |
| planning-coordination | 85453258 | 9494.866 | unavailable | 10011.848 |
| mission-brief | 374578 | 154.267 | unavailable | unavailable |
| prd-draft | 491324 | 277.565 | unavailable | unavailable |
| design-draft | 1305641 | 390.185 | unavailable | unavailable |
| rtt-draft | 1883046 | 376.196 | 204.12 | unavailable |
| spec-review | 2140341 | 528.475 | unavailable | unavailable |
| backend-build | 4980961 | 7354.154 | unavailable | unavailable |
| frontend-build | 5198388 | 7345.287 | unavailable | unavailable |
| acceptance | 5929344 | 7336.421 | unavailable | unavailable |
| functional-final-review | 943477 | 436.633 | unavailable | unavailable |
| standards-final-review | 705788 | 428.829 | unavailable | unavailable |
| security-final-review | 497641 | 420.817 | unavailable | unavailable |

Wall seconds: 19506.971

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached

Diagnostics: legacy_cumulative_tokens_unsupported_v1=653, unknown_record_schema=149

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: planning-coordination: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; mission-brief: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; prd-draft: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; design-draft: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; rtt-draft: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; spec-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; backend-build: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; frontend-build: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; acceptance: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; functional-final-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; standards-final-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; security-final-review: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
