# Workflow telemetry

Feature: ZH-CHAT-01

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --- | ---: | ---: | ---: | ---: |
| planning | 14151658 | 772.728 | unavailable | 871.532 |
| implementation | unavailable | unavailable | unavailable | unavailable |
| ai-security | unavailable | unavailable | unavailable | unavailable |
| testing | unavailable | unavailable | unavailable | unavailable |
| documentation | unavailable | unavailable | unavailable | unavailable |

Wall seconds: 1644.349

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: none observed

Diagnostics: legacy_cumulative_tokens_unsupported_v1=56, unknown_record_schema=8

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: planning: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
