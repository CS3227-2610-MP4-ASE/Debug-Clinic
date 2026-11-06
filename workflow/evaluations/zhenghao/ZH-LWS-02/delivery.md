# ZH-LWS-02 delivery ledger

The user requests actual Python IDE execution/testing, Home-to-public-page
navigation and a LeetCode-inspired description layout, and explicitly selected
browser execution with learner-written tests. Current request plus the earlier
green pass/compact workflow authorizes the recorded implementation and local
verification; prior existing-branch push authorization continues. No new branch,
PR, remote comment, deployment or server execution. Developer 2 SDD is excluded.

Branch `zh/learner-workspace`; initial head `1211495`.
Plan: `workflow/zhenghao/specs/003-browser-python-ide.md`
SHA-256: `5629fd96a7fd81dd2f68d304e08fbdb418186a25d79fd07799937b98e6a4a006`
Exact private backup verified equal before dependent implementation.
No independent pre-implementation review is claimed. Testing must independently
verify the real execution boundary and functional/standards/security outcomes
before push. The user-selected browser scope supersedes the previous disabled
Run/editor-library restrictions only within the new recorded boundaries.

Reuse exactly the same four working conversations: coordinator, implementation
`01a1af97-daca-7080-9189-d07ba58e8cb0`, testing
`01a1afbe-797a-7352-bfd5-150343ea1e0b`, documentation
`01a1afe6-bebf-7621-ae97-0ad8b565e2d3`.
Requested routing: coordinator/testing Sol high; implementation/docs Luna medium.
Verify current turn metadata after dispatch; configured roles do not prove runtime.

Initial soft estimates: planning 1.5m, implementation 2m, testing 1.5m, docs 0.5m.
New private canonical manifest maps only the four verified session files, bounded
from the exact user request at 2026-11-06T10:49:48.870Z. It excludes earlier task
usage rather than attributing the whole historical conversation to this feature.
Raw state/prototypes stay outside Git; publish sanitized checkpoints here.

Coordinator Chromium prototype: pinned Pyodide 314.0.7 ran CPython 3.14.2 and printed
12 inside a worker with opaque origin. IndexedDB failed, an API fetch was blocked,
and the owned server observed zero API requests. Runtime bytes were supplied in
memory under an opaque iframe CSP; classic bundled bootstrap avoids unsupported
opaque-origin module fetches. This proves only the observed planning cases, not
independent acceptance or hard process/memory isolation.

Gate: coherent plan and observed prototype ready for bounded implementation.

Planning checkpoint: 7,062,926 observed cumulative response tokens exceeds the
initial 1.5m estimate. Coordinator retained the estimate and recorded the actual
prototype/bootstrap failures. Interventions: one explicit bounded plan and
working local isolation prototype, narrow approved ownership, then Luna-medium
execution with no new conversation. This is not evidence of savings. Upstream
refresh still resolves master 036cca6 and branch 1211495; master is integrated.
Implementation dispatched via send_message_to_thread at base 9742f17.

## Development support checkpoints

Implementation model/effort verified from the mapped current-turn metadata as
`gpt-6-luna` / medium. At 2,597,175 observed tokens it exceeded the initial 2m
estimate. Coordinator requested bounded reads, reuse of the concrete working
prototype and focused implementation checks; budget and acceptance were retained.

The parent supported a focused real-runner module check using an owned static
server and headless Chromium under scoped local process/socket permission.
Initial no-output initialization timeout was traced to a worker/workerSource
bridge payload mismatch. The first diagnostic wrongly inferred double escaping
from JSON-rendered logs; numeric character inspection corrected that hypothesis
before any escaping-driven source change was required. The subsequent worker
startup error was repaired by preserving Pyodide's loader-supplied instantiation
hook, mapping URL inputs consistently and supplying the Wasm response MIME type.
These are implementation development findings, not independent acceptance.

