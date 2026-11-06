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
