# ZH-LWS-02 independent acceptance and verification

## Frozen acceptance before implementation diff

6 November 2026 (Asia/Singapore). Single reused independent testing chat,
gpt-6.1-sol/high; no subagents/chats/branch. Reviewed inputs before source diff:
complete approved plan `workflow/zhenghao/specs/003-browser-python-ide.md`,
complete ZH02 implementation handoff, assignment and applicable project workflow,
skills, CodingStandards and feature map. Approved plan commit `9742f17`; product
implementation `f3696f8`, builder tests `1ff3eab`, inspection HEAD
`6890fad66c348ea8010320371c32e25a2610b8f0`. Source diff has not yet been inspected.
Developer2 SDD excluded before collection. Coordinator owns dirty AGENTS/delivery
and telemetry, builder owns all source repairs, coordinator alone pushes.

Independent observable acceptance derived from IDE-01..07:

1. Signed-in Home and brand open public `/` on desktop/mobile without sign-out.
   Dirty editor navigation still offers Stay/Leave and preserves edits on cancel.
2. Visible CodeMirror Python editor has line numbers, highlighting, indentation,
   undo/redo and keyboard operation; enforces 20,000 UTF-16 units. Absent attempts
   start with published buggy code; saved/final text remains authoritative.
   Programmatic loads are clean. Final content is read-only.
3. Real locally served pinned Pyodide executes working Python/functions, learner
   assertions and stdin. Actual stdout/stderr, syntax/assertion failures and
   completed/error states are displayed; blank tests reject. Results are local
   advisory feedback, not official grading or submission. Scratch tests/input
   never enter saved/final API payloads.
4. Stop and five-second execution timeout tear down an infinite run; a fresh
   successful rerun works. Output limits handle Unicode, no-newline output and
   floods with explicit truncation. Asset failures, slow initialization timeout,
   cancellation and explicit rerun recover safely. Edits mark prior results stale
   or stop/clear them. Runs never alter persisted/submitted state.
5. Real isolation probes use actual local runtime, not doubles alone: fresh
   opaque `sandbox=allow-scripts` iframe without same-origin and dedicated worker;
   no parent DOM/cookie/IndexedDB/app storage/API/external network/host filesystem
   access. Count actual probe API/external requests (must be zero). Parent asset
   fetches are fixed same-origin public URLs, credentials omitted, bounded bytes;
   no CDN/permissive fallback. Wrong source/nonce/run ID/stale/oversized messages
   are ignored safely. Intentional CSP-denial console errors are labelled.
   No Node/API Python execution or official grading trust is inferred. Browser
   hard memory/process quotas remain an explicit limitation.
6. Account switch/expiry/navigation disposes pending runs without touching new
   identity content or dirty guard. PR10 lost-save/conflict read recovery, explicit
   save/final confirmation, retained edits and immutable finals still work.
7. White description pane uses real content and independent scrolling. At
   1440×900, 1280×600/minimum editor height and 320px mobile, expanded test/stdin
   panels plus long reasoning preserve real pointer reachability through clipping
   ancestors and no horizontal page overflow. One batched UI inspection plus at
   most one UI repair/confirm round; no optional polishing cycles.
8. Production-BUILT frontend must execute real Python; serialization/minification
   of bootstrap functions must be exercised. Normal full browser collection and
   run keep all DB URL variables and auth opt-ins unset. Real-cookie F01/F02/
   learner composition uses only the coordinator-verified disposable database
   once supplied. Runtime assets/licenses/generated ignores are checked.

Legacy assertion adaptations preserve behavior: native textarea value/disabled
queries become visible contenteditable text/read-only assertions; absent starter
expectations become buggy code, and disabled Run expectations become execution/
isolation assertions. No hidden mirrors or assertion deletion. Owned changes are
independent tests, necessary documented learner test adaptations and this report.

