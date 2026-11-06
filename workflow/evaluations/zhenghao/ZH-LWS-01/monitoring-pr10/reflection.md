# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-LWS-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 137996219
- Input tokens: 137564647
- Cached input tokens: 136034944
- Cache-miss input tokens: 1529703
- Cache hit ratio: 98.89%
- Cache miss ratio: 1.11%
- Reasoning output tokens: 190900
- Reasoning as share of output: 44.23%
- Reasoning as share of total: 0.14%
- Observed responses: 741

## Task usage

| Task           | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| -------------- | -----------: | -------------: | --------: | ---------: | ----------------: |
| planning       |     78041255 |         56.55% |    99.29% |      0.71% |             0.08% |
| implementation |     36940589 |         26.77% |    98.48% |      1.52% |             0.23% |
| testing        |     15179061 |         11.00% |    98.81% |      1.19% |             0.19% |
| documentation  |      7835314 |          5.68% |    96.92% |      3.08% |             0.20% |

Highest-token task: planning (78041255 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
