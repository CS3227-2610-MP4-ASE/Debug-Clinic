# Candidate C planning handoff

**Experimental drafts; never human-approved.** 2026-11-03, branch `candidate-c`.

## Deliverables

- PRD.md: problem, scope, all 15 synthetic-owner decisions, R01–R15 acceptance
  requirements, proposed product choices and launch gates.
- TDD.md: fixed-stack interfaces, strict shared contracts, revision/request/call
  records, short PostgreSQL transactions, idempotency and terminal-submission
  fencing, explicit uncertain-outcome recovery, context/output limits and UI.
- RequirementsToTests.md: T01–T28 planned tests with owner/requirement mapping,
  deterministic fake transport and real-local-DB race evidence requirements.

## Decisions and limits

The synthetic interface returned COACH-01–15 in one clarification round. Only
those answers are owner evidence. Proposed choices include stage teaching
structure, nonblank code eligibility, unchanged-save no-op, historical replay,
specific API/record shapes, and explicit superseding retries for UNKNOWN calls.
They need integration review; none is human-approved.

Core invariant: only a validated response committed while the attempt is OPEN
and its revision/request/epoch are still current can advance a stage. Save and
final submission lock the same attempt row. Replays never dispatch again;
unknown upstream outcomes require explicit recovery and may incur another
provider charge. Successful application stages, possible provider dispatches and
idempotent replays are distinct records/counters.

No application code, schema migration, dependency, external service call or
application test was executed. No product source was available for integration
verification, and none was inspected. The assigned worktree was the only
read/write project location; owner-interface internals, sibling worktrees and
held-out data were not inspected. No optional skills or subagents were used.

Before implementation, reconcile the proposed shared contracts with existing
auth/attempt/published-hint/AI interfaces. Before live acceptance, verify actual
provider numeric limits/model behavior, approved hint mapping and educational
quality. Before real users, decide retention/deletion, provider data handling,
privacy/consent and support ownership. Numeric provider limits remain explicitly
unverified. Fake boundary/inert-display tests cannot prove universal model
instruction-following or prevent every generated full solution.

## Commands and checks

Commands ran from this assigned worktree only:

- Inventory: `Get-Location`; scoped `rg --files`; `Get-ChildItem -Force -Name`;
  `Get-Content -LiteralPath TASK.md`; `git branch --show-current`;
  `git status --short`; `git log -3 --oneline`.
- Clarification: `python ask_owner.py --list`, then the exact multi-topic command
  recorded in PRD.md. All 15 available topics returned COACH-01–15.
- Drafts written with explicit-path patches. Explicit-file commits:
  `git add -- PRD.md` / `git commit ... -- PRD.md` → `830c073`;
  `git add -- TDD.md RequirementsToTests.md` / `git commit ... -- TDD.md RequirementsToTests.md`
  → `e77dcbe`. This handoff receives a separate explicit-file commit.
- Python static document check verified draft labels, 15 recorded owner IDs,
  R01–R15 coverage, and T01–T28 presence. The first checker failed because it
  expected every grouped owner reference to repeat the `COACH-` prefix; a parser
  accepting comma-grouped IDs then passed. This was a checker issue, not an
  application test result.
- `git diff --check b5e4b62 -- PRD.md TDD.md RequirementsToTests.md` passed with
  no output; Git reported only its ordinary LF-to-CRLF notices during staging.
  Final whitespace/status verification includes HANDOFF.md.

Next authorized implementation work is described in TDD.md and the test matrix;
this planning run ends at committed reviewable drafts, without implementation
or approval claims.
