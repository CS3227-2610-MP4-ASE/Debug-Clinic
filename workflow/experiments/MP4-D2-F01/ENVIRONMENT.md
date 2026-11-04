# Prepared environment and commands

Both new run worktrees start at the common preparation commit. The source
worktree `Debug-Clinic-generate-question` remains at its approved planning
checkpoint. No feature source/test implementation is included in preparation.

Private registry/readiness: sibling
`.workflow-runs/MP4-D2-F01-comparison/registry.json` and `readiness.json`.
These hold explicit worktree/runtime/loopback DB mappings, not live credentials.
Per-arm folders hold future context receipts, monitor state and phase markers.
There is deliberately no start marker or mapped future conversation yet.

## Before either run

Run `python workflow/experiments/MP4-D2-F01/experiment.py verify` from its arm.
Check private readiness; missing infrastructure must be resolved symmetrically
before timing. Keep dependency lock/approved SDD unchanged. No live `.env` is
copied: the execution wrapper explicitly supplies fake AI and synthetic DB/auth
configuration. It removes inherited SoC/SMTP/Google/OAuth credentials.

Preparation command (before either arm starts):

```powershell
python workflow/experiments/MP4-D2-F01/prepare_environments.py --dependencies --browser --databases
```

This prepares both arms and records private readiness; it does not begin feature
work. If Docker Desktop is unavailable, start it, then rerun only `--databases`
after dependency/browser readiness succeeded. Existing containers must carry this
experiment's ownership label. The script refuses preparation after a start marker.
Both arms must be ready before the measured start marker can be recorded.

```powershell
python workflow/experiments/MP4-D2-F01/experiment.py exec --arm multi -- node --version
python workflow/experiments/MP4-D2-F01/experiment.py exec --arm multi -- npm --version
python workflow/experiments/MP4-D2-F01/experiment.py exec --arm multi -- npm run test:workflow
```

Use `single` in the single worktree. Native Node/npm in a fresh shell currently
resolve to Node22; the wrapper always uses installed Node24 and npm11. It uses
argument arrays, not shell command concatenation. Both primary worktrees have
their own dependency/client/contracts artifacts. Writer worktrees created after
start need their own setup, which counts as coordination overhead. The
coordinator adds each owned multi writer to that arm's private `writers` array
with `worktree`, role and branch before it uses the wrapper/reader. Single has
no writer registrations. Serialize arm DB/browser integration suites; independent
unit tests may run in parallel. Do not run both arms' browser servers together.

## Record explicit context

```powershell
python workflow/experiments/MP4-D2-F01/experiment.py read --arm multi --actor coordinator --kind retrieve --reason requirements --path docs/features/MP4-D2-F01/PRD.md
python workflow/experiments/MP4-D2-F01/experiment.py read --arm multi --actor implementer --kind retrieve --reason interface --path packages/contracts/src/index.ts --first-line 1 --last-line 40
python workflow/experiments/MP4-D2-F01/experiment.py note --arm multi --actor coordinator --kind clarification-request --evidence-id C01
python workflow/experiments/MP4-D2-F01/experiment.py summary --arm multi
```

The reader emits requested text while journaling only path/hash/range/byte
metadata. If a tool truncates output, record the gap and retrieve the missing
range. To log an upfront packet, save it under this arm's scoped workflow
evidence, read it with `--kind upfront`, then pass its exact bytes to the fresh
child. Read frozen interpretation/handoff artifacts with `--kind handoff`.
Record meaningful clarification/omission/recovery events using safe evidence IDs;
put actual decision text in scoped Markdown, not raw metadata. Credential/Git/
dependency/raw-state reads and path escapes are rejected.

After preflight and actual identity/model checks, record
`experiment.py mark --arm multi --phase start` before implementation reads.
Then record `candidate`, `reviewed`, and later separately authorized
`final_acceptance`. These markers are not permissions and are never invoked
during preparation. The existing monitor separately handles token/session events.

First actual run creates `model-profile.json` in the private common directory:
`{model, effort, tools, recorded_at, source_thread_id}` using observed metadata.
Both runs also write their own `profile.json` with the same fields; the marker
checks equality of model, effort and tools against the shared lock.
Single verifies these fields before start. Bind monitor mappings to actual new
thread/session identities and each spawned child, with `since` at the recorded
start; leave unmapped entries absent. Use `workflow/monitoring.md` and current
CLI help for manifest/init/event/collect/validate/report. Never reuse the old
planning thread's wait intervals or infer task times from session silence.

## Baseline versus feature evidence

Preparation may install locked dependencies, generate the baseline client and
contracts, migrate/seed owned synthetic databases and check existing baseline
tests. Those actions are environment setup, not F01 implementation or passing
F01 behaviors. Inspect `readiness.json` for exact observed commands/results.
The 28 F01 groups stay Planned. The same two calibration fixtures and 11-sample
live batch remain pending separate common evaluation authorization.

Apply committed migrations and the idempotent baseline seed to each owned fresh
container. The helper uses `db:deploy`, not a destructive reset. Never reset a
pre-existing service or use the other arm's DB. Retain the second
arm at the frozen baseline while multi runs. Cache warmth and fixed run order
remain documented limitations; no cache-flush or significance claim is made.