Required evidence: root and frontend unit suites, lint/typecheck/scoped format,
production build and actual built execution, full normal desktop/mobile browser,
real composed regressions, real isolation/resource/failure cases, separate
functional/standards/security verdicts. Source repairs return as one consolidated
packet. Three meaningful repairs per failure/two targeted review rounds.
Node24.22.2 standalone path is fixed by assignment. No guessed DB, `.env` targets,
live providers, pushes/comments/deployments, or raw telemetry scans.

## Results and review

Freeze commit: `d6edfb9`, before implementation diff collection. Product source
remains `f3696f8a2963129104cfb061aff3c02f2533b20b`; builder boundary tests are
`1ff3eab`. Later `6417b56` is coordinator documentation/lessons only. No product
source was repaired here. SDD exclusions were applied before every diff/search.

## Consolidated repair packet — review round 0

| Review           | Verdict                                    | Basis                                                                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional       | **Changes required**                       | F1–F3 reproduce in real Python/browser runs; F4 is an accepted layout requirement gap; F5 is an accessible range defect.                                                                                                                                   |
| Coding standards | **Changes required**                       | Resource cleanup/cache ownership, accurate output contracts and accessible/layout invariants need F1–F5 repairs. Current lint/typecheck/build pass.                                                                                                        |
| Security         | **Changes required for resource controls** | Real origin/storage/network isolation passes the exercised probes, but the advertised output byte bound is implemented as UTF-16 units and stalled initialization is not fully cancelled/recoverable (F2/F3). No app-storage/API/host escape was observed. |

Expected-red tests are ready. Return all findings together to the existing builder.
No source repair/review round has yet been used; no risk acceptance is inferred.
The coordinator explicitly requested avoiding another known-red broad/slow run
before repair. The final full normal browser matrix remains required after repair.

### F1 — P1: real stdout without newline is silently lost

`apps/frontend/src/python/pyodide-worker-entry.js:70–71,84–94` uses batched
line-oriented stdout/stderr callbacks without flushing remaining stream content
before terminal state. Real `print('NO_NEWLINE_OUTPUT', end='')` completes but the
UI reports completion without printed output. Reproduced on both browser projects
by `IDE stdout without a newline…`. Preserve actual trailing output on success
and errors; do not fabricate a newline or an empty-output result. Stop may
terminate a running program, but normal completion must not discard its bytes.

### F2 — P1: truncation drops its notice, splits Unicode, and misstates units

`apps/frontend/src/python/pyodide-worker-entry.js:37–47,91` reserves 48 units but
then sends the truncation notice through the same exhausted `append` path, which
returns at remaining <= 0. The real flood-output test completes without any
truncation indicator. `print('a' + '😀' * 40000)` produces an unpaired surrogate
in actual rendered output (`isWellFormed() === false`). Both reproduce in desktop
and mobile Chromium.

The worker counts JS UTF-16 units, not bytes: current ordinary-output budget is
65,488 units (65,536 − 48), parent aggregate cap is 65,536 units; the label says
64 KiB. Astral output can therefore exceed the advertised UTF-8 byte cap. This
unit mismatch is source analysis; the final byte-cap assertion is behind the
earlier failing Unicode assertion and is not claimed as a separately observed
pass/fail. Preserve a visible bounded notice, valid Unicode boundaries and the
approved 64 KiB combined-output budget, with accurately documented units. Keep
stderr/error reporting truthful and independently bounded.

### F3 — P1: Stop/initialization timeout leave a hung cache that blocks rerun

`apps/frontend/src/python/sandboxed-runner.ts:165–203` caches an in-flight
Promise. It resets only on rejection. Cleanup removes the frame/timers but neither
aborts asset requests nor invalidates a pending promise. Reproduction: hold the
first worker.js response, Stop (or advance the initialization deadline), make new
requests healthy, then explicitly Run again. No second worker request occurs
(observed count remains 1, expected 2); the new run stays on the old stalled
promise. Both Stop and timeout cases fail on both projects. Frames are removed,
but initialization work is not fully cancelled/recoverable.

