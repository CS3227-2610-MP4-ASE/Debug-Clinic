# Learner workspace reflection checkpoint

Checkpoint from the learner-workspace delivery, based on the approved scope,
implementation handoff, independent test report and the generated telemetry
snapshot. It answers only questions this feature provides evidence for.

## Coordination and context

The work used four ownership stages: planning and approval, implementation,
independent acceptance testing, then documentation. Each stage received a scoped
packet and handed off a named artifact or revision: the approved learner scope,
implementation handoff, frozen acceptance interpretation and test verdict, then
this guide/reflection handoff. The independent tester froze requirements before
reviewing implementation. Its first pass found three async-response races and a
publication-eligibility gap despite earlier green suites. One bounded repair
round fixed these; the independent functional, standards and security verdicts
then passed. This shows why green builder tests and independent adversarial tests
answer different questions. No evidence here establishes that every wait was
useful or that coordination was cheaper than a single-agent alternative.

Upfront scope, PR #9 compatibility, ownership boundaries and verification limits
helped prevent duplicate APIs and unsupported claims. Source and test details
were retrieved when needed. The repair handoff and independently maintained
acceptance report carried the relevant failure and retest evidence without
requiring raw transcripts. The measured planning stage also includes coordinator
approval, environment/integration work and wait orchestration, so it is not a
measure of pure design effort.

## PR10 learning checkpoint

Earlier explicit test database setup did not exercise collection with database
variables absent, which let a CI-only collection failure go unnoticed. The repair
puts Prisma construction inside the opt-in setup hook, validates all four
matching safe test URLs before construction, and verifies ordinary browser
collection with those URLs and auth opt-ins unset. `test.skip` alone does not
prevent module evaluation, so imports must also avoid setup side effects.

The first layout probe used Playwright locator clicks; automatic scrolling could
make a clipped action appear reachable. The independent test was strengthened to
check clipping ancestors and activate actions with real pointer input. A
temporary original-source overlay reproduced recovery and desktop reachability
failures while product-file hashes stayed unchanged. This supports the test's
ability to detect the old behavior, not remote CI or assistive-technology claims.
This checkpoint adds no token or cost comparison; the earlier fixed telemetry
snapshot remains as recorded below.

## Resource checkpoint

The fixed generated snapshot is **2026-11-06 08:09:15 UTC** (16:09 Singapore).
This documentation task is measured at 249,538 tokens (247,718 input, including
196,736 cached; 1,820 output including 403 reasoning). Its reasoning/output is
403 / 1,820 = 22.14%; reasoning/total is 403 / 249,538 = 0.1615%. The session
was requested and verified as gpt-6-luna at medium. The planning checkpoint
records the coordinator as gpt-6.1-sol at high; the independent test report
records gpt-6.1-sol/high, verified by the coordinator. The delivery ledger records
implementation as gpt-6-luna/medium, verified from its session metadata. Selecting
Luna for clear execution directions does not by itself establish lower token use
or a measured cost saving.

At this checkpoint, observed planning totals are 55,827,705 tokens (56.78% of
the measured total), implementation 33,208,747 (33.78%), testing 9,033,592
(9.19%), and documentation 249,538 (0.25%). For the named **planning** stage,
reasoning/output is 33,831 / 79,571 = 42.52%; reasoning/total is 33,831 /
55,827,705 = 0.0606%. These are distinct denominators; cached input is already
included in input, and reasoning is already included in output and total. Across
observed responses, input is 98,054,376, output 265,206, reasoning output
105,615, and total 98,319,582. The snapshot reports a 99.03% cache-hit ratio and
946,408 cache-miss tokens. Cache reuse does
not show fewer raw input tokens or prove a cost reduction. There is no comparable
quality-controlled baseline or verified persisted-reasoning setting, so neither
an efficiency gain nor an effect of such a setting can be concluded.

The planning total is substantial overhead, though it includes coordination and
integration activities by definition. Future packets can make ownership,
dependencies, checkpoints and evidence destinations explicit, then compare
quality-qualified runs before claiming a resource improvement. Snapshot
diagnostics include 491 unsupported legacy cumulative-token records and five
unknown record schemas; those records and missing stage measurements remain
unavailable rather than reconstructed. The coordinator will refresh the rolling
report after documentation is complete; this fixed checkpoint preserves the
measurements used here.

