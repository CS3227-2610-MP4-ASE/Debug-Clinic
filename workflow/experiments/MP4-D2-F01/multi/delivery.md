# MP4-D2-F01 multi-agent local delivery

Status: deterministic local candidate verified; independent reviews pending.
No final acceptance claim.

## Authority and baseline

The owner invoked the multi experimental condition in chat
`01a1a7fd-dc02-7283-9ec9-9efb83f70873` on 5 November 2026, authorizing local
implementation, tests, meaningful commits, independent reviews and scoped repairs.
No push, PR, merge, deployment, production access or live-provider call is authorized.
The approved package is `agent-eval-reviewed-v1`, snapshot
`597ecf887319e942ad46171bae7349404fbd1d36`; approval provenance and seven immutable
artifact hashes remain in [PackageApproval.md](../../../../docs/features/MP4-D2-F01/PackageApproval.md).
Historical Draft labels are superseded by that approval and this separate
implementation authorization. Approved artifacts remain unchanged.

Common application baseline: `7fe5113e1c0743e648091f46b0661c39d4af1061`.
Both arms verified at preparation commit
`98f0f8de62edbd3a54f0f50f011c7dd6b571ef71` before measured start. The mandatory
verification helper read the other arm only for checkpoint/hash checks; its
implementation, results, branch history and conversation remain out of scope.
Coordinator branch: `royden/f01-multi`, worktree `Debug-Clinic-generate-question-multi`.
Both writers start from the identical preparation commit in separate worktrees.
No remote freshness claim or fetch was needed: the owner explicitly selected this
frozen experimental parent and prohibited external publication.

## Preflight and measurement

- `experiment.py verify`: both exact prep heads, seven approved artifacts and
  frozen dependency lock matched.
- Dated external `agent-eval-reviewed-v1` backup: all seven SHA-256 values matched.
- Common private readiness records: dependencies, generated baseline client and
  contracts, Chromium launch, committed migration and synthetic seed ready for
  both arms. Both owned containers observed running the pinned PostgreSQL image
  `sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b` with
  the experiment ownership label. Only the database ports were listening on the
  checked integration/browser ports. Docker inspection required sandbox elevation;
  the read-only retry succeeded without infrastructure mutation.
- Pinned wrapper observations: Node `v24.14.0`, npm `11.9.0`; Python `3.14.3`.
  All application commands use `experiment.py exec --arm multi -- ...` with fake
  AI, removed inherited external credentials and the owned loopback `_test` DB.
- Actual coordinator session metadata and turn context identify `gpt-6.1-sol`,
  effort `high`. This profile is locked privately for the paired run. Generic
  fresh-context collaboration agents inherit defaults; role TOMLs supply
  instructions rather than a claimed runtime selector.
- Measured start: `2026-11-04T19:19:03.881471+00:00` = 5 November 2026,
  03:19:03.881 SGT, before implementation SDD/source reads or dispatch. Setup and
  automatic host context are excluded from the start boundary and acknowledged
  as exposure gaps. Initial workflow/setup reads used direct tools before the
  reader requirement was established. Subsequent explicit source reads use the
  context reader, except documented allowlist gaps.
- The host opened this fresh chat at the MP4 parent directory rather than the
  packet's requested arm directory. Every feature command explicitly uses the
  multi worktree; both writers also set their assigned workdirs explicitly. This
  is a setup deviation, not a claim of enforced root isolation. Initial discovery
  exposed sibling filenames only; no single-arm implementation or result was read.
- Raw private state: sibling `.workflow-runs/MP4-D2-F01-comparison/multi/`;
  coordinator manifest, profiles, context receipts, checks and monitor remain
  outside Git. Session identities are verified against actual spawn metadata,
  never inferred from role filenames. Per-response metrics cover supported
  schemas; unavailable measurements stay unavailable.
- Root Playwright/Vitest config reads are rejected by the common reader's
  allowlist. Scoped direct reads are recorded as `root-config-allowlist` gaps;
  common instrumentation is preserved. Initial output truncations are journaled
  and recovered through focused ranges. Invalid reader ranges/path attempts are
  setup/retrieval errors, not product failures.
- Shared candidate soft estimates: 7,200 seconds and 5,000,000 observed response
  tokens including cached input across coordinator and both writers. Review,
  repair and monitoring overhead are reported separately. These are warnings,
  not acceptance waivers or per-agent multipliers.

