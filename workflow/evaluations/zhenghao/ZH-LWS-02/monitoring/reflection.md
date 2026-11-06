# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-LWS-02

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 173776547
- Input tokens: 173144779
- Cached input tokens: 171488768
- Cache-miss input tokens: 1656011
- Cache hit ratio: 99.04%
- Cache miss ratio: 0.96%
- Reasoning output tokens: 406232
- Reasoning as share of output: 64.30%
- Reasoning as share of total: 0.23%
- Observed responses: 917

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| planning | 90845331 | 52.28% | 99.58% | 0.42% | 0.17% |
| implementation | 39759007 | 22.88% | 97.90% | 2.10% | 0.34% |
| testing | 29796095 | 17.15% | 99.45% | 0.55% | 0.30% |
| documentation | 13376114 | 7.70% | 97.86% | 2.14% | 0.21% |

Highest-token task: planning (90845331 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
