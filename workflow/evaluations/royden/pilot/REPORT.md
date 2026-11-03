# Four-run workflow pilot â€” 3 November 2026

All four conditions ran in isolated synthetic Git worktrees with fresh agent
contexts. Actual model and effort were `gpt-6.1-sol`, `high`, for every participant
and the reviewer, as recorded by the collector. Node was `v24.14.0`; Python was
`3.14.3`. No experimental implementation entered the application.

The frozen protocol was committed at `f0f7377` before dispatch; later protocol
formatting did not change its rules. Fixture content hashes and baselines are in
`freeze.json`. Original participant bytes are archived under `artifacts/`, with
`artifacts.sha256.json` and Git newline preservation. The judge received anonymous
copies and no condition labels or resource totals until scores were fixed.

## Outcomes

| Condition                            | Blind sample | Score | Qualifies | Participant span, seconds | Sum of agent spans, seconds | Total tokens | Uncached input | Output |
| ------------------------------------ | ------------ | ----: | --------- | ------------------------: | --------------------------: | -----------: | -------------: | -----: |
| Single-builder delivery              | sample-17    | 10/10 | yes       |                   150.156 |                     150.156 |      399,648 |         22,031 |  4,753 |
| Parallel code + acceptance delivery  | sample-42    |  9/10 | yes       |                   237.763 |                     334.592 |      584,564 |         26,541 | 11,847 |
| Ordinary planning with clarification | sample-08    |  8/10 | yes       |                   625.105 |                     625.105 |      514,755 |          9,044 | 16,111 |
| Grill-me planning with clarification | sample-31    | 10/10 | yes       |                   794.440 |                     794.440 |      600,135 |          8,680 | 21,855 |

Spans use recorded dispatch/start/completion events, reconstructed from explicit
session lifecycle metadata, not silence. They include tool and local processing
time; they are not model-compute or human-active time. No dependency/owner wait
events were recorded, so those measurements remain unavailable rather than zero.
The parallel code writer started about 85 seconds after its test writer because
documentation/tooling agents occupied the other slots. Thus its span includes a
real scheduling disadvantage, not an ideal simultaneous start.

The first successful identical held-out check occurred 257.724 seconds after
single-builder dispatch and 312.146 seconds after parallel-condition dispatch.
These acceptance-ready times also include coordinator scheduling/integration
delay. They are separate from participant spans and exclude later blind judging.

Cached-input tokens were 372,864 / 546,176 / 489,600 / 569,600 in table order.
They are included in input and total, not extra tokens to add. Reported reasoning
output was 879 / 2,223 / 3,617 / 3,726, already included in output. The JSON report
contains reasoning/output and reasoning/total ratios with distinct denominators.
Uncached input is the derived difference `input - cached_input`; neither that
number nor total tokens establishes subscription billing or quota consumption.

## Delivery observations

Both candidates passed the same **12/12 held-out checks**. The single writer's
own tests passed **42/42**. Parallel implementation/unit tests passed **33/33**;
its independent author first committed interpretation `f6efbee`, then demonstrated
**109 expected failures and 1 pass** against the untouched throwing stub. No
implementation was shown to that author. Integrated tests passed **141/141**.

Actual integrated command, run in the synthetic `candidate-b-code` worktree:

```powershell
node --test --test-reporter=tap public.test.mjs unit.test.mjs acceptance.test.mjs
```

The coordinator combined test commits into a green integration checkpoint
`330cec8`; the code commits were `aa1b503`, `594887c`. Single-writer commits were
`85ebae5`, `57eab52`; test-author commits were `f6efbee`, `1c7a7a3`, `8a06cf3`.
These are commits in the synthetic fixture repositories, not product ancestry.

The parallel candidate scored one point lower for handoff evidence: its writer
handoff described the earlier 33-test command while the evaluator's final evidence
reported 141 tests without the final command. Commit metadata had intentionally
been withheld from both samples for blinding; uniform checkpoint attestations
were supplied and the judge withdrew that separate criticism. The score remained
9/10 because the final-command gap persisted. Initial and corrected judgments
are both retained. The command above completes the coordinator's final record
without retroactively changing the scored artifact.

