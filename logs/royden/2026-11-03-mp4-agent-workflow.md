# MP4 agent workflow — 3 November 2026

## Owner decisions and authorization

The owner requested MP3 Dev 2 workflow review, then paused work. No repository
changes preceded the explicit implementation request. Subsequent grill-me
discussion selected full SDD gates, Dev 2 separation, bounded autonomy, adaptive
single/multi-agent routing, a four-run controlled pilot, event/exception monitoring,
blind review, soft resource estimates, fresh scoped contexts, substantive review
gates, isolated writer worktrees, scoped autonomous recovery, application evidence
designed now/wired per feature, adaptive review separation, synthetic tasks and
normal clarification in the control. The owner then supplied the complete plan
and explicitly requested implementation. This log records available evidence,
not reconstructed historical conversations or invented artifact approvals.

## Implementation checkpoints

- Clean `master` at `c551906`; created `royden/mp4-agent-workflow` and isolated
  writer branches/worktrees. Read skill-creator and writing-for-agents guidance.
- Documentation writer produced two skills, ten role instructions, runbook,
  standards and templates. Monitor writer produced a stdlib CLI and tests.
  Generic agents received fresh scoped packets; no named runtime selection claimed.
- Coordinator froze protocol/fixtures in `f0f7377`, verified the grader with
  passing/failing examples, and integrated meaningful writer commits.
- The initial Windows temporary-directory self-test could not write sandbox Temp;
  an explicit, contained fixture scratch directory resolved that environment issue.
- Independent review found five defects despite 28 green tests. One targeted
  repair round added six regression cases; second review observed 34 passing
  tests and no remaining targeted blockers.
- Prettier was absent from PATH/dependency bundles. The approved pinned npm tool
  ran through automatic escalation review; the sandbox's separate offline cache
  could not see it, so subsequent formatting used the approved tool context.
  No approval rejection occurred. No project dependency was added.
- Verbatim Windows archive newlines initially triggered whitespace errors after
  newline preservation was enabled. A path-specific `cr-at-eol` attribute retained
  exact evidence bytes while allowing the normal staged whitespace check.
- The final full Prettier check reported 90 untouched CRLF files; a read-only
  auto-line-ending check passed. Git attributes now enforce the existing
  `.editorconfig` LF policy. Only tracked files whose normalized bytes exactly
  equalled `HEAD` were refreshed (111 files, no source-content diffs); archives
  and env files were excluded. The normal full formatting check then passed.

## Actual pilot and observations

Single delivery passed 42 own tests and 12 held-out tests. Parallel test author
froze `f6efbee` before implementation exposure, observed 109 expected-red failures
against the stub, then coordinator integration passed 141 tests and the same
12 held-out checks. Ordinary and grill-me planning retrieved the same frozen
owner answers; neither produced application code or claimed executed tests.

The blind judge fixed delivery scores at 10/9 and planning at 8/10 before resource
totals/condition labels were supplied. A uniform checkpoint-evidence correction
withdrew one blinding-scaffold criticism but did not change the delivery score.
The remaining handoff-command gap and planning concurrency finding are preserved
in original reviews rather than silently repaired in the scored snapshots.

Real per-response collection exposed underestimated token budgets and large cached
input volumes. Parent history and cumulative snapshots were not summed. Explicit
lifecycle spans were recovered from session metadata; idle/owner waits were not
invented. The final report separates participant, setup, review and evaluation
measurements and labels its cutoff. See the pilot and reflection documents for
numbers, limitations and next experiments.

No product behavior, credentials, production infrastructure or host settings were
changed. No push, merge, deployment or live AI call occurred. A first real MP4
feature still requires its own approved SDD and authorization.