Cancel/invalidate owned pending initialization on teardown/deadline, while keeping
successfully cached trusted bytes reusable. A fresh explicit rerun must load
healthy assets without waiting for the stopped request. Preserve fixed-origin,
credential-omitting fetches, byte limits and stale-completion disposal.

### F4 — P2: approved description-pane structure remains incomplete

`apps/frontend/src/pages/PublishedQuestionPage.tsx:392–396` retains the old bare
Stack with gap/min-size/overflow/right-padding only. Actual computed reading
background is warm canvas `rgb(245, 243, 237)` at all three viewports, rather than
the approved white bounded reading surface. The title is above both columns;
Description/topic scroll away with the body. The screenshot after independent
left scrolling loses all pane identity/context.

The coordinator independently inspected these captures and article JSX and
explicitly confirmed this as an IDE-05 completion gap, not optional aesthetic
work. One bounded repair should provide a coherent pane header containing
Description, actual title/topic, and a readable grouped body with independent
scroll. Retain the light theme, actual content, route/ARIA labels and all working
right-pane controls; do not invent tabs/examples/metadata. The independent test
now also checks title/header/topic context inside the article after body scroll;
those additional contextual assertions await repair verification. Existing white
surface assertions already fail on both projects. One visual confirm round
remains after this batched repair.

### F5 — P2: short-desktop separator starts outside its accessible range

Static source review: `LearnerWorkspace.tsx:27–28` initializes height to 38% of
viewport (max 320), while `:94–95` computes a different maximum. At height 600,
initial/current is 228 and advertised maximum is 180. The original viewport
resize clamp/listener is also absent. Clamp initial/current height consistently
with the exposed bounds, including viewport changes, preserving edits and real
pointer/keyboard resizing. A soft current/min/max assertion is added to the
batched layout case; it was added after inspection and awaits runtime execution
in repair verification. Do not describe it as an already executed red case.

## Independent evidence actually observed

| Layer                                           | Result / mock boundary                                                                                                                                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root unit/API                                   | **531/531 pass**, 30 files. No changed backend business logic.                                                                                                                                                                                                             |
| Frontend unit                                   | **9/9 pass**, 2 files: builder's 5 boundary cases + 4 independent protocol/lifecycle cases. DOM/transport doubles, not Python proof.                                                                                                                                       |
| Lint/typecheck                                  | Pass with adapted and newly authored tests; additional strict targeted E2E/helper typecheck passes under ES2023/NodeNext.                                                                                                                                                  |
| Production build                                | Full `npm run build` passes, including declarations and generated pinned runtime. Existing Zod purity/chunk-size notices remain non-fatal.                                                                                                                                 |
| Initial independent real-runtime desktop matrix | **7 pass / 6 fail**, 13 cases. Five source failures are F1/F2/F3; the sixth was a long-line DOM measurement issue corrected as described below.                                                                                                                            |
| Production-BUILT real execution                 | **3/3 desktop pass**: actual CPython version 3.14.2, stdout/stderr/functions/assertions/stdin, Stop/5s timeout/fresh rerun/state, and real isolation. This exercises minified bootstrap `function.toString()` and generated assets.                                        |
| Final production isolation probes               | **2/2 pass**, desktop/mobile, after strengthening host-file existence and broad network accounting. Opaque dedicated-worker origin, denied APIs/storage/host, zero actual probe API/external requests, no unexpected page errors.                                          |
| Home/brand final targeted test                  | **2/2 pass**, dirty Stay/Leave, public landing and signed-in navigation on both projects.                                                                                                                                                                                  |
| Adaptation confirmation subset                  | **15 pass / 3 fail**, 18 cases: prior recovery/long-reasoning and editor boundary/worker lifecycle cases pass after semantic input/scroll adaptations; white pane fails twice; one mobile menu timing assertion was subsequently fixed and passes in the final Home rerun. |
| Real composed F01/F02/learner                   | **8/8 pass**, both projects, actual cookies/PostgreSQL, captured SMTP, fake AI, no browser interception. Retains publication/privacy, attempt save/reload/final, archive denial and references.                                                                            |
| No-DB browser collection                        | **222 cases / 16 files collected**, exit 0 with all four URL vars and both auth opt-ins unset. Final full browser run deferred until source repair at coordinator's explicit direction.                                                                                    |
| Impeccable detector                             | `[]` over changed UI targets. Mechanical scan only; it did not detect the requirement/runtime failures.                                                                                                                                                                    |

