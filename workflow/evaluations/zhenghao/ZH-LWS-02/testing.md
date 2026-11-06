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

Pending independent source inspection and verification.
