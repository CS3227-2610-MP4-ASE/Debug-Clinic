# ZH-LWS-02 — Browser Python IDE and public Home navigation

Date: 6 November 2026. Branch: `zh/learner-workspace`.
Base: `12114957bcb0521f9f94793df1e32ce6a48e51bd`.

## Authority and boundaries

The user requests fixing Home navigation, an actual Python IDE that runs/tests
code, and a better distributed LeetCode-inspired description pane. Their
structured answer selects browser execution with learner-written tests, without
a hosted execution service. This updates the earlier unavailable-Run/no-editor-
library scope. The prior green pass and current implementation request authorize
necessary code/tests/local commits/docs; existing branch/push authorization
continues. No new branch, PR, remote comments, deployment or server execution.
No new approval loop is inferred for ordinary implementation/repair. Independent
functional/standards/security review must pass before push. No pre-implementation
independent sandbox review is claimed: coordinator prototype/threat review below
is planning evidence; the same testing stage supplies independent verification.

Developer 2 SDD remains excluded. Preserve instructor publication/auth APIs,
attempt version/revision/immutable-final semantics, PR10 recovery and existing
user work. No schema migration, hidden tests, instructor test publishing,
automated grading, LLM calls or third-party package installation at runtime.

## Requirements and acceptance

| ID     | Observable result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| IDE-01 | Explicit Home in signed-in desktop/mobile navigation opens public `/` without signing out. Brand link also opens `/`. Unsaved-work cancel/confirm still governs leaving editors. Home remains public and does not redirect authenticated visitors to a workspace.                                                                                                                                                                                                                                                                                                                                            |
| IDE-02 | A real CodeMirror 6 Python editor supplies line numbers, syntax highlighting, indentation, bracket matching, undo/redo and keyboard operation. Python 3 only. New unsaved attempts start with the question's buggy code; saved drafts/finals remain authoritative and are never overwritten by starter initialization. Source limit remains 20,000 UTF-16 units.                                                                                                                                                                                                                                             |
| IDE-03 | Run executes actual local Pyodide CPython. Test executes code followed by explicitly labelled learner-written Python assertions/test code. Optional standard input supports `input()`. Show actual stdout/stderr/errors, loading/running/completed/error/stopped/timeout states; never fabricate execution or official grading. Test requires nonblank test code. Scratch tests/input are temporary and not included in saved/final attempts; say so clearly.                                                                                                                                                |
| IDE-04 | User code runs only in a fresh opaque-origin sandboxed iframe's dedicated worker. No application storage/session/API/external network access, parent DOM access, navigation, popups or host filesystem. Trusted assets are preloaded by the parent from fixed local URLs with omitted credentials. Stop and five-second execution timeout terminate the worker/frame; initialization has a separate bounded timeout. Bound code/tests/input/output and validate bridge sources, IDs, message shape and sizes. Fail closed on bootstrap/worker errors. No same-origin-worker fallback.                        |
| IDE-05 | Description is a white bounded reading pane: Description header, title/topic, clearly spaced problem/starting-code/expected-behavior sections, readable line measure, independent scrolling. Use actual published content; do not invent difficulty, companies, examples, Editorial/Solutions tabs or statistics. Keep the established light theme. Right pane has compact Python toolbar, proper editor, temporary test/input area, reasoning, save/final controls and resizable output. Actions stay reachable at desktop minimum height/short viewports; stack at 320px without horizontal page overflow. |
| IDE-06 | Preserve unsaved edits, explicit save/submit confirmation, current-revision recovery, immutable finals, account/session disposal and instructor behavior. Stop/dispose pending execution on navigation/account change/expiry. Results identify the executed snapshot and mark later edits as stale, or stop/clear old execution on edit. Runner results never change submitted/graded state.                                                                                                                                                                                                                 |
| IDE-07 | Real browser tests cover working functions/assertions, failures, stdin, Stop/timeout then successful rerun, output bounds, storage/network/parent isolation, no credentialled worker requests, spoofed/stale bridge messages, built assets, unavailable assets and no-URL normal browser collection. Update old editor assertions only to use the new visible contenteditable interface; retain the original expected behavior and document adaptations. No live provider or database execution is required for Python.                                                                                      |

## Runtime design and planning evidence

