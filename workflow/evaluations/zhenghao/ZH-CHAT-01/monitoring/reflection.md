# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-CHAT-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 146315959
- Input tokens: 145819779
- Cached input tokens: 144180224
- Cache-miss input tokens: 1639555
- Cache hit ratio: 98.88%
- Cache miss ratio: 1.12%
- Reasoning output tokens: 242983
- Reasoning as share of output: 48.97%
- Reasoning as share of total: 0.17%
- Observed responses: 802

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| planning | 82605321 | 56.46% | 99.28% | 0.72% | 0.10% |
| implementation | 52828769 | 36.11% | 98.52% | 1.48% | 0.25% |
| ai-security | 10881869 | 7.44% | 97.55% | 2.45% | 0.28% |
| testing | unavailable | unavailable | unavailable | unavailable | unavailable |
| documentation | unavailable | unavailable | unavailable | unavailable | unavailable |

Highest-token task: planning (82605321 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
