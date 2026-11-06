# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-LWS-02

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 150254265
- Input tokens: 149700255
- Cached input tokens: 148358656
- Cache-miss input tokens: 1341599
- Cache hit ratio: 99.10%
- Cache miss ratio: 0.90%
- Reasoning output tokens: 361551
- Reasoning as share of output: 65.26%
- Reasoning as share of total: 0.24%
- Observed responses: 787

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| planning | 80699163 | 53.71% | 99.57% | 0.43% | 0.17% |
| implementation | 39759007 | 26.46% | 97.90% | 2.10% | 0.34% |
| testing | 29796095 | 19.83% | 99.45% | 0.55% | 0.30% |
| documentation | unavailable | unavailable | unavailable | unavailable | unavailable |

Highest-token task: planning (80699163 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
