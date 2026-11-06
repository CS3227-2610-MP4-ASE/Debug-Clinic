# ZH-LWS-02 implementation handoff

## Scope and ownership

Implemented the approved browser Python workspace on branch `zh/learner-workspace`. The implementation commit is `f3696f8a2963129104cfb061aff3c02f2533b20b`, followed by focused boundary-test commit `1ff3eabd6ef606e228157d0aa13e9cf892f5f6b3`. Both are based on `9742f17e1efb1b7eb3974eeef5cc462082d96bc1`.

This work was implemented directly in the current Codex task by the primary implementer; no implementation subagents were dispatched. Scope followed the approved `workflow/zhenghao/specs/003-browser-python-ide.md`. The selected design keeps the compact 40/60 split and light MUI tokens. The concise surface contract is [apps-frontend-src-pages-publishedquestionpage-tsx.md](../../../apps/frontend/.impeccable/surfaces/apps-frontend-src-pages-publishedquestionpage-tsx.md).

## Changes

- Added CodeMirror 6 with Python syntax, line numbers, indentation, brackets, undo/redo, keyboard editing, and a 20,000 UTF-16 code-unit source limit.
- New attempts begin with the published buggy code. A saved attempt remains authoritative; draft and final persistence continues through the existing API/recovery path.
- Added local Pyodide 314.0.7 execution, scratch assertions, optional stdin, Run/Test/Stop, bounded output, separate initialization and execution timeouts, and stale-output messaging. Scratch assertions and stdin remain component-local and do not enter save/submit payloads. The UI says these results are local feedback, not official grading.
- Each run uses a fresh `sandbox="allow-scripts"` opaque-origin iframe and a fresh classic blob worker. Only fixed same-origin runtime assets are fetched with credentials omitted; their sizes are checked and trusted bytes are cached in page memory. CSP limits the sandbox to its inline/blob bootstrap and blob connections. The Pyodide module factory hook is experimental and pinned; upgrades require renewed execution/isolation checks.
- Added runtime asset generation to frontend dev/build, with the generated `public/pyodide-runtime` directory ignored by Git, Prettier, and ESLint. Production build output contains the worker, Wasm, standard library, lock file, and license notice.
- Added an explicit Home link beside the signed-in role link. The existing brand and route blocker continue to handle Home navigation. Updated the public landing description to reflect the now-available published-question practice flow.

## Verification evidence

Commands and outcomes on configured Node `v24.22.2`:

- `npm run build:python-runtime` — passed.
- `npm run test -w @debugclinic/frontend` — passed, 5 tests. The implementer-owned boundary tests cover oversized source/tests/stdin rejection before frame creation, refusing Test without learner assertions, and accepting exactly 20,000 source units while creating an opaque CSP-limited frame and cleaning it up on Stop.
- `npm run typecheck -w @debugclinic/frontend` — passed.
- `npm run lint` — passed, including the generated-runtime ignore.
- Scoped Prettier check for changed source/configuration and the surface contract — passed.
- `npm run build -w @debugclinic/frontend` — passed; `dist/pyodide-runtime/` contains the five generated runtime assets. Existing build output still warns about dependency chunk size and removable Zod purity comments.
- `impeccable detect --json` on the changed UI files — returned `[]`.
- `git diff --check` — passed.
- A temporary, database-free browser preview exercised the actual workspace and local runner at 1440×900 and 320×800. A learner-written assertion for `total([3, 5]) == 8` completed in Pyodide. The 320px document width remained 320px. The preview and its harness files were removed after inspection.
- The coordinator separately reported a focused Chromium probe against the implementation source: Python sum output and a learner assertion completed; the opaque-origin message bridge worked and produced zero application API requests. This is development evidence supplied by the coordinator, not an independent acceptance/security review.
- A second coordinator-run module probe reported stdin handling, a failing-assertion traceback, Stop teardown, and the 5-second timeout against real Pyodide; it reported zero API requests and no browser errors. This remains focused development evidence, not the independent acceptance matrix.

No database URL, backend, or PostgreSQL command was used. The full independent browser, storage/network-denial, Stop/timeout, session-expiry, recovery, and production-built execution matrix remains with the assigned tester/coordinator. Older textarea-specific browser assertions also need that tester's contenteditable adaptations; this implementation did not modify independent acceptance tests. No deployment or push was performed.

## Limits and follow-up

The runner enforces 20,000 code units, 10,000 scratch-test units, 8,000 stdin units, 64 KiB combined output, a 30-second initialization timeout, and a 5-second execution timeout. Browsers do not expose a dependable per-run memory/process quota here; resource exhaustion remains limited by the learner's device. The production bundle also carries a 1.5 MB worker and roughly 12 MB of Wasm/standard-library assets, fetched only when the learner runs code.

One initial npm install was invoked under host Node `v26.8.1` before the configured Node path was set; it emitted the expected engine warning and no install scripts were run. All subsequent build, lint, formatting, and typecheck commands used Node `v24.22.2`. `AGENTS.md` now records the actionable Node-version check; the coordinator's separate `AGENTS.md` and `delivery.md` edits remain unstaged and were preserved.

The implementation checkpoint recorded earlier was 2,597,175 tokens against a 2M soft estimate, with `gpt-6-luna` medium. No budget increase was requested and verification gates were kept intact.