## Ownership and independence

The coordinator owns integration, guides, feature map, ledger, evidence and
monitoring. One implementer owns approved application/shared seams and focused
unit tests. One acceptance author owns new independent `f01-acceptance` HTTP
tests, `tests/integration/f01-*`, `tests/e2e/f01-*`, `tests/support/f01-*` and its
frozen interpretation. Exact scoped packets are retained and journaled as upfront
receipts. No extra builder, guide writer or logger is used.

Acceptance interpretation must be committed before implementation exposure;
the implementer dispatch waits for that freeze. Writers cannot edit each other's
owned paths. Only the coordinator runs database/browser integration serially.
Expected-red writer commits are not promoted as green feature evidence.

Acceptance freeze observed: `778044b4ce9060a3cbff2ca8f2475d4b355197c1`,
`2026-11-04T19:24:33Z`, before implementation dispatch at
`2026-11-04T19:25:17.726Z`. Acceptance session
`01a1a801-8f55-7b40-9c40-ed8b421ec96a` started at `19:20:36.950Z`;
implementer session `01a1a805-d81b-7142-a665-f3f751ac4db3` started at
`19:25:17.726Z`. Both own session metadata verify this coordinator as parent and
their assigned task paths; own turn contexts match `gpt-6.1-sol` / `high`.

Routine contract clarification `module-constructor-spelling` selects
`createInstructorDrafts({prisma,provider,config,logger})` with the four TDD methods
returning full HTTP envelopes. This fixes export spelling only; it changes no
approved behavior or acceptance expectation. Coordinator owns the synthetic
browser composition's injection and packaged-function smoke. No owner product
clarification has occurred.

At 566.7 seconds, the monitor observed 6,124,862 response tokens, including
5,886,464 cached input tokens: the initial shared 5,000,000-token soft estimate
was exceeded. Warning retained; criteria unchanged. Both writers were notified
to narrow subsequent retrieval/output. The estimate remains visible rather than
being silently raised. Token totals are observed supported per-response usage,
not context occupancy, billing or subscription attribution.

## Checkpoints and obligations

Baseline monitor tests: pinned `npm run test:workflow`, exit 0, 36 tests passed.
This verifies instrumentation only, not F01 behavior.

Candidate, independent functional/standards/security verdicts, repairs and exact
integrated checks will be appended after observation. All 13 requirement IDs and
28 RTT behavior groups retain their approved interpretation. Live SoC samples,
held-label evaluator calibration and 11-sample semantic evaluation (B28), human
desktop/mobile accessibility observations (B26), instructor product review and
hosted CI remain pending until actually observed with the required authority.
Synthetic schema acceptance does not prove generated Python semantics.

## Verified candidate slices

Application writer commits, in order: backend `5c5541d3262707d5b28fba33ad28d7b17e4a4e2f`,
JavaScript string-bound repair `6d68891f91b6cc113c05115db593303c4a8a9caf`,
UI `74803bb00ebdd78b9382ee3d8d1aa38b437391b8`, and stored-provenance list-read
validation `ac5e5cd3c4a9a7498f469802d8a050a2472be028`. Independent test commits and
frozen expectations are recorded in [acceptance-handoff.md](acceptance-handoff.md).
Writer-local commands and limitations are in [implementation-handoff.md](implementation-handoff.md).
Compatible application/test slices were combined with `git cherry-pick --no-commit`;
no merge or competing-arm content was used. Only the verified combined result is
committed on this feature branch.

Exact upfront packets are archived as `.txt` with the original receipt hashes.
Their recorded bytes include one final blank line. The staged whitespace check
uses a `blank-at-eof` exception for those two files only; all other staged paths
use the ordinary check. Packet bytes are preserved rather than rewritten after
dispatch. Prettier excludes only immutable snapshots, not new application code.

All commands use the pinned multi wrapper. [verification.json](verification.json)
retains exact argument arrays, timestamps, durations, exit codes and original
failure records; raw logs remain private. Latest integrated outcomes:

