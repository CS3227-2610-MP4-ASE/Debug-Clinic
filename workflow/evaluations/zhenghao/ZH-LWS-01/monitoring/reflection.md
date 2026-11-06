# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-LWS-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 105881646
- Input tokens: 105588877
- Cached input tokens: 104586880
- Cache-miss input tokens: 1001997
- Cache hit ratio: 99.05%
- Cache miss ratio: 0.95%
- Reasoning output tokens: 119183
- Reasoning as share of output: 40.71%
- Reasoning as share of total: 0.11%
- Observed responses: 537

## Task usage

| Task           | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| -------------- | -----------: | -------------: | --------: | ---------: | ----------------: |
| planning       |     61000402 |         57.61% |    99.38% |      0.62% |             0.07% |
| implementation |     33208747 |         31.36% |    98.85% |      1.15% |             0.18% |
| testing        |      9033592 |          8.53% |    98.31% |      1.69% |             0.14% |
| documentation  |      2638905 |          2.49% |    96.41% |      3.59% |             0.16% |

Highest-token task: planning (61000402 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
