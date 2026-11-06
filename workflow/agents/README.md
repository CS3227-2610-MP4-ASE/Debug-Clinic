# MP4 agent workflow

This runbook governs Developer 2 feature delivery in DebugClinic. Repository
configuration and code define the available tools; the approved package defines
feature intent. Preserve the Developer 1/Developer 2 SDD access boundary in
[AGENTS.md](../../AGENTS.md), including broad searches and diff collection.

## Planning gates

Keep drafts in the contributor's `<MP4-parent>/Dev2-local-SDD/` tree and dated
recovery snapshots in the sibling `Dev2-local-SDD-backups/` tree. Mirror
eventual repository paths: `docs/mission-brief/<feature-id>-<name>.md` and
`docs/features/<feature-id>/{GrillingDecisions,PRD,TDD,RequirementsToTests}.md`.
Grilling decisions are optional; the other package artifacts are required.

| Gate             | Required completion evidence                                                                                                | Next authorized work       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Scope            | Human approves exact Mission Brief scope; reference/date recorded                                                           | Draft PRD                  |
| Requirements     | Human approves complete PRD with stable requirement IDs; product decisions resolved and approval reference recorded         | Draft TDD and RTT          |
| Design and tests | TDD defines interfaces/ownership/failures; RTT maps every acceptance criterion to a test or named manual observation        | Independent package review |
| Package review   | Independent spec reviewer checks complete package, contradictions, coverage, privacy, contracts; blocking findings resolved | Human package decision     |
| Package approval | Human approval reference binds exact bytes; ledger has SHA-256 per artifact and verified external backup                    | Commit approved snapshot   |
| Implementation   | Separate human authorization identifies package/version and scope                                                           | Implement assigned scope   |

Use fresh scoped tasks for Mission Brief, PRD, TDD, and RTT; each writer receives
its preceding artifacts and owns only its assigned local draft. Resolve draft
relative links against the assigned worktree's eventual repository location.
Read complete artifacts rather than relying on status headers or summaries.
Missing approval provenance or contradictions stop dependent work at the earliest
failed gate. Independent read-only investigation can continue.

After human package approval, copy exact bytes into the feature worktree and
verify SHA-256 against the ledger and dated external backup. Inspect links,
secrets, status labels, staged paths, and diff; commit the SDD snapshot separately
before dependent implementation. Repository snapshots are the implementation
source of truth; external drafts/backups provide recovery. Material scope,
requirement, interface, or acceptance changes reopen affected review/approval and
hash records. Routine implementation choices inside the approved design do not.

## Branches, ownership, and autonomy

Use the existing `master` branch model. Inspect worktrees, status, branch, and
exact parent SHA before creating a feature branch/worktree. Fetch for visibility;
use a reviewed `origin/master` commit or an explicitly selected committed parent
feature checkpoint. Record a stacked child's parent and eventual PR target.
Integrate parent updates only at a clean checkpoint and rerun affected checks.
Preserve uncommitted work and existing history; resolve conflicts deliberately.

The implementation authorization includes code/test changes, relevant docs,
focused and required verification, routine recovery, and meaningful local
commits inside assigned scope. Continue without asking for each commit, minor
suggestion, or ordinary repair. Escalate changed requirements, shared-interface
or ownership authorization, exhausted retry bounds, missing essential access,
and decisions outside that scope. A shared-file request states exact file,
current/proposed contract, reason, owner, compatibility impact, and required tests.
Record approval, rejection, or no-change response before dependent edits.
Push, PR publication, merge, deployment, and live infrastructure mutations retain
their separate owner authorization. Do not create a `dev-staging` dependency.

## Dispatch and integration

The coordinator owns gates, assignments, dependency tracking, integration,
evidence, and handoff. Use [assignment packets](../templates/assignment.md) with
fresh scoped role context instead of inherited conversation history. Give only
the necessary approved artifacts, raw evidence, and allowed paths. Named role
TOMLs in [`.codex/agents`](../../.codex/agents/) are instruction sources, not
runtime selectors or sandboxes. If the runtime has no role selector, pass the
role instructions to a generic agent. Record the actual mechanism and identity;
do not claim named-role execution or install `config.toml` settings speculatively.
Use available defaults; role files do not pin models.

Choose the smallest useful topology:

- Small/coupled work: one implementer writes code and meaningful unit tests;
  independent review follows.
- Stable interfaces: implementer and acceptance-test author use distinct
  worktrees/branches with disjoint write paths from the same recorded base.
  Before either sees an implementation diff, the acceptance-test author records
  and freezes its requirement interpretation, observable cases, fixtures,
  contracts, and expected failures in a committed test-plan artifact. Record that
  SHA/time in the ledger. The implementer still writes unit tests. Resolve a
  requirement disagreement through the coordinator/owner, not by matching tests
  to code. Changes to the frozen interpretation require a visible rationale and,
  when requirements change, renewed approval.