The broad diagnostic run was **61 pass / 19 fail** before all harness corrections;
it is not final acceptance. Several failures were harness/interface issues, not
product defects. Tests were inadvertently edited while that worker run was still
active, so its combined counts are retained as diagnostic chronology only.
Final selected/proven results and the required post-repair full run supersede it.
No original behavioral assertion was removed to make source green.

### Actual isolation and resource evidence

Real pinned Pyodide probes ran in both dev and minified production UI. They show
`self.origin == 'null'`, `self instanceof DedicatedWorkerGlobalScope`, no
`document`, `parent` or Node `process`, denied cookies/localStorage/IndexedDB,
denied application/external fetches, and denied a host file verified to exist by
the test controller. The test controller alone resolves/checks that path; Python
executes only in the browser. Actual probe API/external HTTP/WebSocket request
count is zero. Expected CSP-denial console errors are explicitly separated from
application errors. Host filesystem denial is distinct from allowed ephemeral
Pyodide `/tmp`: a file and global written in one run are absent in the next.

Iframe sandbox attribute is exactly `allow-scripts`; no same-origin permission.
The actual run/worker source is fresh per attempt. Four fixed same-origin asset
fetches were observed with no cookie header despite a synthetic parent cookie.
Source requires `credentials: omit`, `mode: same-origin`, `redirect: error`;
unknown worker HTTP fetches are blocked by opaque-frame CSP, with no CDN fallback.
Experimental factory initialization preserves `...settings` and supplies Wasm
bytes; real Python/stdin/assertion execution verifies that boundary in production.

Independent fake-protocol tests additionally reject wrong source/origin/nonce/
runId/prototype/channel, suppress stale listeners after cleanup, cap aggregate
ASCII output/error messages, and distinguish initialization/execution timers.
Actual browser bridge tests inject wrong-source/IDs and stale messages while a
real worker runs; these are privileged test-controller events, not a claim that
Python can access the parent bridge. All selected cases pass after real keyboard
replacement corrected the initial input race.

Current source bounds (not a hard process/memory quota):

| Boundary                           | Implemented unit/bound                                                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code / scratch tests / stdin       | 20,000 / 10,000 / 8,000 UTF-16 code units, checked before frame creation and again in worker.                                                                          |
| Ordinary output / parent aggregate | 65,488 / 65,536 UTF-16 units currently; advertised 64 KiB mismatch and Unicode/notice failures require F2.                                                             |
| Error message                      | 8,000 UTF-16 units, separate from normal output aggregation.                                                                                                           |
| Parent HTTP asset bodies           | worker 4 MiB, Wasm 12 MiB, stdlib 4 MiB, lock 512 KiB (bytes); streaming/declared-size checks in source.                                                               |
| Initialization                     | 30,000 ms timer, restarted on loading messages; not a guaranteed total wall-clock budget across all initialization phases. Held-asset Stop/deadline recovery fails F3. |
| Python execution                   | 5,000 ms after running state; real infinite loop times out after >4s and frame removal/fresh rerun passes.                                                             |

Assets are pinned to package 314.0.7 and actual interpreter reports CPython 3.14.2.
Generated public runtime is ignored by Git, Prettier and ESLint, lazily fetched,
and copied into production output. Generated license notice identifies Pyodide,
MPL-2.0 and the full-license URL. No vendor source was patched. This is an asset/
notice inspection, not a complete third-party license audit. Browser hard memory,
CPU-process quotas, IPC flood resistance and OS-wide resource isolation are not
guaranteed; no destructive OOM test or multi-tenant server-sandbox claim is made.

