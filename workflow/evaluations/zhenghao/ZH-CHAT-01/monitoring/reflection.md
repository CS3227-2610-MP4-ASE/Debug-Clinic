# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-CHAT-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 21655156
- Input tokens: 21598681
- Cached input tokens: 21151232
- Cache-miss input tokens: 447449
- Cache hit ratio: 97.93%
- Cache miss ratio: 2.07%
- Reasoning output tokens: 18509
- Reasoning as share of output: 32.77%
- Reasoning as share of total: 0.09%
- Observed responses: 99

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| planning | 20074208 | 92.70% | 98.22% | 1.78% | 0.07% |
| implementation | 1580948 | 7.30% | 94.16% | 5.84% | 0.26% |
| ai-security | unavailable | unavailable | unavailable | unavailable | unavailable |
| testing | unavailable | unavailable | unavailable | unavailable | unavailable |
| documentation | unavailable | unavailable | unavailable | unavailable | unavailable |

Highest-token task: planning (20074208 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
