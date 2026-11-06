#!/usr/bin/env python3
"""Generate Zhenghao-only reflection telemetry from canonical monitor state."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import workflow_monitor as monitor


CONTRIBUTOR = "zhenghao"
VERSION = 1


def ratio(numerator, denominator):
    return numerator / denominator if numerator is not None and denominator is not None and denominator > 0 else None


def reflection_metrics(metrics, overall_total=None):
    tokens = metrics["tokens"]
    input_tokens = tokens["input"]
    cached_tokens = tokens["cached_input"]
    cache_miss_tokens = (input_tokens - cached_tokens
                         if input_tokens is not None and cached_tokens is not None and cached_tokens <= input_tokens
                         else None)
    return {
        "tokens": tokens,
        "cache_hit_ratio": metrics["cache_hit_ratio"],
        "cache_miss_tokens": cache_miss_tokens,
        "cache_miss_ratio": ratio(cache_miss_tokens, input_tokens),
        "reasoning_output_ratio": metrics["reasoning_output_ratio"],
        "reasoning_total_ratio": metrics["reasoning_total_ratio"],
        "total_token_ratio": ratio(tokens["total"], overall_total),
    }


def reflection_report(canonical):
    overall_total = canonical["overall"]["tokens"]["total"]
    tasks = {task_id: reflection_metrics(metrics, overall_total)
             for task_id, metrics in canonical["tasks"].items()}
    known_tasks = [(metrics["tokens"]["total"], task_id)
                   for task_id, metrics in tasks.items() if metrics["tokens"]["total"] is not None]
    highest = max(known_tasks) if known_tasks else None
    return {
        "schema_version": VERSION,
        "contributor": CONTRIBUTOR,
        "feature": canonical["feature"],
        "generated_at": canonical["generated_at"],
        "measurement_policy": "derived from canonical workflow_monitor response_usage_v1 totals",
        "overall": {
            **reflection_metrics(canonical["overall"]),
            "observed_responses": canonical["overall"]["observed_responses"],
            "wall_seconds": canonical["overall"]["wall_seconds"],
        },
        "tasks": tasks,
        "highest_token_task": ({"id": highest[1], "total_tokens": highest[0],
                                "total_token_ratio": tasks[highest[1]]["total_token_ratio"]}
                               if highest else None),
        "diagnostics": canonical["diagnostics"],
        "limitations": [
            "cached input is included in input and reasoning output is included in output and total",
            "cache reuse alone does not prove a reduction in raw token usage",
            "before/after reduction claims require comparable quality-qualified task runs",
            "missing measurements remain unavailable",
        ],
    }


def markdown(report):
    def display(value):
        return "unavailable" if value is None else str(round(value, 3) if isinstance(value, float) else value)

    def percentage(value):
        return "unavailable" if value is None else f"{value * 100:.2f}%"

    overall = report["overall"]
    lines = [
        "# Zhenghao workflow reflection telemetry",
        "",
        "Contributor: zhenghao",
        "Feature: " + report["feature"],
        "",
        "This add-on derives reflection metrics from the unchanged canonical workflow monitor report.",
        "",
        "## Reflection metrics",
        "",
        "- Total tokens: " + display(overall["tokens"]["total"]),
        "- Input tokens: " + display(overall["tokens"]["input"]),
        "- Cached input tokens: " + display(overall["tokens"]["cached_input"]),
        "- Cache-miss input tokens: " + display(overall["cache_miss_tokens"]),
        "- Cache hit ratio: " + percentage(overall["cache_hit_ratio"]),
        "- Cache miss ratio: " + percentage(overall["cache_miss_ratio"]),
        "- Reasoning output tokens: " + display(overall["tokens"]["reasoning_output"]),
        "- Reasoning as share of output: " + percentage(overall["reasoning_output_ratio"]),
        "- Reasoning as share of total: " + percentage(overall["reasoning_total_ratio"]),
        "- Observed responses: " + display(overall["observed_responses"]),
        "",
        "## Task usage",
        "",
        "| Task | Total tokens | Share of total | Cache hit | Cache miss | Reasoning / total |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for task_id, task in report["tasks"].items():
        lines.append("| " + " | ".join([
            task_id,
            display(task["tokens"]["total"]),
            percentage(task["total_token_ratio"]),
            percentage(task["cache_hit_ratio"]),
            percentage(task["cache_miss_ratio"]),
            percentage(task["reasoning_total_ratio"]),
        ]) + " |")
    highest = report["highest_token_task"]
    lines += [
        "",
        "Highest-token task: " + (f"{highest['id']} ({highest['total_tokens']} tokens)" if highest else "unavailable"),
        "",
        "## Interpretation limits",
        "",
    ]
    lines.extend("- " + limitation for limitation in report["limitations"])
    return "\n".join(lines) + "\n"


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--state-dir", type=Path, required=True)
    result.add_argument("--output-dir", type=Path, required=True)
    result.add_argument("--as-of")
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        with monitor.exclusive_state(args.state_dir.resolve()):
            _, manifest, state = monitor.load_state(args.state_dir)
            canonical = monitor.report(manifest, state, args.as_of)
        reflection = reflection_report(canonical)
        monitor.write_json(args.output_dir / "report.json", canonical)
        (args.output_dir / "report.md").write_text(monitor.markdown(canonical), encoding="utf-8")
        monitor.write_json(args.output_dir / "reflection.json", reflection)
        (args.output_dir / "reflection.md").write_text(markdown(reflection), encoding="utf-8")
        print(json.dumps({"status": "reported", "contributor": CONTRIBUTOR,
                          "budget_warnings": canonical["budget_warnings"]}))
        return 0
    except (monitor.Invalid, OSError, KeyError, TypeError) as exc:
        message = str(exc) if isinstance(exc, monitor.Invalid) else "invalid or inaccessible monitor state"
        print(json.dumps({"status": "error", "message": message}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
