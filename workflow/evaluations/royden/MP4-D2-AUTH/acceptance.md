# Authentication local acceptance

Application checkpoint: `a1645b9d42ccaed896bf94ba571713dbd9eb6a41`, branch
`royden/auth-completion`. Node24.14.0/npm11.9.0, owned PostgreSQL16.15 target
`127.0.0.1:55434/auth_completion_test`, frontend/auth origin
`http://127.0.0.1:5173`. The four approved R2 artifact hashes remain unchanged.
Functional, standards and security reviews independently pass at this checkpoint.

Coordinator final integrated results, separate from earlier writer-local runs:

| Check                                                      | Final result                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm test`                                                 | 142/142, 15 files                                                         |
| `npm run test:integration`                                 | 42/42, five files, explicit isolated target                               |
| Completion browser spec, `E2E_AUTH_COMPLETION=1`, workers1 | 10/10, desktop/Pixel7                                                     |
| Default browser feedback/regression, workers2              | 58 passed, 12 explicit opt-in skips                                       |
| Full lint, typecheck, formatting                           | Pass                                                                      |
| `npm run build`, explicit `NODE_ENV=production`            | Pass, including Prisma generation and declarations                        |
| `node --import tsx scripts/verify-built-frontend.ts`       | 16 exact public route/viewport loads plus deep keyboard/focus checks pass |
| Actual ZIP/extracted application Web-handler smoke         | All checks pass                                                           |
| Existing workflow regression suite                         | 34/34 pass; machinery unchanged                                           |

BW uses real local HTTP/cookies/PostgreSQL and private captured email, with no
browser interception. Google authorization is controller-substituted; exchange/profile
boundaries use typed doubles. BF deliberately intercepts failure/order responses.
The built-file check uses only an anonymous local API stub. These are distinct
evidence layers; none proves live Google authorization or SMTP receipt.

## Criteria assessed

This is complementary local coverage of all34 criteria, accepted by the independent
functional reviewer. It is not a claim that every catalog permutation was separately
executed. Case IDs refer to the immutable approved test interpretation; actual
tests are under `apps/backend/test`, `tests/integration` and `tests/e2e`.

| Criterion   | Evidence assessed                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| AUTH-01-AC1 | M01 dated diagnostic record, identified environment and actual readiness checks                           |
| AUTH-01-AC2 | Failure categories, private exception regressions and explicit unknown production causes                  |
| AUTH-01-AC3 | Q01 strict pre-client targets, pooled/direct equality and real isolated runtime; live acceptance deferred |
| AUTH-02-AC1 | N01 corpus, normalized HTTP ingress and stock Google mapper                                               |
| AUTH-02-AC2 | N03/L04 deliberate multi-client races, winning role/password and committed uniqueness                     |
| AUTH-02-AC3 | N04 collision abort, transactional rollback, stable user/account ownership                                |
| AUTH-03-AC1 | P01 unselected controls and direct invalid/missing-role rejection                                         |
| AUTH-03-AC2 | P02/G01 both roles through password and Google-controller journeys                                        |
| AUTH-03-AC3 | P03 role preservation across duplicate/login/profile/recovery/Google flows                                |
| AUTH-03-AC4 | Public role copy and browser assertions                                                                   |
| AUTH-04-AC1 | L01 real-handler verified password-to-Google association                                                  |
| AUTH-04-AC2 | L02 Google-first recovery/password login/subsequent Google access                                         |
| AUTH-04-AC3 | L03 ownership rejection and actual provider-exception containment                                         |
| AUTH-04-AC4 | L04 association races, binding preservation and bypass denial                                             |
| AUTH-05-AC1 | P02 valid both-role registration, input rejection and verification-dependent outcome                      |
| AUTH-05-AC2 | P04 correct/wrong/pending/Google-only credential outcomes                                                 |
| AUTH-05-AC3 | P03 duplicate identity/password/role preservation and synthetic-response UI denial                        |
| AUTH-06-AC1 | V01 BW verification-pending guidance and reachable resend                                                 |
| AUTH-06-AC2 | V02 valid/altered/expired/idempotently reused signed links                                                |
| AUTH-06-AC3 | V03 uniform anonymous/authenticated resend matrix, including delivery throws                              |
| AUTH-06-AC4 | V03/F01 truthful acceptance copy and retry                                                                |
| AUTH-07-AC1 | R01 non-enumerating recovery and configuration-failure matrix                                             |
| AUTH-07-AC2 | R02 replacement/establishment 11/12/128/129 boundaries and preserved rejected state                       |
| AUTH-07-AC3 | R03 expired/reused tokens, atomic consume races and transaction rollback                                  |
| AUTH-07-AC4 | R04 multi-session revocation, old/new passwords and retained Google binding                               |
| AUTH-08-AC1 | G01/P03 both initial roles and immutable returning role                                                   |
| AUTH-08-AC2 | G02/G03 signed intent, atomic claims, direct/proxy races/replay and actual role substitution              |
| AUTH-08-AC3 | G04 authorized completion and fixed recoverable direct/proxy failure destinations                         |
| AUTH-09-AC1 | S01 real restore/missing/revoked access and server role denial                                            |
| AUTH-09-AC2 | S02 real logout and intercepted stale-response suppression                                                |
| AUTH-09-AC3 | S03 truthful failed logout/restore and retry                                                              |
| AUTH-10-AC1 | F01 six-action typed/unknown/network failure and retry matrices                                           |
| AUTH-10-AC2 | F02 duplicate locks, semantic progress and accurate next steps                                            |
| AUTH-10-AC3 | F03/F04 safe diagnostics/messages, token history/referrer and focused feedback                            |

## Boundaries, retained failures and cleanup

Unclaimed catalog details include a separate password-to-Google BW journey,
exhaustive malformed-state/start-host combinations, explicit expired-session UI
permutation, and domain-related-data sentinel/rollback-rehearsal specifics. Core
invariants have complementary source and real handler/database evidence. Human
auditory screen-reader behavior was not tested; actual keyboard/focus and semantic
alert/status behavior were observed. This is not a blanket accessibility certification.

The initial root unit run had a worker exit at117/126; the unchanged rerun passed126/126,
and the final post-repair run passed142/142. The original log remains. Other failures
and their repairs, including bundle initialization, cookie-header ordering, resend
status, session completion and independent-review findings, remain in the implementation
and review records. No expectation was weakened and no approved artifact was rewritten.

Final retained ZIP:
`.netlify/node_modules/auth-smoke-815fb3cf-c6a4-47a8-bac9-fb1fa3d803fc/api.zip`;
SHA256 `43ab4fa6d7bb58212e2649d061e2779bfea073e27c9001fc00e1d13b99b27f1b`.
The smoke imports its extracted application Web handler, not AWS bootstrap.
Raw verification logs are outside Git under the private feature run directory;
packages and stopped disposable data remain ignored. Owned PG55434 was verified
by PID/data directory/port and stopped; app/preview ports3001/5173/5174 are clear.
The pre-existing PostgreSQL service was not targeted.

Live Google, SMTP receipt, CI and deployed readiness remain Dev1/deployment-owner
checks. Production readiness503 has an unknown cause. No push, merge, deployment
or production mutation was performed or authorized by this local delivery.
