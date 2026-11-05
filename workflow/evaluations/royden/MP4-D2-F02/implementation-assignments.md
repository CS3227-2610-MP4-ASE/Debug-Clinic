# F02 implementation assignments

Date: 2026-11-06, Asia/Singapore. Coordinator: `/root`, Developer 2 / Royden.

The owner explicitly authorized implementation of MP4-D2-F02 against the approved
package, selection of single/parallel builders, local branches/worktrees,
incremental commits, monitoring, required verification, independent reviews,
routine repairs, guides, ledger, reflections and verified handoff. Push, merge and
deployment need separate authorization. The repository runbook also reserves PR
publication. Historical absent-authorization labels in frozen package files are
superseded by this request; their bytes remain immutable.

Approved snapshot: `11b0999d7ae530d154634a0e36d4a809fa6d8062`, parent
`982b0641cd45bf8184bca8e623c36b611af9d898`. Package approval binds TDD section 2
shared-file requests and seams F02-S1–S5. No changed interface is authorized.

## Topology and ownership

Two builders own disjoint vertical surfaces. Both derive meaningful tests from
the complete approved package. No separate acceptance-test author is assigned;
no claim of blind independent test authorship is made. Independent reviews follow
integration and do not substitute for required verification.

| Role / actual identity                    | Branch / worktree                                               | Exclusive writes                                                                                                                         | Estimate / checkpoint                                              |
| ----------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Backend implementer `/root/f02_backend`   | `royden/f02-backend`, sibling `Debug-Clinic-f02-backend`        | Backend source/tests; contracts source/tests; schema/new migration; Netlify composition; F02 real-PG integration test                    | 45 active minutes / 3M observed tokens; checkpoint 15 minutes / 1M |
| Frontend implementer `/root/f02_frontend` | `royden/f02-frontend`, sibling `Debug-Clinic-f02-frontend`      | Frontend source; F02 browser specs; superseded assertions in F01 intercepted instructor spec                                             | 45 active minutes / 3M observed tokens; checkpoint 15 minutes / 1M |
| Coordinator `/root`                       | `royden/mp4-d2-f02-publish-question`, existing feature worktree | Integration, scripts/fixture composition, F01 composed assertion updates, product/guides/feature map, ledger/logs/reflections/evaluation | 2 hours / 5M observed tokens; checkpoint 30 minutes / 2M           |

Actual dispatch: `collaboration.spawn_agent`, `fork_turns=none`, generic agents
with scoped fresh role packets and repository role instructions. No named runtime
selector or enforced sandbox is claimed. Both child branches start at the exact
approved snapshot. Coordinator owns monitor events. Private explicit-session
manifest/state: sibling `.workflow-runs/MP4-D2-F02/implementation/`. Planning state
is retained separately. Initial phase soft checkpoint: 3 hours / 12M observed
response tokens, including cached input; estimates are not billing or quota.

Backend publishes exact approved contract names before frontend consumers.
Frontend exclusively reserves local browser ports 3001/5173 until released.
Coordinator owns disposable PostgreSQL17 container `debugclinic-f02-20261106`,
bound only to loopback port 55432, database `debugclinic_f02_test`, synthetic data.
Every connected command must verify explicit matching target URLs and database
identity. No external provider credentials or real user data are used.

At verification failures retain evidence, diagnose one cause and make at most
three meaningful repair attempts for that failure. Independent review permits at
most two targeted repair/review rounds. Changed requirements, unapproved shared
interfaces, essential unavailable access and exhausted recovery escalate. Routine
fixes and explicit-path meaningful local commits proceed autonomously.

## Initial environment checkpoint

PATH selected Node22/npm10; installed Node24.14.0 exists at
`C:/Program Files/nodejs/node.exe`. Verification explicitly prefixes that directory.
The three new worktrees initially have no dependencies; offline `npm ci` is being
provisioned separately per worktree. Docker engine 28.4.0 is available through the
approved escalated tool; sandbox-only engine access was denied. No product
verification has passed at this initial checkpoint.
