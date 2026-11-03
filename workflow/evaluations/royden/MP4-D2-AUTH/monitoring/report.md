# Workflow telemetry

Feature: MP4-D2-AUTH

Counts describe observed response usage only. Missing values remain unavailable.
Cached input is included in input; reasoning output is included in output.

| Task                  | Total tokens | Active agent seconds | Dependency wait seconds | Owner wait seconds |
| --------------------- | -----------: | -------------------: | ----------------------: | -----------------: |
| coordination          |     71316597 |             7080.438 |             unavailable |          14422.283 |
| mission-brief         |       344426 |              118.634 |             unavailable |        unavailable |
| prd                   |       247335 |              219.612 |             unavailable |        unavailable |
| prerequisite-tests    |      5967458 |                885.9 |             unavailable |        unavailable |
| technical-design      |      3062379 |             1356.825 |             unavailable |        unavailable |
| prerequisite-review   |       891183 |              447.378 |             unavailable |        unavailable |
| requirements-to-tests |      1623674 |              519.957 |             unavailable |        unavailable |
| package-review        |      2346074 |              472.295 |             unavailable |        unavailable |
| implementation        |     27765806 |             4295.556 |             unavailable |        unavailable |
| functional-review     |      9719705 |          unavailable |             unavailable |        unavailable |
| standards-review      |      2913481 |          unavailable |             unavailable |        unavailable |
| security-review       |      5889212 |          unavailable |             unavailable |        unavailable |

Wall seconds: 9605.037

Tool count and duration: unavailable (no verified lifecycle correlation).

Budget warnings: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached

Diagnostics: legacy_cumulative_tokens_unsupported_v1=913, unknown_record_schema=241

Full component, agent, run, quality and collector measurements are in report.json.

Task budget warnings: implementation: tokens_soft_budget_reached, elapsed_seconds_soft_budget_reached; functional-review: tokens_soft_budget_reached; standards-review: tokens_soft_budget_reached; security-review: tokens_soft_budget_reached
