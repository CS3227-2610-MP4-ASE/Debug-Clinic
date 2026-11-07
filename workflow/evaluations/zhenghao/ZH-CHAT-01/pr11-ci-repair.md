# PR 11 CI repair — local verification checkpoint

Request: fix CI for existing PR 11 on `zh/learner-chatbot-assistant`.
This is a narrow CI/fixture repair. Constrained-coaching implementation remains
planning-only, the original chatbot security verdict remains blocked, and the
conditional six-call provider allowance has not started.

## Failures and changes

At `268c276`, [run 42372802041](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/actions/runs/42372802041)
stopped at Prettier on the handwritten implementation handoff and three generated
monitor outputs. Commit `0a1b4c1` formats the handoff table and adds exact formatter
exclusions for the four generated monitor outputs, consistent with existing
verbatim-checkpoint policy. All four reports remain byte-identical; table cell
content is unchanged. Canonical scripts/schema/templates and Royden paths were
not modified.

At `0a1b4c1`, [run 42373562552](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/actions/runs/42373562552)
passed the complete verify job but exposed a browser fixture failure: 78 failed,
130 passed, 20 skipped, 15.7m including retries. Earlier intercepted workspace
tests did not mock the assistant's new initial GET. That request reached the real
unauthenticated backend, returned 401 and dispatched session expiry, disabling
the mocked learner's editor. A focused local reproduction confirmed the cause.

Commit `99eef0658b20970890ae53be70ca5aa2ff57a2d6` adds one shared schema-validated
empty assistant-state fixture and uses it in the four affected suites. It matches
only the exact exercise assistant endpoint, answers GET only, and aborts other
methods at that endpoint. It does not suppress application 401 handling or use a
catch-all success route. The stale Get Hint absence assertion now requires the
already implemented control to be visible. Other save/recovery/auth/account/
finalization/dirty-work assertions and dedicated assistant cases remain intact.
Application code, migrations and approved coaching package bytes are unchanged.

## Independent interpretation and verification

The coordinator committed the [acceptance interpretation](pr11-ci-acceptance.md)
in `0b6776c`, before inspecting the new implementation diff. Its SHA256 is
`70d1fdef57d421b5f45f1337714a47aaefe62d51249daa37eb7f7d03ffca251b`.
Implementation used the existing verified `gpt-6-luna/medium` conversation;
independent review/full verification used the original `gpt-6.1-sol/high`
coordinator. These settings were checked in explicitly mapped session metadata.
No new stage conversation or live provider request was created.

| Check                               | Result and evidence boundary                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Original single Chromium failure    | Reproduced before edits; writer confirmed the unhandled assistant read caused fake-session expiry.                  |
| Four affected desktop/mobile suites | Writer-local 80/80 pass with two workers.                                                                           |
| Full browser suite on `99eef065`    | Independent **208 passed, 20 skipped**, 2.4m, two workers and retries disabled.                                     |
| `npm run lint`                      | Independent pass after browser cleanup, with explicit Developer 2 path exclusions.                                  |
| `npm run typecheck`                 | Independent pass across backend/frontend/contracts/functions/integration.                                           |
| Formatting                          | Owned files and full allowed-tree formatter pass; verbatim monitor files remain excluded under the existing policy. |

The independent full-run private harness was
`/private/tmp/debugclinic-pr11-browser-verify.py`; its captured output is
`/private/tmp/debugclinic-pr11-independent-browser.log`. It verified standalone
Node 24.22.2, provisioned an owned loopback-only PostgreSQL 17 container, supplied
the same explicit test URL to direct/pooled/test/E2E configuration, applied all
five migrations and seeded synthetic data. It then ran
`npm run test:e2e -- --workers=2 --retries=0` with unique loopback frontend/backend
ports and the fake provider. The container and synthetic data were removed in
`finally`; a subsequent task-prefix Docker inventory found no remaining test
containers. Playwright disposed its servers. Unrelated processes were preserved.

Functional verdict for this CI fixture repair: **pass**. Scoped coding-standards
verdict: **pass**. The helper owns one coherent HTTP boundary, uses the shared
schema and preserves existing assertions. These fixtures demonstrate intercepted
browser orchestration and real local Python execution, not real-cookie/provider
coaching acceptance. The 20 opt-in composed cases were skipped and are not passing
evidence. This review does not override the failed chatbot security verdict.

This is the local checkpoint before pushing the fixture repair. The coordinator
must verify the subsequently updated remote verify/browser jobs and report their
actual run URL/result. Earlier remote failures remain preserved above; local
green results are not represented as an already completed remote rerun.
