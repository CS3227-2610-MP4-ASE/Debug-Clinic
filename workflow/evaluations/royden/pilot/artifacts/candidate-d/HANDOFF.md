# Candidate D handoff — experimental draft

This candidate is a synthetic planning experiment, **not human-approved SDD**. No application code, network call, production setup or deployment was performed. Work is confined to the assigned candidate-d worktree and the two explicitly named skill files; `ask_owner.py` was executed only through its public CLI, never inspected.

## Delivered artifacts

- GrillingDecisions.md: seven prerequisite-ordered rounds, numbered frontier questions/recommendations, exact owner constraints COACH-01–15, and explicit separation of owner evidence from technical proposals.
- PRD.md: learner journey, instructor authority, scope, acceptance requirements R01–R15, error/resource/privacy behavior and review gates.
- TDD.md: strict proposed shared contracts/projections, immutable revision model, transactional stage/usage commit, save/submit lock integration, durable idempotency, bounded context/output, telemetry and TP-RECOVERY for uncertain provider outcomes.
- RequirementsToTests.md: all requirements mapped to 27 planned tests with fake transport, real local PostgreSQL race evidence and browser/accessibility coverage. Planned tests have not run.

## Evidence and decisions

Only TASK.md baseline and public oracle answers are owner evidence. All 15 listed topics were queried; retry/accounting/failure were queried again for uncertain outcomes. The repeated answer required an explicit recovery policy but did not approve the proposed mechanics. TP-RECOVERY therefore remains a reviewable technical proposal: no automatic uncertain resend, durable UNKNOWN outcome, no advancement, deliberate separately accounted new-key retry, and no late-result resurrection.

The skill's shared-understanding confirmation gate is not satisfied by a human. This task explicitly authorizes draft planning with a synthetic oracle; it does not authorize treating these artifacts as approved or starting implementation.

## Local commits

- `13040f2` — `docs: record synthetic coaching decisions and draft requirements` (GrillingDecisions.md, PRD.md).
- `docs: specify coaching coordination and acceptance handoff` — technical design/test-handoff commit; includes TDD.md, RequirementsToTests.md, this file and minor consistency corrections to the decision record/PRD. Its hash is reported in the final candidate result.

## Checks and limitations

Document-only checks: a Python standard-library assertion pass verified all five draft/status markers, COACH-01–15, rounds 1–7, Q1–16, R01–15 in PRD and traceability, T01–27 planned-test rows and absence of pending-oracle placeholders. An initial status-marker assertion caught inconsistent wording in the decision record; it was corrected and the full check passed. Scoped Git whitespace/diff checks and candidate-d status are verified around the explicit-path commit and reported with its final hash. These checks do not validate an application implementation.

No product repository/schema/route inspection, private fixture/evaluator inspection, external services, live provider, app execution, migrations, feature tests or real database test runs occurred. The existing integration seam names are proposed requests, not discovered APIs. No quantitative provider limit or billing guarantee is asserted.

## Next authorized owner actions

Review the API/fingerprint and historical replay semantics, shared save/submit locking, accounting units, prompt progression wording and TP-RECOVERY. Decide retention/deletion before real users. Verify live provider numeric limits/capabilities and operational configuration before production acceptance. Implementation, real-user use and production remain separate gates; no follow-up implementation has begun.
