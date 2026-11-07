# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-CHAT-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 148861591
- Input tokens: 148350088
- Cached input tokens: 146703616
- Cache-miss input tokens: 1646472
- Cache hit ratio: 98.89%
- Cache miss ratio: 1.11%
- Reasoning output tokens: 251219
- Reasoning as share of output: 49.11%
- Reasoning as share of total: 0.17%
- Observed responses: 814

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| planning | 85150953 | 57.20% | 99.29% | 0.71% | 0.10% |
| implementation | 52828769 | 35.49% | 98.52% | 1.48% | 0.25% |
| ai-security | 10881869 | 7.31% | 97.55% | 2.45% | 0.28% |
| testing | unavailable | unavailable | unavailable | unavailable | unavailable |
| documentation | unavailable | unavailable | unavailable | unavailable | unavailable |

Highest-token task: planning (85150953 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
