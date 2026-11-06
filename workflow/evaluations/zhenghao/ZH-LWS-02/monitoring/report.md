# Workflow telemetry

Feature: ZH-LWS-02

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --- | ---: | ---: | ---: | ---: |
| planning | 90845331 | unavailable | unavailable | unavailable |
| implementation | 39759007 | 9187.34 | unavailable | unavailable |
| testing | 29796095 | 12954.059 | unavailable | unavailable |
| documentation | 13376114 | 1139.602 | unavailable | unavailable |

Wall seconds: 15647.013

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: tokens_soft_budget_reached

Diagnostics: legacy_cumulative_tokens_unsupported_v1=1690, unknown_record_schema=12

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: planning: tokens_soft_budget_reached; implementation: tokens_soft_budget_reached; testing: tokens_soft_budget_reached; documentation: tokens_soft_budget_reached