| Check                                                     | Observed result                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                            | PASS                                                                                                                                |
| `npm run format:check`                                    | PASS, with narrow immutable-snapshot exclusions                                                                                     |
| `npm run typecheck`                                       | PASS, all workspaces, Functions and integration tests                                                                               |
| `npm test`                                                | 352 PASS in 22 files                                                                                                                |
| `npm run db:validate`                                     | PASS                                                                                                                                |
| `npm run db:deploy`                                       | PASS, only the approved additive migration on owned multi DB                                                                        |
| `npm run test:integration`                                | 162 PASS in 6 files, including 120 independent F01 cases                                                                            |
| `npm run test:e2e -- f01 --workers=1`                     | 24 PASS, desktop/mobile: 22 HTTP doubles and 2 composed cookie/PG flows                                                             |
| `npm run test:e2e -- --workers=1`                         | 100 PASS, 2 opt-in foundation cases skipped                                                                                         |
| `npm run build`                                           | PASS, including declaration emission; bundle-size and dependency annotation warnings retained                                       |
| `node --import tsx scripts/verify-built-frontend.ts`      | PASS, 16 public route/viewport loads plus keyboard/navigation checks                                                                |
| Pinned local Netlify package and extracted artifact smoke | PASS, ESM API v2, cookies, authorization, generation/Save/list/get                                                                  |
| Historical migration observation                          | PASS: one version created at 19:13:58.244Z before migration at 19:38:24.349Z retains all four null additions; read-only observation |
| `npm run build:netlify`                                   | Expected local guard rejection, exit 1: explicit hosted site metadata absent. No hosted build/deployment claimed.                   |

The first complete integrated local green observation is
`2026-11-04T20:01:30.743534+00:00` (42 minutes 26.862 seconds from start), with
manual/live/hosted obligations still pending. It is distinct from the earlier
backend-only green checkpoints and the later committed candidate/reviewed markers.

## Failures and bounded repair

- Independent H/T baseline: 121 expected failures and 29 passes before source
  implementation; the original 150 cases all passed on first integration.
- Full unit first run: 328 passes, two failures. A baseline config assertion
  assumed the synthetic browser flag was unset; explicit tests for both modes
  replaced that assumption. A cold-import timeout passed unchanged on focused
  rerun. The full rerun passed 332; expanded final unit coverage passes 352.
- First real-PG F01 run: 117 passes, two failures. One genuine defect accepted
  surrogate-pair strings above the approved JavaScript length maximum; explicit
  `value.length` checks and focused surrogate cases repaired all F01 bounds in
  one attempt. The other was a test regex excluding valid “specify” guidance;
  the independent author corrected it with a visible rationale. All 119 original
  cases passed on the first repair; the expanded full suite later passed 162.
- First matching browser run: 14 passes, ten failures, five locator groups across
  two viewports. The independent author assessed rendered facts without reading
  implementation. Semantic warning/success/link/field-feedback assertions replaced
  unapproved DOM/text segmentation assumptions. Frozen behavior, denied access,
  editing, persistence and pending-state expectations stayed intact. First repair:
  all 24 pass. Original failures remain in private logs and the author handoff.
- The implementer's final own audit added explicit stored-provenance validation
  to list reads with a focused regression. No wire contract or approved scope changed.
- Initial formatting failures included exact approved/historical snapshots.
  Narrow `.prettierignore` entries preserve those bytes; new code/tests and the
  active ledger were formatted and checked. No approved SDD was rewritten.
- Sandbox Prisma/esbuild/tsx startup errors, the private capture script's console
  encoding, one nonexistent browser-spec invocation and one incorrectly quoted
  artifact path were setup/tool invocation failures. Corrected invocations passed;
  they are retained separately from product defects. No retry bound was exhausted.

## Remaining acceptance obligations

Owner/coordinator: separately authorized live SoC environment, two held-label
calibration fixtures and the complete fixed eleven-sample independent semantic
evaluation under `f01-quality-v1` / `f01-test-agent-v1`, preserving every
FAIL/INCONCLUSIVE. B28 and semantic portions of B03/B06/B07/B10/B25 remain
pending. Generated code is never executed for this evidence.

Human reviewer/owner: named desktop/mobile keyboard, focus, contrast, long-code
and responsive observations for B26, plus instructor product review. Automated
keyboard and viewport assertions supplement these obligations.

Deployment/CI owner: actual hosted Node24 CI and native hosted-build/platform
records. Local packaging proves extracted artifact behavior, not AWS bootstrap
or deployment. No push, merge, PR, deployment, production access or live provider
call has occurred. The two opt-in no-SMTP foundation browser cases were skipped;
the captured-outbox real-cookie auth journeys ran and passed separately.
