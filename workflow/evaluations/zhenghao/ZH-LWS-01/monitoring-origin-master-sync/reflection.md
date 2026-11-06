# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-LWS-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 108633738
- Input tokens: 108328108
- Cached input tokens: 107241344
- Cache-miss input tokens: 1086764
- Cache hit ratio: 99.00%
- Cache miss ratio: 1.00%
- Reasoning output tokens: 123320
- Reasoning as share of output: 40.35%
- Reasoning as share of total: 0.11%
- Observed responses: 554

## Task usage

| Task           | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| -------------- | -----------: | -------------: | --------: | ---------: | ----------------: |
| planning       |     63752494 |         58.69% |    99.27% |      0.73% |             0.07% |
| implementation |     33208747 |         30.57% |    98.85% |      1.15% |             0.18% |
| testing        |      9033592 |          8.32% |    98.31% |      1.69% |             0.14% |
| documentation  |      2638905 |          2.43% |    96.41% |      3.59% |             0.16% |

Highest-token task: planning (63752494 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
