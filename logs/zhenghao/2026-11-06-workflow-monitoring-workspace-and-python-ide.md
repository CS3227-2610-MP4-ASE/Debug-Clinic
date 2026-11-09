# Contributor monitoring, learner workspace, and browser Python IDE — 6 November 2026

## Contributor-specific monitoring

Zhenghao first requested contributor-attributed development telemetry without changing Royden's canonical monitor, shared schema, templates, or output paths. The resulting add-on, `scripts/zhenghao_workflow_report.py`, derives reflection metrics from canonical reports and writes only under `workflow/evaluations/zhenghao/`. Raw session files, manifests, and state stayed outside Git. Commits `00451039` and `69d3a30e` added and isolated this reporting path.

The monitoring prompts used explicit session mappings, task IDs, `since` bounds, soft stage estimates, and checkpoint events. Reports deduplicate response records; cached input is already inside input, and reasoning output is already inside output. The wrapper does not prove cost savings, subscription usage, or causal improvements. The canonical report remains authoritative for workflow events; the add-on is a derived reflection view.

## ZH-LWS-01: question browsing and attempt workspace

### Request, approval, and dispatch

The owner approved a compact plan → implementation → independent testing/repair → documentation workflow after a PR #9 compatibility review. Requirements covered searchable published-question browsing, a split problem/editor workspace, learner-owned attempt save/final submission with optimistic revisions, unsaved-work protection, responsive layout, and preservation of instructor/publication behavior. Run and Get Hint remained disabled at this stage.

Four project conversations were used rather than one chat per artifact:

- coordinator: requested/observed GPT-6.1 Sol/high;
- implementation thread `01a1af97-daca-7080-9189-d07ba58e8cb0`: verified GPT-6 Luna/medium;
- testing thread `01a1afbe-797a-7352-bfd5-150343ea1e0b`: verified GPT-6.1 Sol/high;
- documentation thread `01a1afe6-bebf-7621-ae97-0ad8b565e2d3`: verified GPT-6 Luna/medium.

The stage chats were created with `create_thread` for ZH-LWS-01 and reused via follow-up messages for repairs and ZH-LWS-02. Handoffs carried the exact revision, approved artifact hashes, owned paths, checks, limitations, and next action. Work was sequential at the dependency level: testing followed the implementation handoff, repairs returned to the same implementer, re-review returned to the same tester, and documentation began only after independent green evidence. This was not four agents editing in parallel.

### Failures, repairs, and outcomes

The implementation delivered the searchable attempt workspace at `3e733516`, followed by a Netlify composition fix at `4eb34478`. Independent testing froze its interpretation before reviewing the repair and found four functional issues plus one standards issue, including a pending-save navigation race that could clear the dirty guard for newer local edits. One source repair round at `a13af3e6` resolved the recorded findings and passed independent functional, standards, and scoped-security review.

After PR #10 was opened, remote CI failed during Playwright collection because an opt-in composed spec initialized Prisma and required a database URL at module load even when skipped. Two owner-reported defects were also confirmed: recovery after an uncertain/lost save response and clipped long reasoning input. The repair at `b5837fe7` moved opt-in database creation behind guarded hooks, added read-only revision reconciliation without automatic mutation retry, preserved local edits across failed recovery, and bounded the reasoning field. An intermediate layout probe was initially misreported as a product failure; the final frozen hit-area test distinguished browser auto-scroll from user-reachable behavior and corrected the conclusion.

The final PR #10 checkpoint recorded 531 deterministic tests, 168 normal browser passes with 20 explicit opt-in skips, eight separately run real-cookie/PostgreSQL composed journeys, static/build checks, and successful remote `verify` and `browser` jobs. Counts from focused reruns are subsets and are not added to the full totals. Greptile also reported a successful review check, but that status is not treated as a substitute for the recorded local evidence.

## ZH-LWS-02: browser-local Python IDE

### Scope change and implementation

The owner then selected browser execution with learner-written scratch tests and standard input, superseding the earlier disabled-Run constraint only for the new bounded IDE. The design used a pinned Pyodide runtime inside an opaque-origin iframe/worker, local-only code/test/stdin/output state, explicit Stop and timeout behavior, and no official grading claim. A coordinator prototype established real CPython execution and blocked IndexedDB/API fetches, but was correctly labeled planning evidence rather than independent acceptance or hard process/memory isolation.

The same implementation/testing/documentation chats were reused. Actual model/effort remained Sol/high for coordination/testing and Luna/medium for implementation/documentation. The builder delivered source at `f3696f8a`; independent tests then found Unicode/output-byte-limit, cancellation, description-layout, and resize-bound defects. A first repair `36df16b7` fixed stream flushing, UTF-8 byte accounting, abortable runtime loading, the bounded description layout, and common resize clamping. A second independent state-transition test found stale accessible bounds when viewport growth left the editor at the same 180px height; `2470a3b2` made viewport height reactive.

The final affected browser matrix passed 26/26 and production-bundle Python checks passed 6/6. The earlier full local run remained 199 passed, 20 expected skips, and three harness failures, followed by a corrected 4/4 subset; it was not relabeled as one clean run. Remote CI on the code/test checkpoint passed 206 browser cases with 20 expected skips. Current evidence does not establish hard memory/process quotas, IPC-flood resistance, physical-touch behavior, manual assistive-technology acceptance, or any server-side Python sandbox.

## Resource observations

At the fixed ZH-LWS-01 delivery checkpoint (generated 6 November 2026 08:18:28 UTC), the canonical report recorded 105,881,646 total observed tokens across 537 responses. Planning/coordination was the largest task at 61,000,402 tokens; implementation was 33,208,747, testing 9,033,592, and documentation 2,638,905. All stage estimates were exceeded.

At the later ZH-LWS-02 rolling checkpoint (generated 6 November 2026 15:23:41 UTC), 173,776,547 total observed tokens were recorded: planning 90,845,331, implementation 39,759,007, testing 29,796,095, documentation 13,376,114. Planning includes prototype work, integration, polling, and follow-up, not only requirements writing. A 99.04% cache-hit ratio did not prevent high raw token totals and does not establish savings.

## Merge and references

PR [#10](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/10) merged into `master` as `2c372c5a` on 7 November 2026 SGT. GitHub metadata shows successful final `verify`, `browser`, deployment-preview, and Greptile checks. Earlier failures and targeted repairs remain part of the development record.

- [ZH-LWS-01 delivery ledger](../../workflow/evaluations/zhenghao/ZH-LWS-01/delivery.md)
- [PR #10 coordination and repair](../../workflow/evaluations/zhenghao/ZH-LWS-01/pr10-coordination.md)
- [Independent PR #10 testing](../../workflow/evaluations/zhenghao/ZH-LWS-01/pr10-testing.md)
- [ZH-LWS-02 delivery ledger](../../workflow/evaluations/zhenghao/ZH-LWS-02/delivery.md)
- [ZH-LWS-02 independent testing](../../workflow/evaluations/zhenghao/ZH-LWS-02/testing.md)
- [ZH-LWS-01 telemetry](../../workflow/evaluations/zhenghao/ZH-LWS-01/monitoring/report.json)
- [ZH-LWS-02 telemetry](../../workflow/evaluations/zhenghao/ZH-LWS-02/monitoring/report.json)