## Evidence references

- [Independent acceptance and review](../workflow/evaluations/zhenghao/ZH-LWS-01/testing.md)
- [Implementation and repair handoff](../workflow/evaluations/zhenghao/ZH-LWS-01/implementation.md)
- [Verified dispatch and delivery ledger](../workflow/evaluations/zhenghao/ZH-LWS-01/delivery.md)
- [Fixed generated monitoring checkpoint](../workflow/evaluations/zhenghao/ZH-LWS-01/monitoring/reflection-documentation-checkpoint.json)

## ZH-LWS-02 incremental checkpoint

The approved IDE-01–07 scope and explicit runner trust boundaries were useful
upfront context; implementation and test reports carried the exact repair and
verification evidence to the next stage. Independent review exposed real output,
Unicode bounds, cancelled-initialization recovery, description-pane and viewport
range defects. The final round-2 component change was isolated to viewport state
and passed the affected and production-built matrices. Keep its 26/26 and 6/6
results distinct from the earlier full normal run (199 pass, 20 skipped, three
harness failures); the 226-case collection was not a full passing run. This
staged review found defects that the initial green implementation checks missed,
but the high planning total prevents claiming that coordination was cheaper.

One test lesson was to observe the runtime and build a behavior model rather than
infer correctness from source or mocks alone: execution, output, isolation and
timeouts were exercised in the emitted browser bundle. The round-one viewport
probe found that the 180px editor minimum kept its computed maximum at 180 when
the window grew from 600px to 900px. The clamp inequality was valid; React's
same-value state bailout simply prevented a render to refresh the accessible
maximum. Modeling viewport height as state made that transition observable. The
final affected cases cover this resize, but not every possible viewport/runtime.
The CI test step also needed explicit frontend workspace coverage. Separately,
remote CI for code/test checkpoint `929d0ec` passed verification and browser jobs
(206 passed, 20 expected skips); this is not evidence for the documentation
commit. The [workflow run](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/actions/runs/42240818024)
and [independent report](../workflow/evaluations/zhenghao/ZH-LWS-02/testing.md)
keep the revision-specific boundaries explicit.

The fixed **2026-11-06 15:03:57 UTC** snapshot predates this documentation stage,
so its documentation usage is unavailable, not zero. It reports 150,254,265
tokens total: 149,700,255 input (including 148,358,656 cached), 554,010 output
(including 361,551 reasoning) and 1,341,599 cache-miss tokens. The 99.10% cache
hit ratio does not show a reduction in raw input or cost. Planning used
80,699,163 tokens (53.71%), implementation 39,759,007 (26.46%) and testing
29,796,095 (19.83%); documentation was unavailable at this checkpoint. Planning
includes coordination, debugging probes and verification follow-up, not only
initial planning. For that named stage, reasoning/output is
138,159 / 204,287 = 67.63%; reasoning/total is 138,159 / 80,699,163 = 0.1712%.
Cached input is already part of input; reasoning is already part of output and
total. The report records 1,561 unsupported legacy records and 10 unknown
schemas; their usage remains unavailable.

Dispatch records Sol/high for planning and testing and Luna/medium for
implementation and this documentation stage. Original soft estimates (1.5m,
2m, 1.5m and 0.5m tokens respectively) were retained; overruns were recorded
without budget increases. The stage mix and
cache rate do not prove a quality-adjusted saving from model selection, and no
comparable baseline or verified persisted-reasoning setting is available. These
resource notes use the fixed pre-documentation reports; the coordinator owns the
final rolling totals.

Evidence: [approved IDE scope](../workflow/zhenghao/specs/003-browser-python-ide.md),
[implementation handoff](../workflow/evaluations/zhenghao/ZH-LWS-02/implementation.md),
[final independent testing report](../workflow/evaluations/zhenghao/ZH-LWS-02/testing.md),
and the fixed [reflection metrics](../workflow/evaluations/zhenghao/ZH-LWS-02/monitoring/reflection-documentation-checkpoint.json)
and [workflow checkpoint](../workflow/evaluations/zhenghao/ZH-LWS-02/monitoring/report-documentation-checkpoint.json).