Fresh generated worker/application module then completed two real runs:
`print(sum([2,4,6]))` -> `12` and a separate function/assertion test -> completed.
Observed browser errors 0, API requests 0, opaque-origin bridge messages throughout.
The helper is private and uses no database; its owned browser/server close after
execution. The same implementation conversation continues with UI and focused
checks; independent negative/security/lifecycle verification is still required.

Additional coordinator real-module development checks passed: standard input
(first/second lines), failing scratch assertion with AssertionError, explicit
Stop during an infinite loop, and a fresh infinite loop stopping at the 5s
execution timeout. API requests 0 and browser errors 0. These six combined module
cases are distinct from actual page journeys and independent acceptance.

Implementation source f3696f8, boundary tests 1ff3eab, handoff 6890fad. Builder
reports frontend type/build, repository lint, scoped format, detector [] and 5
frontend boundary tests passing. Independent Sol-high testing dispatched through
the existing testing conversation at exact 6890fad66c348ea8010320371c32e25a2610b8f0.
Coordinator 39workflowtests pass and canonical monitor/templates/Royden output
paths are unchanged relative to 1211495. Owned loopback PostgreSQL was prepared
with all four existing migrations and seed for real-cookie persistence regressions;
allconnected commands have explicit identical test-target variables.

## Independent round0 and repair1

Independent freeze d6edfb9; expected-red tests/evidence82e0954. Functional and
standards need F1–F5 repair; resource controls need F2/F3 repair while actual
origin/storage/network/host isolation probes pass. Passing layers:531 root,9
frontend boundary/protocol,8 composed, production real execution and both
production isolation cases. Final full normal browser remains required after
repair. F5 is a static range finding; new runtime assertions were not yet run.
The generic IDE-F5 event flags that static review, not a claimed browser run.

All five findings were sent together to the same Luna-medium implementation
conversation at82e0954. Source/tests are separately owned; no assertions may be
weakened. Repair1 retains the original budget and execution boundary.

Monitoring caveat: initial receiving-task findings used run IDE-review-round0,
while retry events used IDE-repair-round1. The canonical collector groups by
task/run/retry-group, so retry_evidence_missing remains an honest historical
diagnostic. Current still-open baseline findings were explicitly linked under
the repair run after inspecting the collector; no prior event was rewritten.
Future attempt/resolution records must keep those exact grouping keys. AGENTS
guidance was corrected. Canonical monitor/schema and Royden artifacts unchanged.

Coordinator development confirmation: an intermediate focused browser run had
6 passes/6 failures while the builder's output-bridge correction overlapped it;
it is diagnostic chronology, not final verification. A separate real-module
probe then confirmed newline output worked while no-newline output was buffered.
The builder added Python stream flushing before the terminal result. A fresh
unchanged independent focused browser selection passed all 12 desktop/mobile
cases in 30.1s: Unicode/flood/no-newline output, stopped/timed-out initialization
followed by a healthy rerun, and description/expanded-controls/resize behavior.
Node24, no database or auth opt-ins, owned ports51821/51822. Source was frozen
for the rerun. Independent full verification still follows the repair commit.

## Final integration and documentation gate

Product source `2470a3b`; independent final evidence/test commit `929d0ec`.
F1–F4 passed real runtime checks after `36df16b`. A further F5 state-transition
probe reproduced stale accessible bounds when viewport growth left editor height
unchanged. Expected-red tests were frozen in `d8d7a0c`; the one-component reactive
viewport repair in `2470a3b` passed independent affected desktop/mobile 26/26
and final emitted production integration 6/6. Separate functional, standards
and security verdicts pass within the documented tested scope. Two targeted
review/repair rounds were used; no optional visual redesign followed.