## Test adaptations and validity corrections

- Added `tests/support/python-editor.ts`: observes actual visible CodeMirror
  lines and contenteditable/aria-disabled state; keyboard-selects the document
  before real text insertion. No hidden mirrors. Long-line virtualization means
  visible DOM cannot prove the entire 20k document; the real saved API payload
  verifies exact UTF-16 boundary/extra-unit rejection instead.
- Adapted learner-workspace, acceptance, recovery and composed cases from native
  value/disabled assertions to these semantics, retaining content, revision,
  error/retry, final immutability, session and dirty-guard expectations. Scratch
  tests/stdin never enter the payload: keys remain code/reasoning/expectedRevision.
- Null-attempt empty-code expectations become the actual published buggy code
  under approved IDE-02; saved/final text is still authoritative and clean.
  Disabled Run expectations become enabled real-local execution/advisory copy.
  Removed placeholder Hint button assertions become explicit absence/no-hint
  request assertions; privacy DTO/network checks remain. No hint implementation
  is implied. F02 composed instructor assertions are unchanged except learner UI.
- Prior minimum-height test now uses the accessible advertised minimum, rather
  than freezing the superseded textarea's 320px implementation. Pointer checks
  still test clipping ancestors and use actual wheel/mouse input. They now scroll
  the real right pane, not only the outer page.
- Initial long-problem fixture exceeded the public 2,000-unit schema. Reduced it
  to a valid long published statement and added explicit response-schema parsing;
  it still forces independent scrolling. That invalid fixture was not a source
  defect. Initial mobile Home check opened an outgoing shell during transition;
  waiting for the actual landing heading before opening its menu fixes the query.
- Initial contenteditable `.fill()` races left old fragments in mobile runs;
  real editor selection/keyboard insertion fixes those probes without changing
  expected content or timeout/isolation assertions. This explains initial mobile
  false timeouts and the unrelated recovery-text failure. All corrected selected
  cases pass. The exact-boundary wire test passes on both projects.

AGENTS lessons for test-file freezing/CodeMirror virtualization were added without
reverting coordinator edits and are left unstaged for the coordinator. No skill
was created/revised. No raw session/transcript scan was performed.
An additional targeted test typecheck caught an ES2024-only String method and an
over-narrow DOM annotation; the test now uses an equivalent Unicode scalar check
and Element type, and passes ES2023 checking. This is a test compatibility
correction, with no source behavior or Unicode expectation change.

## Bounded UI review

One valid batched inspection captured 1440×900, 1280×600 and 320×800 after filling
expanded scratch/stdin and long reasoning. Real Save/Submit centers are reachable
through actual scrollable ancestors; independent description scrolling and no
horizontal page overflow pass. Screenshots show real Python highlighting/line
numbers and compact local/advisory controls. F4/F5 are accepted completion issues,
not a request for another visual direction or unrelated polishing.

| Impeccable audit dimension | Limited evidence score / 4                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| Accessibility              | 3 — labels, keyboard/undo and focus work; separator range needs F5; no screen-reader certification.      |
| Performance                | 3 — runtime is lazy and pinned; sizable assets are bounded; no profiling/hard device quota claim.        |
| Theming                    | 2 — light incumbent retained, but approved white pane/header hierarchy missing.                          |
| Responsive                 | 3 — tested pointer reachability/stacking/widths; physical-device touch not tested.                       |
| Integrity                  | 3 — actual content and honest local grading distinction; detector empty does not establish completeness. |
| Total                      | 14/20 advisory UI audit, **not a release pass**.                                                         |

