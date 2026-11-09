# Zhenghao workflow reflection telemetry

Contributor: zhenghao
Feature: ZH-LHF-01

This add-on derives reflection metrics from the unchanged canonical workflow monitor report.

## Reflection metrics

- Total tokens: 55524880
- Input tokens: 55361831
- Cached input tokens: 54860800
- Cache-miss input tokens: 501031
- Cache hit ratio: 99.09%
- Cache miss ratio: 0.91%
- Reasoning output tokens: 72804
- Reasoning as share of output: 44.65%
- Reasoning as share of total: 0.13%
- Observed responses: 352

## Task usage

| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |
| --- | ---: | ---: | ---: | ---: | ---: |
| implementation | 28843177 | 51.95% | 98.86% | 1.14% | 0.15% |
| verification | 26681703 | 48.05% | 99.35% | 0.65% | 0.11% |

Highest-token task: implementation (28843177 tokens)

## Interpretation limits

- cached input is included in input and reasoning output is included in output and total
- cache reuse alone does not prove a reduction in raw token usage
- before/after reduction claims require comparable quality-qualified task runs
- missing measurements remain unavailable
