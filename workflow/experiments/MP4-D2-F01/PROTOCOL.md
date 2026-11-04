# Generate-question: paired implementation experiment

Prepared 5 November 2026, Asia/Singapore. Status: **preparation only; neither
implementation has started or been authorized by this file**. Sending a run's
start prompt in a new conversation supplies that run's local implementation
authorization. Approved product scope remains `agent-eval-reviewed-v1`.

## Common starting point

Application/SDD baseline: `7fe5113e1c0743e648091f46b0661c39d4af1061`.
Approved SDD snapshot: `597ecf887319e942ad46171bae7349404fbd1d36`.
The preparation commit adds only experiment instructions/instrumentation. Both
arm branches must start at that identical preparation commit. The external
registry `../.workflow-runs/MP4-D2-F01-comparison/registry.json` records its exact
SHA, package hashes, worktrees, environment and readiness. `experiment.py verify`
checks the common committed source and immutable SDD in both worktrees. Do not
start from the other run's result, update dependencies, or inherit its chat.

Use separate new conversations: multi first, single second. The single agent may
read its worktree, shared frozen instructions and its own private state only.
The branches share Git object storage: isolation is instructional, not an OS
security boundary. Avoid sibling reads, `git log --all`, cross-branch diffs,
shared conversation summaries and the other run's test/review outputs.

## Conditions

| Phase                     | Multi                                                                                 | Single                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Candidate construction    | Coordinator + one code/unit-test implementer + one independent acceptance-test author | Main conversation performs code, unit/acceptance tests, documentation and commits without subagents |
| Context                   | Fresh scoped writer packets, same source index and retrieval rules                    | Fresh conversation, same source index and retrieval rules                                           |
| Independent review        | Same functional/standards and security requirements                                   | Same functional/standards and security requirements after candidate freeze                          |
| Output-quality acceptance | Same separately authorized common protocol after both candidates freeze               | Same separately authorized common protocol after both candidates freeze                             |

Multi has at most three active build agents including coordinator. Writers use
distinct worktrees and explicit file ownership from the approved interfaces.
The acceptance writer freezes interpretation before seeing implementation.
The implementer retains unit-test responsibility. Coordinator integrates green
slices and owns integration evidence and guides/logs. Extra guide/logger/builder
agents are excluded from this condition; document a deviation if indispensable.
Generic agents receive role instructions explicitly; TOML identity is not assumed.

Single overrides adaptive builder delegation for this experiment only. After
candidate freeze, it may obtain the same read-only independent reviews, and it
repairs its own findings. Reviewer agents are evaluation, not hidden builders.
Record any reviewer-written code as a protocol deviation.

The first run records actual development model, reasoning effort and tool access
in the common private `model-profile.json` at start. The single run must match
before coding. Every child records resolved settings; mismatches are deviations.
Use Node 24.14.0/npm 11.9.0/Python 3.14.3 prepared here; report any version drift.
Provisional matched soft estimates: two hours and 5,000,000 observed response
tokens per candidate condition, including cached input and all its builders.
These estimates are warnings, not quality waivers or a per-agent multiplier.

## Environment and timing

Run `experiment.py exec --arm multi -- npm ...` (or `single`) to use the pinned
runtime, fake provider and arm-specific loopback database. Dependencies, generated
baseline client/contracts, Chromium and baseline migrations/seed are prepared
before either start. Read `ENVIRONMENT.md` and the private readiness record.
If a dependency remains unavailable, resolve it for both or report the missing
layer; never claim equal readiness or a pass from unperformed checks.

Arm databases use separate owned containers and the same PostgreSQL image digest
and committed migration/seed. Baseline seed upserts generate different random
IDs/timestamps: compare logical roles/content/counts, not byte-identical DB dumps.
They contain only synthetic data and no reusable real-provider credentials.
Reset only the arm's owned database before its measured run; preserve the other
arm. Infrastructure preparation and warm-up are outside candidate timings.
New writer-worktree setup/install after a multi run starts is measured coordination
overhead. Both arms use existing fixed browser ports serially; check listeners,
leave unrelated processes intact and clean up owned servers before the next run.

Record these boundaries with exact UTC timestamps and Singapore presentation:

1. `start`: after setup/identity checks, **before** implementation SDD/code reads,
   architecture analysis or dispatch. Initial automatic host context is unavoidable
   and must be acknowledged. Setup verification is excluded and separately logged.
2. `candidate`: committed coherent implementation plus required deterministic
   static/unit/API/DB/browser/packaging checks, or an honestly blocked candidate.
3. `reviewed`: identical independent reviews, in-scope repairs, final checks and
   exact integration command/result recorded. This is local reviewed readiness.
