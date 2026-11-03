# Workflow telemetry

Feature: MP4-WORKFLOW

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task       | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| ---------- | -----------: | -------------------: | ----------------------: | -----------------: |
| delivery-a |       399648 |              150.156 |             unavailable |        unavailable |
| delivery-b |       584564 |              334.592 |             unavailable |        unavailable |
| evaluation |       715552 |              321.622 |             unavailable |        unavailable |
| planning-c |       514755 |              625.105 |             unavailable |        unavailable |
| planning-d |       600135 |               794.44 |             unavailable |        unavailable |
| review     |       732089 |               219.71 |             unavailable |        unavailable |
| setup      |     17080488 |             4057.058 |             unavailable |        unavailable |

Wall seconds: 2665.512

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: none observed

Diagnostics: legacy_cumulative_tokens_unsupported_v1=257, unknown_record_schema=89

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: delivery-a: tokens_soft_budget_reached; delivery-b: tokens_soft_budget_reached; evaluation: tokens_soft_budget_reached; planning-c: tokens_soft_budget_reached; planning-d: tokens_soft_budget_reached; review: tokens_soft_budget_reached; setup: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached
