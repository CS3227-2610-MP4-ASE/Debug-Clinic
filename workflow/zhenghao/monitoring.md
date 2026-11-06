# Zhenghao workflow reflection reporting

This is a contributor-specific add-on to the canonical
[`workflow_monitor.py`](../../scripts/workflow_monitor.py). It does not change
the canonical manifest schema, report format, templates, Royden paths, or
Royden's future workflow.

Initialize, collect, validate, and record events with the canonical commands in
[`workflow/monitoring.md`](../monitoring.md). Keep the raw manifest and state
outside Git. Use a separate explicitly mapped session for each task category so
the report can attribute usage accurately.

At a Zhenghao checkpoint, generate both the unchanged canonical report and the
additional reflection report:

```bash
python3 scripts/zhenghao_workflow_report.py \
  --state-dir ../.workflow-runs/<feature>/state \
  --output-dir workflow/evaluations/zhenghao/<feature>/monitoring
```

The command writes:

- `report.json` and `report.md`: unchanged canonical monitor outputs.
- `reflection.json` and `reflection.md`: Zhenghao-attributed cache miss, reasoning
  share, per-task token share, and highest-token-task summaries.

Cache reuse alone does not prove that raw token usage fell. Support reduction
claims with comparable baseline and later tasks that meet the same quality
criteria. Cached input is already included in input, and reasoning output is
already included in output and total; never add those subsets again.