4. `final_acceptance`: common live semantic/human/CI obligations when separately
   authorized and actually performed. Until then label them pending, not complete.

Report first-green time, start-to-candidate, start-to-reviewed and their component
waits/rework separately. Sum agent spans separately from wall time. No-output time
is not idle evidence. Record owner/dependency waits explicitly. A blocked run stays
in results; do not compare a partial candidate with a fully reviewed delivery.

## Context receipt and retrieval journal

Use `experiment.py read` for explicit project-file reads. It renders the requested
content and records only relative path, content SHA-256, byte/line range, kind,
reason, actor and timestamp outside Git. File-name discovery may use `rg --files`;
after content searches record query purpose/results as a retrieval note. Tool
outputs and host-injected context not routed through the reader remain gaps.

Before dispatch, store a scoped task packet file, read/journal it as `upfront`,
and pass those exact bytes to the child with fresh context. Log the child's actual
identity afterwards. Journal read-only handoff artifacts as `handoff`. Use
`note` for context omissions, clarification requests/answers, repeated reads,
compaction/recovery and justified unnecessary-context observations. Notes accept
safe IDs/relative references only: keep substantive decisions in scoped evidence.

Required analysis: upfront packet bytes/hash; distinct and repeated reads of the
same file hash/range; changed-version reads; clarification counts; omitted or
ambiguous handoff fields; rework attributable to context; and qualitative waste
judgments with evidence. Repeated retrieval is a proxy, not automatically waste.
File bytes/line ranges are not token counts or exact context-window occupancy.
Do not persist private reasoning text, prompts, credentials or raw transcripts.

If the owner clarifies a material SDD decision, freeze the same new version for
both conditions and restart affected work or explicitly mark them non-comparable.
Do not transfer multi discoveries or reviewer advice only to the later single run.
The shared clarification record contains owner decisions, not code/solutions.

## Resources and evaluation

The coordinator/main agent explicitly maps its own and child sessions to the
existing `scripts/workflow_monitor.py`; collection starts at this run's `start`,
not the original planning session. Use actual metadata, never fabricated IDs.
Collect unique per-response usage, not cumulative snapshots or inherited parent
totals. Include multi coordinator + both writers; single includes its complete
main conversation. Keep review/repair, sampling, infrastructure and monitoring
overhead separately identifiable. Record input, cached input, derived uncached
input, output and reasoning-output subset; label unavailable fields null.

Development tokens and application provider usage are separate datasets.
Total tokens are not unique context or subscription billing. Preserve cache
metrics and fixed multi-then-single order: dependency warmth, model cache warmth,
load and owner learning are not fully controlled. Do not flush shared caches.

Freeze acceptance expectations now from all 13 PRD IDs and 28 RTT behavior groups;
`acceptance-index.json` is the common source index, not executed test evidence.
Each candidate's own tests may differ. Judge both against the same requirements
and independent checks, not test counts. Count failures, regressions, review
severity, repair rounds, scope adherence and exact handoff/integration evidence.
Use identical 0–2 dimensions: correctness, failure/security, test validity,
interface/standards, handoff evidence. Numeric qualification >=8/10 with no zero
in correctness/security does not waive substantive release blockers.

The approved AI-quality rubric/prompt, two held-label calibration fixtures and
fixed 11-sample topic batch are common to both candidates. Live sampling is
deferred until both are frozen and separately authorized; do not call the real
provider during deterministic build measurement. Preserve every captured
outcome and FAIL/INCONCLUSIVE result. Fresh independent evaluators receive the
same rubric and anonymous outputs without method labels/resource totals. Freeze
scores before revealing resources. Human accessibility and CI obligations retain
their actual pending/observed status. Do not weaken or rewrite approved SDD.

Runtime HTTP/database latency is a separate optional measurement against matched
inputs/environment. Live generator variability is not development speed. No new
load-test service, app judge or benchmark product infrastructure is authorized.

This is one paired case study, not statistical significance or an isolated causal
test of context engineering. The journal explains plausible mechanisms; a later
within-topology context ablation would be a different experiment. The small pilot
under `workflow/evaluations/royden/pilot/` is historical evidence, not this result.

## End-of-run handoff

Commit meaningful verified slices automatically; expected-red writer commits
stay labelled until green integration. Use three verification repairs per failure
and two targeted review rounds. Escalate changed scope/shared contracts and failed
bounded recovery. Record commits, setup deviations, model/profile checks, context
receipts, timings/token observations, raw private state root and sanitized evidence
paths. Keep per-run results inside its worktree/private directory; do not update
the other arm or a shared live results document. Freeze each candidate commit
before common blind evaluation. Push/PR/merge/deploy require separate authority.
