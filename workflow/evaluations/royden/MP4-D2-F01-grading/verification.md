# Grading verification checkpoint

The verified implementation is `f7ed08b73dfcff05b9bca009b880ca202f089589` on
`royden/mp4-d2-f01-grading`, based on approved snapshot `d4b6f29` and master parent
`e244e3e`. Checks ran on Windows with Node 24.14.0 and npm 11.9.0. Persistence
checks used task-owned PostgreSQL 18.6 on loopback with separate synthetic build
and acceptance databases. Full integration used a seeded UTC database.

## Observed results

| Lane               | Command                                                                                                                                                                                | Result                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Production build   | `npm run build` with explicit offline Prisma generation URL                                                                                                                            | Pass, including declaration-emitting contract/backend builds and Vite.                                    |
| TypeScript         | `npm run typecheck`                                                                                                                                                                    | Pass, including functions and integration configurations.                                                 |
| Root deterministic | `npm test`                                                                                                                                                                             | 551 passed in 32 files.                                                                                   |
| Frontend unit      | `npm test -w @debugclinic/frontend`                                                                                                                                                    | 19 passed in 5 files.                                                                                     |
| Real database      | `npm run test:integration` with verified matching test URLs                                                                                                                            | 213 passed in 16 files.                                                                                   |
| Ordinary browser   | `npm run test:e2e -- --workers=3 --reporter=list,json --max-failures=3` with database variables and auth opt-ins unset                                                                 | 234 passed, 30 expected opt-in skips, zero flaky or unexpected results.                                   |
| Composed browser   | `npm run test:e2e -- tests/e2e/grading-composed.spec.ts tests/e2e/learner-workspace-composed.spec.ts tests/e2e/f02-composed.spec.ts --workers=1 --reporter=list,json --max-failures=2` | 16 passed across desktop/mobile with real cookies, local PostgreSQL and synthetic provider configuration. |
| Emitted assets     | `node --import tsx scripts/verify-built-frontend.ts`                                                                                                                                   | 16 public route/viewport loads and desktop/mobile keyboard, focus and role-choice checks passed.          |
| Packaged handler   | Pinned Netlify CLI 27.16.1 packager, then `node --import tsx scripts/verify-netlify-artifact.ts <extracted-api.mjs>`                                                                   | Extracted ESM handler smoke passed, including grading.                                                    |

The ordinary and composed browser counts are separate runs. Composed cases were
explicitly skipped in the ordinary run and executed in their own database lane.
Build and transport-double checks supply different evidence from PostgreSQL and
real-cookie browser checks.

## Requirement evidence

| Requirements and criteria | Observed boundary                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GRD-FR-01, AC01–03        | Real owned queues, existing/new finals, grade membership, oldest/newest ordering and cursor cases in H01/H02. Browser dashboard and continuation recovery in P01/C01.                                                                                                  |
| GRD-FR-02, AC04–05        | Exact submitted code/reasoning/context and display-name projection, archived access and grading through H01/H06 and C01/C02.                                                                                                                                           |
| GRD-FR-03, AC06–08        | Scores 1 and 10, invalid input, pending versus confirmed grade, correction and immutable snapshot through H03, P02 and C01.                                                                                                                                            |
| GRD-FR-04, AC09–10        | Real racing saves and stale revisions in H04. The browser preserves the entered score and requires deliberate conflict review in P03.                                                                                                                                  |
| GRD-FR-05, AC11–14        | Definitive rejection, missing/malformed/inconsistent replies and GET-only reconciliation in P04/C03. H05 drops actual PostgreSQL BEGIN and COMMIT acknowledgements. A lost COMMIT reply yields UNKNOWN while a healthy authorized read confirms score 8 at revision 1. |
| GRD-FR-06, AC15–17        | Private status-only learner list and matching immutable result across live and archived questions in H02/H06 and C01/C02.                                                                                                                                              |
| GRD-FR-07, AC18–21        | Current results on reopening in C01, unavailable/stale recovery in P06, and real active-view timing in C04. H07 separately checks normal-limit shared-IP quota isolation.                                                                                              |
| GRD-NFR-01, AC22–23       | Cookie/role/ownership denials and projection checks in H06. Peer sign-out, held replies, expiry, alternate actor and restored-page disposal in P07.                                                                                                                    |
| GRD-NFR-02, AC24–25       | Automated desktop/mobile keyboard, accessible names, live-region and focus assertions passed. Manual screen-reader announcements and measured contrast remain pending.                                                                                                 |
| GRD-NFR-03, AC26–27       | Existing learner workspace, Python IDE, publication, removal and attempt recovery checks passed in ordinary and composed lanes. The migration preserved a synthetic pre-feature archived final and legacy review.                                                      |

The C04 timing evidence contains twelve observations, covering first grade and
correction on each of three learner entry points across two viewport projects.
The conservative pre-forward-write to rendered-result bounds ranged from
5,110.0 to 5,481.5 milliseconds. All were within 15 seconds with visible learner
documents and no focus, online or manual-refresh triggers. The measurements and
diagnostic commit-response intervals are preserved separately. [Timing data](timing.json)

## Repairs and boundaries

Independent review led to the targeted source and test fixes recorded in the
review report. The initial recovery run had four failed cases, then the repaired
focused run passed 14/14. The privacy run passed 6/6. The final ordinary run
includes those repaired cases. [Review report](review.md)

The first broad PostgreSQL run used an unseeded local-timezone database. Seeding
and setting the disposable database to UTC resolved the auth fixture and quota
failures. The remaining old migration test failure was reproduced on the
unchanged baseline under PostgreSQL 18. Its assertion now accepts both observed
referential-integrity codes and verifies that the attempt/review records survive.
An older publication browser assertion was aligned with the already-delivered
learner hint button. The packaged smoke's obsolete wrong-role probe was moved to
the existing learner dashboard route before a successful rerun.

The first interrupted composed run's final terminal result could not be
recovered. The coordinator verified its owned listeners had ended, retained the
failure artifacts, and reran the final suite with persistent JSON and text
reports. The successful final runs are recorded in private runtime logs under
the MP4 sibling `.workflow-runs/MP4-D2-F01-grading/runtime/`. Only the sanitized
observations above and timing data belong in Git.

Manual screen-reader/contrast checks, an actual browser BFCache round trip,
PostgreSQL 17 CI, remote CI and deployed load remain unobserved. The restored-page
tests use synthetic persisted lifecycle events. Local packaging exercises the
extracted application handler. Hosted platform behavior requires its own run.
