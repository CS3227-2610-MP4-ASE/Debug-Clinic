# ZH-LWS-02 documentation handoff

## Scope and sources

This documentation update covers the approved learner browser Python IDE and
the F5 viewport repair. It used the approved ZH-LWS-02 scope and implementation
notes, both repair-round handoffs, independent testing report, fixed monitoring
checkpoints, and the existing guides and feature map. Developer 2 SDD artifacts
were excluded.

Changed files: `PRODUCT.md`, `docs/DeveloperGuide.md`, `docs/UserGuide.md`,
`docs/Reflection-ZhengHao.md`, `workflow/agents/FEATURE_MAP.md`, and this
handoff. Product claims distinguish browser-local learner execution from
instructor authoring and generated previews, which do not execute Python.

## Evidence and limits

The independent report passed within its approved tested scope at product
revision `2470a3b`: final affected browser cases 26/26 and production-built
Python integration cases 6/6. Collection found 226 cases in 16 files. The
previous full normal local run was 199 passed, 20 expected skips, and 3 harness
failures; only the corrected affected subset passed 4/4. This update does not
claim a full green local run. Round-one results at `36df16b` are identified as
earlier evidence.

Remote CI for the separate code/test checkpoint `929d0ec` passed verification
and browser jobs (206 passed, 20 expected skips): [workflow run](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/actions/runs/42240818024).
That run does not verify this documentation commit; final documentation-head CI
confirmation remains with the coordinator.

The guides record that Python runs in a browser-local opaque iframe/worker, with
exercised isolation boundaries and stated limits. Hard browser memory/process
quotas, IPC-flood resistance, physical-touch support, and manual assistive
technology checks remain unverified. Run/Test output is local feedback, not
official grading; scratch tests and stdin are temporary.

## Reflection and verification

The ZH-LWS-02 reflection uses the fixed pre-documentation checkpoint from
2026-11-06 15:03:57 UTC. Documentation-stage usage is unavailable in that
snapshot, not zero. Existing ZH-LWS-01 reflection figures were preserved. The
viewport lesson records the reproduced 180px minimum / stale computed maximum
after a 600px-to-900px resize and the React same-value state bailout; viewport
state made the resize observable. The affected cases cover that transition,
not every viewport or runtime.

Only Markdown formatting, local-link checks, and diff hygiene were run for this
documentation stage; application tests were not rerun. No monitoring artifacts
or shared coordinator files were changed. The authorized local commit contains
only the six files listed above; no push was performed.
