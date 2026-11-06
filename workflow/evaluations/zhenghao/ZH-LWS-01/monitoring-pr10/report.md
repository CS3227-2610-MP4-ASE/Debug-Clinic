# Workflow telemetry

Feature: ZH-LWS-01

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task           | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| -------------- | -----------: | -------------------: | ----------------------: | -----------------: |
| planning       |     78041255 |              519.741 |                5632.796 |            506.504 |
| implementation |     36940589 |             4291.612 |             unavailable |        unavailable |
| testing        |     15179061 |             2607.811 |             unavailable |        unavailable |
| documentation  |      7835314 |              3711.31 |             unavailable |        unavailable |

Wall seconds: 14649.844

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: none observed

Diagnostics: legacy_cumulative_tokens_unsupported_v1=744, unknown_record_schema=6

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: planning: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; implementation: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; testing: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; documentation: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
