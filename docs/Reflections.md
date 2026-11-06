# MP4 development reflections

## 6 November 2026 — F02 publication delivery

The approved package gave two builders stable contracts and disjoint backend/UI
ownership. Contract exports landed first, then coherent implementation and test
commits integrated locally. No blind independent acceptance author was assigned;
the builders wrote tests and fresh reviewers independently checked functionality,
standards and security. This run does not compare topologies or establish that
parallel builders reduced cost or elapsed time.

Independent review found defects after green checks: failed sign-out could clear
discard registration while leaving an editor mounted, and pino-http automatically
serialized internal stacks despite safe application error logging. The schema
review also removed duplicated field policy. These findings support testing
recovery after a failed recovery action and checking the complete logging path,
including middleware, rather than only explicit logger calls.

Actual PostgreSQL races, rollback triggers, unavailable replay reads and lost
COMMIT acknowledgments supplied different evidence from mocked HTTP and browser
state tests. A separate browser transport proxy drains a real committed response
before dropping it. These fault seams live in tests, preserving production module
interfaces. Old-schema/FK rehearsal is labelled structural evidence; it does not
replace public behavior assertions.

The full database run exposed two old fixture assumptions superseded by the
approved design: undated ARCHIVED rows and Save using a different generated topic.
The fixtures now construct valid archived chronology and retain the generated
topic while preserving their original privacy and UTF16 expectations. Windows
verification also needed the installed npm JS launcher rather than spawning the
Unix npm executable. Disposable containers were removed on both failure and pass.

The initial resource estimates were exceeded. Raw telemetry remains outside Git;
observed response tokens include cached input and are not billing or quota.
A host usage-limit interruption required the owner's later resume. Wall spans
include that interruption; silence is not measured active work or inferred wait.
Scoped repair packets and incremental review avoided restarting the package, but
no causal savings percentage is claimed. Final reports retain missing manual,
remote CI and unchanged live-provider evidence explicitly.

## 3 November 2026 — workflow bootstrap and four-run pilot

Evidence: [pilot results](../workflow/evaluations/royden/pilot/REPORT.md),
[independent implementation review](../workflow/evaluations/royden/implementation-review.md),
and the linked original artifacts/telemetry. These observations concern synthetic
tasks and workflow tooling; they are not product acceptance or team-workload proof.

### Multi-agent software engineering

We used a coordinator, isolated documentation/tooling writers, condition-specific
builders, an independent workflow reviewer, and a blind outcome judge. Generic
agents received scoped role instructions; no named TOML runtime selector was
claimed. Separate worktrees and explicit ownership prevented competing Git-index
writes. Incremental writer commits and verified integration checkpoints provided
recoverable handoffs without per-commit owner prompts.

The small publication guard did not benefit from parallel writers: both versions
passed 12 held-out cases, but parallel delivery consumed more tokens and time.
The test writer froze its interpretation before implementation exposure, which
preserved a useful independent perspective. Its much larger test suite did not
establish a better result. The coordinator also omitted the final integrated test
command from the initially scored evidence packet, costing a handoff point.

Concurrency slots were a real constraint: the second writer started about 85
seconds late while setup agents occupied capacity. Aggregate agent spans exceeded
wall time, as expected. We recorded explicit lifecycle spans; silence did not
become an invented idle/wait measurement. Future scheduling should reserve the
needed writer slots before starting a paired parallel condition.

Independent review was useful despite a green initial suite: it found five
accounting/reporting defects, all corrected in one targeted fix round and verified
by six new regression cases. This supports independent verification at meaningful
checkpoints. It does not justify adding a separate agent for every small action.

### Context engineering and resources

Fresh assignments supplied a task, public interfaces, owned paths and retrieval
boundaries rather than the full planning conversation. Both planning candidates
retrieved the same owner answers, and both distinguished technical proposals from
confirmed requirements. Grill-me's seven rounds exposed an expected-progress
concurrency fence missing from the ordinary plan, with more time and tokens.
That is a useful case study, not evidence that the skill always improves plans.

The common topic index was strong scaffolding: ordinary planning could retrieve
all 15 answers immediately. A later experiment could vary this index while keeping
task/owner facts fixed. That experiment has not been run.

The coordinator's long context and repeated tool turns dominated setup token
volume, even though most input was cached. The collector measured repeated input
honestly rather than treating cached tokens as free or summing cumulative totals.
Next features should start from concise ledgers and scoped assignments, batch
independent inspection, and avoid repeatedly reloading whole outputs. Our current
study did not isolate the token savings of those changes, so no savings percentage
is claimed. Stable instruction prefixes and retrieval indices are maintained, but
cache ratios must be interpreted beside total input, uncached input and output.

Reported reasoning-output counts were 879, 2,223, 3,617 and 3,726 for single,
parallel, ordinary and grill-me conditions. Ratios to output and total answer
different questions and are labelled separately in the telemetry. We retained
counts and concise decision records, not private reasoning text. Persisted
decisions help recovery; this run did not measure their causal token savings.

Every participant used the same observed model and effort to reduce experimental
variation. We have not compared cheaper models or reasoning settings. Future
selection should be based on task risk and measured qualifying outcomes rather
than presumed model cost or task labels. No API-equivalent price is presented as
subscription billing.

Python collection itself was inexpensive in the observed snapshot, but review,
evaluation, repeated setup analysis and document production were substantial.
The initial soft token estimates were unrealistic for this host. Calibrate from
comparable runs and distinguish one-time tooling investment from recurring
feature delivery before deciding whether coordination pays off.

### Application and team evidence still needed

Each future AI feature must design and test authorized context selection, prompt
versions, minimization, usage/latency accounting, limits and failures. Application
telemetry remains separate from development-agent telemetry. No app usage or
live-provider outcome is established by this pilot. Team role allocation, actual
individual contribution, team-level work and the 1.5-times-MP1 workload requirement
need project evidence beyond these agent measurements.
