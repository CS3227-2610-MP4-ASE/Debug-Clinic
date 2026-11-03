# Development monitoring

Use Python 3.11+ and `python scripts/workflow_monitor.py --help`. The collector
uses the standard library and reads only explicitly mapped local sessions. It
does not call a model or change Codex settings. Run state belongs outside the
Git worktree; publish only derived milestone reports.

## Start a feature

Create a private JSON manifest. Use absolute paths in the private file; replace
the placeholders below with verified values, never search all session content.
The runtime's first own `session_meta` identifies a child; corroborate its thread
and parent mapping against the actual spawn. Inherited parent metadata inside
the child file is not a second assignment. Named TOML selection is not available
in every host: record whether role instructions were passed to a general agent.

```json
{
  "schema_version": 1,
  "feature": "MP4-D2-F01",
  "repository": "C:/absolute/path/to/Debug-Clinic",
  "tasks": [{ "id": "implementation", "requirements": ["F01-01"] }],
  "agents": [
    {
      "id": "builder",
      "thread_id": "verified-thread-id",
      "task": "implementation",
      "since": "2026-11-03T08:00:00+08:00",
      "session_path": "C:/absolute/path/to/explicit-session.jsonl"
    }
  ],
  "budgets": { "elapsed_seconds": 1800, "tokens": 60000 }
}
```

These numbers illustrate soft estimates, not calibrated feature budgets. Make
estimates in the assignment, record actuals, and revise estimates from measured
history. Never lower acceptance criteria to satisfy an estimate.

```powershell
python scripts/workflow_monitor.py init --manifest ../.workflow-runs/feature/manifest.json --state-dir ../.workflow-runs/feature/state
python scripts/workflow_monitor.py event --state-dir ../.workflow-runs/feature/state --type assignment --task implementation --agent builder --run slice-1 --token-estimate 30000 --elapsed-estimate-seconds 900
python scripts/workflow_monitor.py event --state-dir ../.workflow-runs/feature/state --type start --task implementation --agent builder --run slice-1
python scripts/workflow_monitor.py collect --state-dir ../.workflow-runs/feature/state
```

An agent is mapped to one task. For a pilot, use a task ID per condition and map
both parallel writers to the same task. Response tokens can be reported by
task/agent; an event run ID alone cannot attribute responses to slices. For
long-lived coordinator sessions, set the agent's timezone-aware `since` bound to
exclude earlier planning turns. Optional task `budgets` uses the same
`tokens`/`elapsed_seconds` keys as the feature budget. Add new explicit mappings to the private
state manifest, then validate before collecting; preserve existing assignments
and response identities.

Every operation locks its private state directory. If a crash leaves
`.monitor.lock`, verify no writer remains before removing that one lock file.
The collector never removes another process or unrelated resource.

## Record evidence and recover

At observable state changes, emit `start`, `dependency_wait`, `owner_wait`,
`completion`, or `abort`. Emit `test_result`, `review_finding`, `retry`,
`integration`, `commit`, `handoff`, and `disagreement` for actual events. Use
stable safe IDs to reference richer evidence in the feature ledger; event fields
deliberately exclude transcripts and arbitrary output text.

```powershell
python scripts/workflow_monitor.py event --state-dir ../.workflow-runs/feature/state --type test_result --task implementation --agent builder --run slice-1 --check focused-tests --requirement F01-01 --result pass
python scripts/workflow_monitor.py event --state-dir ../.workflow-runs/feature/state --type completion --task implementation --agent builder --run slice-1
python scripts/workflow_monitor.py validate --state-dir ../.workflow-runs/feature/state
python scripts/workflow_monitor.py report --state-dir ../.workflow-runs/feature/state --output-dir workflow/evaluations/royden/MP4-D2-F01
```

Collect at assignment/handoff, verification and commit boundaries. A separate
supervised collector may poll explicit files, but the initial tool is
invocation-based: it does not promise immediate interruption or autonomous
background control. Scripts detect recorded exceptions; the coordinator acts
at the next observable boundary. Scope violations require a recorded finding;
the collector is not a filesystem sandbox or a source-code scope detector.

On exceptions, inspect evidence, narrow context or work, stop redundant activity,
and reassign within the approved scope. Retain failure evidence and use the same
retry-group ID across its failure, repair and outcome. At most three repair
attempts per verification failure and two targeted review correction rounds.
An exact-limit success is resolved; an unresolved limit blocks completion. Human
attention is needed for failed recovery or a changed authority/product decision,
not for every warning or minor suggestion.

## Interpret reports

`report.json` is authoritative; `report.md` is the readable summary. Component
totals use unique per-response usage records. Cached-input and reasoning-output
counts are subsets; adding them again inflates totals. Legacy cumulative-only
schemas are explicitly unsupported in v1. Unknown records are diagnosed; missing
measurements remain unavailable. Inspect diagnostics and collection coverage
before comparing runs.

Report wall time separately from aggregate agent time. Only explicit workflow
state transitions establish activity/waits; session silence cannot establish idle
time. Command/item metrics cover verified item schemas and can be incomplete;
do not interpret them as total tool usage. No report establishes subscription
billing or exact account-quota attribution.

Keep stable shared instructions, use scoped packets and retrieve by requirement.
Measure total tokens and quality alongside cache ratios: more cached tokens can
still mean more total context. Persist concise decisions, evidence and next steps
instead of private reasoning. Record monitoring and evaluation effort separately.

## Validate changes

```powershell
python -m unittest discover -s tests/workflow -v
python workflow/pilot/check.py --root ../.workflow-runs/pilot-20261103 --self-test
```

The monitor tests include valid/invalid schemas, privacy sentinels, duplicate and
inherited events, partial writes, resumption/replacement, missing measurements,
explicit waits, concurrency, budgets, scope exceptions and bounded recovery.
The pilot self-test proves the held-out grader accepts a reference and rejects
the throwing stub. These structural checks do not establish that an agent chose
the correct task, supplied sufficient context, or followed every role boundary;
use the independent semantic rubric in the evaluation protocol for those claims.