Pinned package metadata: `pyodide@314.0.7` includes loader, Emscripten module,
Wasm, standard-library zip and lockfile; the real browser probe reports CPython
3.14.2. CodeMirror 6 supplies only editing; Pyodide supplies actual execution.
Resolve/pin compatible editor packages from the registry rather than inventing
versions. Keep large runtime assets out of the initial application bundle.

Build a standalone trusted worker bundle from the pinned loader and its
`pyodide.asm.mjs`, with explicit `createPyodideModule` factory configuration.
The documented factory hook is experimental: pin the runtime and require real
execution/isolation regression checks on upgrades. Do not patch vendor source.
The standalone classic bundle avoids ESM blob imports from an opaque origin.
Define its unused `import.meta.url` fallback explicitly; browser execution must
never enter Node-only branches. Keep expected vendor warnings documented.

Parent lazily fetches only generated fixed local runtime files (credentials
omitted), checks HTTP responses/sizes and caches trusted bytes, not execution
state. A hidden `sandbox="allow-scripts"` iframe has no `allow-same-origin`.
Its own CSP denies default resources and network, allowing blob workers, blob
fetches and the JS/Wasm compilation needed only inside this opaque runtime.
Do not loosen the application's CSP or add broad HTTP origins to the sandbox.
The iframe creates the worker from trusted bundled source. The worker supplies
the fixed virtual bootstrap Wasm URL from a memory-backed Response; unknown
fetches reach the native fetch and are blocked by CSP. This fetch mapping is
asset delivery, not the security boundary. Standard library is a worker-owned
blob; lockfile contents are passed explicitly. All program state/files are
ephemeral. Destroy the full worker/frame tree at completion, Stop and timeout.

Coordinator's isolated Chromium probe executed Python (version, sum and output),
reported opaque worker/message origins, rejected IndexedDB with SecurityError,
and blocked an actual application API fetch; the owned HTTP server received zero
API requests. Earlier bootstrap probes failed on opaque ESM/module loading and
loader-initiated Wasm fetches; no weaker origin/network fallback was adopted.
Raw probes/vendor package remain outside Git. These observations do not replace
independent testing or establish a hard browser process/memory quota. Browser
resource exhaustion remains a client-device limit, not a multi-tenant server
execution guarantee. Do not describe scratch tests as a secure hidden judge.

Sources: https://pyodide.org/en/stable/usage/webworker.html and
https://pyodide.org/en/stable/usage/api/js-api.html ;
https://codemirror.net/examples/ ;
https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers .

## Stage ownership, routing and verification

Reuse the existing coordinator, Luna-medium implementation, Sol-high testing and
Luna-medium documentation conversations. No new working conversations. Initial
soft token estimates: planning 1.5m, implementation 2m, testing 1.5m,
documentation 0.5m. Collect separately bounded session telemetry for this feature;
raw telemetry stays outside Git. Record overruns and interventions; no budget
increase or unsupported savings claim. Keep testing Sol high.

Builder owns frontend components/page/shell/runner modules and focused tests;
package/lock changes; minimal Vite/build scripts for generated local runtime
assets; exact generated-path ignore entries; a feature surface brief under the
existing design system. Avoid backend/Prisma/instructor changes. New generated
vendor binaries are build artifacts, not committed source. Preserve licenses.
Tester owns independent acceptance cases, necessary rendering-query adaptations
in prior learner browser tests, and separate functional/standards/security
verdicts. Preserve existing outcomes and document every necessary adaptation.
Coordinator owns the plan, telemetry, integration and push. Documentation owns
DG/UG/feature map/PRODUCT capability correction and only relevant incremental
`docs/Reflection-ZhengHao.md` content using `docs/reflection-requirement.md`.

Run Node 24 focused checks, normal desktop/mobile Playwright without explicit
DB variables, applicable real-cookie integration regressions on an owned test
database, lint/typecheck/build and built frontend execution/isolation tests.
Browser Python tests must use real locally served pinned runtime assets and no
external network; doubles alone cannot establish working execution or isolation.
Use one batched desktop/mobile design inspection and at most one repair/confirm
round; meaningful functional repairs retain repository retry limits. Run the
Impeccable mechanical scan and report its limits; it is not functional proof.