For this tiny pure-policy task, extra writers increased total tokens about 46%
and participant span about 58%, with no held-out correctness gain. More tests
did not automatically improve the outcome. This supports keeping one builder for
small coupled work; it does not settle the value of parallel work on larger tasks.

## Planning observations

Both planners received the same initial brief and owner-answer interface, could
ask normal questions, and covered all 15 oracle topics. Ordinary planning made
15 topic lookups. Grill-me made 18 lookups in seven recorded frontier rounds,
including repeated recovery clarification. There was no real human waiting time.
PRD/TDD/RTT artifacts are experimental drafts; their tests are planned, not executed.

The blind reviewer found a substantive concurrency gap in ordinary planning:
revision and active-request checks could admit a delayed second key as stage 2
after a fast stage-1 completion. The grill-me plan additionally fenced expected
progress, rejecting that stale action. See the original planning review for the
precise reasoning. Both plans honestly retain retention/deletion and live-provider
acceptance gates. The plans themselves were not implemented, so this is a design
review finding, not a demonstrated production defect or executable regression.
Meeting the study's numeric qualification threshold does not approve a product
plan: this substantive finding would need resolution under the real feature gate.

Grill-me used about 17% more total tokens and 27% more participant time here,
with a higher design score. Its uncached input was slightly lower, but output
was higher. A better cache ratio alone would miss this resource tradeoff.

## Overhead, deviations, and policy

The snapshot cutoff is **16:46:33 Singapore time**. Coordinator/documentation/tool
setup recorded 17,080,488 tokens, independent review 732,089, and evaluation
715,552. These are separately attributed and are not charged to a participant
condition. Setup includes implementing this reusable workflow and instrument,
not just operating the study. The coordinator was still working at cutoff:
subsequent documentation, checks, commits and final reply are excluded.

The collector measured 4 invocations, about 0.045 seconds inside collection
and 8,182,515 bytes read, including inspection bytes. This excludes CLI startup,
event/report calls, and analyst model effort; it is not total monitoring overhead.
The 40,000-token estimates were exceeded by all conditions because host context
was repeatedly supplied, mostly cached. Future estimates must use comparable
host/task observations, and show cached, uncached and output components together.

Important limitations:

- One observation per condition, different tasks for the two comparisons, fixed
  order and uncontrolled cache warmth; no statistical or interaction claims.
- A listable owner-topic index scaffolds both planners and can reduce the apparent
  advantage of grilling compared with an ordinary human conversation.
- Participants were bounded by instructions, not OS-enforced read isolation.
- Anonymisation removes method labels but style/test volume can reveal clues.
- The evaluator inspected tests/plans statically and relied on supplied runtime
  evidence. It did not rerun tests or execute either plan.
- Actual reporter/model schemas were verified locally; legacy cumulative-only
  logs, aggregate tool totals and exact response-to-slice attribution remain gaps.
- No application, live AI, CI, deployment, pricing, team workload or MP1 comparison
  was evaluated.

Adopt adaptive routing: one builder for small coupled changes; parallel writers
when independent acceptance work and stable interfaces justify the overhead.
Use grill-me when unresolved state, concurrency or failure decisions warrant it;
retain normal clarification for ordinary work. Require the coordinator's final
handoff to include the exact integrated command, not only writer-local evidence.

## Reproduction

```powershell
python workflow/pilot/prepare.py --root ../.workflow-runs/replay-pilot
python workflow/pilot/check.py --root ../.workflow-runs/replay-pilot --self-test
```

Choose a new root: preparation refuses to overwrite existing fixtures. The grader
self-test observed a passing reference (12/12) and a failing throwing stub (0/12).
Participant reruns require fresh agents with the same task/condition instructions;
prepared stubs alone do not reproduce their outputs. Original scored snapshots,
blind judgments, hashes and derived telemetry are retained alongside this report.
