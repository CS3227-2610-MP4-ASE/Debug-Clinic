# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-CHAT-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 14151658
- Input tokens: 14116633
- Cached input tokens: 13767808
- Cache-miss input tokens: 348825
- Cache hit ratio: 97.53%
- Cache miss ratio: 2.47%
- Reasoning output tokens: 10733
- Reasoning as share of output: 30.64%
- Reasoning as share of total: 0.08%
- Observed responses: 57

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| planning | 14151658 | 100.00% | 97.53% | 2.47% | 0.08% |
| implementation | unavailable | unavailable | unavailable | unavailable | unavailable |
| ai-security | unavailable | unavailable | unavailable | unavailable | unavailable |
| testing | unavailable | unavailable | unavailable | unavailable | unavailable |
| documentation | unavailable | unavailable | unavailable | unavailable | unavailable |

Highest-token task: planning (14151658 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
