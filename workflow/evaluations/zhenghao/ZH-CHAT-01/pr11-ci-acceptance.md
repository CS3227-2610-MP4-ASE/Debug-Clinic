# PR 11 CI repair — independent acceptance interpretation

Owner request: repair failed CI on existing PR 11. This authorizes the narrow
CI repair, not implementation of the separately approved constrained-coaching
package, which remains planning-only. The conditional future live allowance
remains unstarted. No provider call, merge or manual deployment is in scope.

Baseline: `0a1b4c143d642dff9b27d42457fd839c4f64ddc2`.
Original formatting failure: run `42372802041`, verify job `128404211284`.
First corrected run: `42373562552`; verify passed, browser job `128406919738`
failed with 78 failures, 130 passes and 20 skips. Its consolidated errors show
workspace editors read-only before actions; retries inflated the run to 15.7m.

The formatting fix preserves generated monitor outputs verbatim using the
existing exact-file exclusion policy and formats the handwritten handoff table.
Local format/lint/typecheck and remote full verify passed. This does not resolve
the original chatbot security finding or establish browser acceptance.

The following expectations are frozen before inspecting the new fixture-fix
diff. Existing source and pre-fix tests were read to diagnose the failed boundary.

1. Intercepted learner workspace/IDE tests remain authenticated and editable
   until their explicit session-expiry, account-change or finalization steps.
   Their synthetic API boundary includes the mounted assistant's initial GET.
2. An assistant double returns strict shared-schema-valid empty private state
   for the exercise version declared by that fixture. Match the exact read
   endpoint; no catch-all success response, ignored 401, globally suppressed
   expiry event or unapproved automatic generation is acceptable.
3. Preserve all existing save/recovery/dirty-work/navigation/auth/account/final
   assertions and real pinned local Python execution. Fixtures establish browser
   orchestration, not real authentication, persistence or provider safety.
4. The former assertion that Get Hint is absent is superseded by the already
   implemented visible Get Hint control. Its replacement must match current
   behavior; assistant-specific no-generation/progression checks remain intact
   in `f02-learner.spec.ts`.
5. Reproduce one original failure before editing. Run all four affected suites
   across desktop/mobile after repair, then independently run the complete
   browser suite with bounded workers and scoped static checks on the final
   revision. The updated remote verify and browser jobs must both pass before
   reporting CI repaired. Keep any skips and failures visible.
6. Application source, approved plans, migrations, security policies and old
   security evidence remain unchanged. Verify explicit changed paths and the
   approved amendment hashes. Every DB-connected command uses a verified owned
   disposable loopback test URL; preserve unrelated processes and clean up only
   resources created for these checks.

Execution is assigned to the existing Luna implementation conversation; the
original Sol/high coordinator verifies independently. Reuse existing stage
identities. Record actual revision, model/settings, commands/results, mock/real
boundaries and recovery attempts in the final CI handoff. At most three
meaningful repairs per failure; do not change product requirements to get green.