Acceptance-test author commits may be expected-red on their isolated child
branch. Label the commit `test(<feature>): expected-red ...` and hand off the
exact expected failing cases, command/results, base SHA, and reason. They are
evidence of test readiness, not green integration. The coordinator combines
compatible implementation/test commits in an integration worktree, runs the
required checks, and promotes only green coherent slices to the feature branch.
Record integration conflicts, repairs, test results, and final commit ancestry.

Before each commit inspect status and diff, stage explicit assigned paths,
inspect `git diff --cached --name-only` and the staged diff, then run
`git diff --cached --check`. Never stage unrelated agents' changes or use
`git add -A`. Commit each meaningful verified slice and record SHA/checks rather
than waiting for the whole feature. For exact approved Markdown snapshots with
intentional hard breaks, inspect whitespace findings before any narrowly scoped
whitespace-check exception; changing approved bytes requires new hashes.

## Verification and independent review

Use [$verify-app](../../.agents/skills/verify-app/SKILL.md), the
[feature map](FEATURE_MAP.md), and [coding standards](../../docs/CodingStandards.md).
Select existing checks according to behavior and risk, including Node 24
declaration-emitting builds and Netlify adapter/package checks when affected.
Report command, runtime, environment, pass/fail, evidence path, and limitations.
Compilation, mock tests, real database integration, browser observation, manual
RTT, CI, and controlled live-provider checks are distinct evidence types.

For each verification failure, allow at most three meaningful repair attempts:
retain failure evidence, diagnose, change one cause, rerun. At the bound, hand
off the blocker and preserve the failing expectation. For independent review,
allow at most two targeted repair/review rounds; unresolved blocking findings
return to the owner. Minor suggestions inside scope can be applied autonomously;
residual risk acceptance and scope decisions belong to the owner.

The independent reviewer returns **functional** and **coding-standards** verdicts
separately. It checks requirement coverage, error paths, regressions, test
validity, SRP/DRY and concrete module boundaries. For complex changes split the
functional and standards passes into independent reviewers and preserve both
reports. Reviewers do not review their own implementation or repair it during
review. Give exact base/head, approved package/hashes, code/test scope, and raw
verification evidence. Trigger a separate security reviewer for AI,
authentication/authorization, sensitive data, persistence, shared contracts, or
comparable risk. Security verdicts do not replace the other two verdicts.

For an app AI feature, TDD/RTT must specify and later verify authorized context
selection, prompt version, data minimization, input/output handling, injection
and adversarial cases, token usage, latency, usage limits, retries/timeouts,
provider failure behavior, and controlled real-provider acceptance. Verify numeric
limits from authoritative evidence before encoding them. Track missing live or
usage evidence explicitly; the fake provider and existing schema are not proof
that future AI functionality is implemented. Keep credentials and real user data
out of test artifacts and logs.

## Roles and evidence

| Role                   | Writable scope / completion                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| coordinator            | Assigned ledger, integration artifacts; gate evidence and green integration                                                                           |
| implementer            | Assigned source/unit tests; verified coherent commits                                                                                                 |
| acceptance_test_author | Assigned acceptance tests and frozen interpretation; independent cases and test handoff                                                               |
| independent_reviewer   | Read-only; separate functional and standards reports                                                                                                  |
| security_reviewer      | Read-only; risk findings and limitations                                                                                                              |
| spec_reviewer          | Read-only; complete-package readiness for human review                                                                                                |
| developer_guide_writer | `docs/DeveloperGuide.md`; actual verified architecture                                                                                                |
| user_guide_writer      | `docs/UserGuide.md`; actual verified user behavior                                                                                                    |
| interaction_logger     | Assigned feature log under `logs/<contributor>/`; attributed factual checkpoints                                                                      |
| evaluation_analyst     | Assigned derived reports under `workflow/evaluations/<contributor>/` and assigned entries in `docs/Reflections.md`; measured analysis and blind spots |

Guide writers use verified implementation rather than planned capabilities.
The logger preserves chronology and missing-evidence labels, without inventing
conversations. The analyst follows the
[evaluation protocol](../evaluations/royden/protocol.md); it does not invent
missing durations, token costs, or named-role execution.

Follow the [monitoring guide](../monitoring.md). Discover current CLI arguments
with `python scripts/workflow_monitor.py --help` and subcommand help for
`init`, `collect`, `event`, `report`, and `validate`; do not invent signatures.
Keep live raw telemetry outside Git. Assign explicit soft duration/token budgets,
dependencies, event ownership, and escalation checkpoints in every packet.
Capture assignment/start/dependency_wait/owner_wait/completion/abort/retry,
test_result/review_finding/integration/commit events and connect evidence to IDs.
Soft budgets trigger measurement and replanning, not fabricated outcomes or
automatic approval. Report significant overruns at the next checkpoint.

Complete the [feature ledger](../templates/dev2-feature-ledger.md) and
[handoff](../templates/handoff.md), including approval hashes, commits, actual
checks, review verdicts, guides/logs, outstanding manual/CI/provider cases, and
next authorized action. Include the exact final integrated verification command
and result separately from writer-local checks. Keep the Developer 1 handoff concise and SDD-safe.
