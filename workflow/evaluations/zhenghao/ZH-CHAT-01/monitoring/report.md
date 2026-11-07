# Workflow telemetry

Feature: ZH-CHAT-01

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --- | ---: | ---: | ---: | ---: |
| planning | 85150953 | 1069.185 | unavailable | 1185.623 |
| implementation | 52828769 | 3170.108 | unavailable | unavailable |
| ai-security | 10881869 | 846.624 | 15918.332 | unavailable |
| testing | unavailable | unavailable | unavailable | unavailable |
| documentation | unavailable | unavailable | unavailable | unavailable |

Wall seconds: 19538.494

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: none observed

Diagnostics: legacy_cumulative_tokens_unsupported_v1=818, unknown_record_schema=17

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: planning: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; implementation: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; ai-security: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