Retained evidence: root/API 531, frontend 9, real production runtime/isolation 20,
built public smoke 16 and real-cookie/PostgreSQL composed 8 pass. The full normal
browser run remains 199 pass / 20 opt-in skip / 3 harness fail, followed by 4/4 corrected
cases; it is not relabelled a single green 226-case command. Final collection 226 cases / 16 files.
CI commit `1d6581c` adds frontend tests that root Vitest excludes; dependency audit
reports zero vulnerabilities. Exact commands, revisions and limits are in testing.md.

At the documentation gate, the unchanged canonical collector and Zhenghao wrapper
produced a fixed sanitized snapshot at 2026-11-06T15:03:57.901057+00:00: 150,254,265
observed total tokens, 149,700,255 input including 148,358,656 cached, 554,010 output
including 361,551 reasoning. Documentation is unavailable at that pre-dispatch
snapshot. Planning 80,699,163 includes coordinator probes, orchestration and
follow-up; implementation 39,759,007; testing 29,796,095. These totals exceed the
original soft estimates; no baseline establishes token/cost savings. Requested and
actual settings are verified: coordinator/testing gpt-6.1-sol/high, implementation
and documentation gpt-6-luna/medium. The same four conversations were reused.

The documentation conversation was dispatched only after final independent green
evidence, through send_message_to_thread. It owns guides, the feature map, relevant
PRODUCT wording, incremental Reflection-ZhengHao.md and its handoff. The old fixed
reflection checkpoint remains protected. Final rolling reports will include this
stage and coordinator follow-up; raw telemetry remains outside Git.

Final issue-resolution events close the existing task/run/check chains after
verified repairs, including the final F5 result; earlier events and the historical
retry-attribution caveat are retained. Event closures are recorded at coordinator
observation time; narrative testing evidence remains the revision-specific authority.

The exact owned PostgreSQL container and loopback mapping were reverified and
the container removed after all composed checks finished. No unrelated resource
was stopped.

The authorized existing-branch source push advanced origin from `1211495` to
`929d0ec`; latest origin/master `036cca6` was already an ancestor. GitHub CI run
[42240818024](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/actions/runs/42240818024)
passed both verify and browser jobs. The browser job reports 206 passed / 20 skipped
(3.3m), establishing a separate successful remote full 226-case run on that code
checkpoint. It does not rewrite the earlier local failing run. The final
documentation/evidence head will be pushed to the same branch and checked.

The generated Zhenghao reports are excluded from Prettier only under this
feature's monitoring directory so their generated bytes remain verbatim. Mutable
guides, evidence and source remain format-checked. The canonical monitor/schema,
Zhenghao wrapper, shared templates and Royden output paths remain unchanged
relative to the feature's base. Documentation crossed its 500k estimate; at the
first observed overrun checkpoint 3,090,443 tokens were recorded. Its budget was
retained and the same Luna-medium conversation was directed to bounded updates
and focused checks. No savings are inferred from this intervention.

Documentation commit `918e2f4` updates DG, UG, PRODUCT, the feature map and the
required incremental reflection, with a separate handoff. Coordinator reviewed
architecture/learner wording, corrected obsolete global execution claims and
verified reflection arithmetic against the fixed snapshot. The entire prior
reflection remains an exact prefix, including its earlier resource checkpoint.
Only relevant supported ZH-LWS-02 learning was appended. The coordinator fixed
a minor split-word typo in the UG after handoff. No application behavior changed.

The rolling monitoring report is a bounded pre-final-push checkpoint; subsequent
CI polling and this reply occur after that cutoff. All four mapped sessions remain
collected in private state, including coordinator follow-up. No raw transcripts
or telemetry were added to Git; unsupported legacy records remain unavailable.

Rolling report cutoff: 2026-11-06T15:23:41.198331+00:00. Observed totals are
173,776,547 tokens: 173,144,779 input (171,488,768 cached) plus 631,768 output
(406,232 reasoning). Stage totals: planning 90,845,331; implementation 39,759,007;
testing 29,796,095; documentation 13,376,114. These are usage totals, not costs or
measured reductions. All original soft budgets were exceeded without increases.