Context tooling reports build-path/stale surface metadata; the allegedly missing
target and its brief do exist and were read directly. These metadata findings
were not repaired or used to expand scope. PRODUCT/DESIGN capability wording is
historical and the approved plan controls this feature; documentation owns its
scheduled correction. One bounded visual repair/confirmation batch remains.

## Reproduction, artifacts and next step

All commands use standalone Node v24.22.2/npm 11.19.0. No-DB browser environment:

```sh
export PATH=/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin:$PATH
unset DATABASE_URL DATABASE_URL_POOLED TEST_DATABASE_URL E2E_TEST_DATABASE_URL
unset E2E_AUTH_COMPLETION E2E_REAL_AUTH
npm exec playwright -- test --list
npm test
npm run test -w @debugclinic/frontend
npm run lint
npm run typecheck
E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- tests/e2e/python-ide-acceptance.spec.ts --workers=2
```

Focused initial desktop reproduction used `--project=chromium`. Built execution
uses ignored `.workflow-state/zh02-built/playwright.config.ts`: Vite preview serves
the actual built `dist`; normal backend health is real local but learner/auth/API
data are intercepted. Run the same Python spec with this config and
`--grep 'real Python executes|real sandbox denies|Stop and real' --project=chromium --workers=1`.
The final strengthened built security test used `--grep 'real sandbox denies' --workers=1`
for both projects. Production code executed; neither a source import nor a fake
DOM guard substitutes for this evidence.

Full production build and composed checks use all four variables identically set
to `postgresql://debugclinic:debugclinic@127.0.0.1:64067/debugclinic_ide_test`.
Docker/SQL independently verified owned container 7ba98aa…f3db2, loopback 64067,
and `debugclinic_ide_test|debugclinic`. No `.env`/guessed DB or migration/seed was
used here. Captured-email/fake-AI real-cookie command:

```sh
E2E_AUTH_COMPLETION=1 E2E_APP_ORIGIN=http://127.0.0.1:51819 E2E_BACKEND_PORT=51820 \
  npm run test:e2e -- tests/e2e/f01-composed.spec.ts tests/e2e/f02-composed.spec.ts \
  tests/e2e/learner-workspace-composed.spec.ts --workers=1
```

Composed publication deliberately loses a reply, so its expected Vite socket-hangup
diagnostic is not a failed check. All eight cases pass. Browser servers were
sequenced, scoped socket/Chrome/tsx escalation used, unrelated processes retained.
Coordinator owns DB cleanup. Backend/schema/API business logic and adapters were
unchanged, so no broad PG/packaged-Netlify repetition was needed. No remote CI,
push/comment/deploy or live SMTP/Google/AI action was performed.

Raw synthetic check outputs remain outside Git under
`.workflow-state/ide-testing/round0/logs/`. Key logs: `ide-acceptance-initial.log`,
`ide-built-real.log`, `ide-built-security-final.log`, `ide-adapt-confirm.log`,
`ide-home-final.log`, `ide-composed.log`, `ide-final-unit.log`,
`ide-final-frontend-unit.log`, `ide-final-collection.log`, `ide-build.log`,
`ide-final-lint.log`, `ide-final-typecheck.log`, `ide-packet-format.log`.
Diagnostic runs and their corrections are retained separately.
Screenshots under `.workflow-state/ide-testing/round0/screenshots/` are
`ide-1440x900.png`, `ide-1280x600.png`, `ide-320x800.png` (mobile full page 320×3929
for the valid long fixture). Auth/composed traces/screenshots remain disabled.

Coordinator-reported since-bounded testing usage is **2,468,173 tokens**, above
the 1.5m initial estimate; Sol high stayed selected and repeated output/reads were
narrowed. That checkpoint is not a final token total or a cost-savings claim.
Raw telemetry is owned by the coordinator.

Next: return F1–F5 in one packet to the existing builder, preserving these tests.
After its bounded source repair, reverify affected cases and production runtime,
then run the required full no-DB normal desktop/mobile suite and composed/static
matrix before declaring green. No residual blocking risk is accepted here.
