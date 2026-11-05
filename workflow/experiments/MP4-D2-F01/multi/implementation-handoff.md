# F01 implementation handoff — multi

Actor: `/root/f01_implementer`, Developer 2 generic agent, fresh context.
Coordinator-observed session `01a1a805-d81b-7142-a665-f3f751ac4db3`,
model `gpt-6.1-sol`, effort `high`; role instructions are not a runtime selector.
Worktree `Debug-Clinic-f01-multi-implementer`; branch
`royden/f01-multi-implementer`; exact base
`98f0f8de62edbd3a54f0f50f011c7dd6b571ef71`.
Package `agent-eval-reviewed-v1`, SDD snapshot
`597ecf887319e942ad46171bae7349404fbd1d36`; all seven approved SHA256
values verified locally against PackageApproval and acceptance-index.
Separate implementation authorization and exact section 6 shared seams supplied
in coordinator dispatch. Approved package and dependency lock unchanged.

## Backend slice

Strict additive contracts cover six fields, generation result/refusal, Save,
provenance, saved projections and uint32 pagination. SoC uses the exact fixed
two-message prompt, bounded streamed envelope/content, one deadline and existing
retry policy. Raw usage outside PostgreSQL Int32 normalizes to null. Existing
hint behavior is unchanged. Fake generation is explicitly identified as fake.

`createInstructorDrafts({prisma,provider,config,logger}): InstructorDrafts` is
exported from `apps/backend/src/exercises/instructor-drafts.ts`. Public methods:
`generate(ownerId,topic)`, `save(ownerId,input)`, `list(ownerId,offset=0)`,
`get(ownerId,id)`. Methods return full HTTP envelopes typed by contracts.
`createApp` accepts optional `instructorDrafts?: InstructorDrafts`; absence
returns 503 for F01 alone. Both production compositions construct the module.
Routes own auth/role/origin/content-type policy. The module owns validation,
fixed safe errors, usage recording, owner projections and atomic Exercise plus
version-1 Save. One additive migration adds four nullable columns, no backfill.

Exact successful commands, all prefixed with
`python workflow/experiments/MP4-D2-F01/experiment.py exec --arm multi --`:

- `npm run prepare` (scoped escalation; offline Prisma generation and contract build).
- `npm test -- packages/contracts/test apps/backend/test/f01-unit-provider.test.ts apps/backend/test/f01-unit-drafts.test.ts apps/backend/test/providers.test.ts apps/backend/test/app.test.ts`: 6 files, 59 tests passed.
- `npm run typecheck -w @debugclinic/backend`: passed.
- `npm run build -w @debugclinic/backend`: passed, declaration emitting.
- `npm exec -- tsc -p tsconfig.functions.json --noEmit`: passed.
- `npm run db:validate`: passed; no database connection/migration.
- Scoped `npm exec -- eslint` on all changed TS source/unit tests with
  `--max-warnings=0`: passed.
- Scoped `npm exec -- prettier --write` on changed TS files; Prisma schema
  formatted with `npm exec -- prisma format --schema prisma/schema.prisma`.

Retained failures/repairs: `npm ci` installed dependencies but sandboxed prepare
failed at tsx `os.userInfo` with `uv_os_get_passwd ENOMEM`. One explicit prepare
retry reproduced this environment failure. Scoped escalation then passed without
code/config/dependency changes. Backend typecheck/build first failed TS4111 on
`request.params.id`; repair 1 used bracket access, then both passed. Netlify
explicit helper read failed its top-level allowlist; journaled context gap and
read the assigned file directly, per coordinator's fallback authorization.

Unit observations cover serialization/context minimization, token normalization,
stream cap/cancellation, hanging body deadline, retry/no-retry distinctions,
strict field bounds, usage-write failures and refusal preservation, server usage
identity, owner association, Save transaction failure, pagination overflow,
invalid stored provenance and route origin/role checks. Database doubles do not
prove rollback/durability; coordinator owns serial real DB execution.

Coverage implemented in backend: FR01–FR08 and NFR01–NFR03; UI-dependent portions
of those requirements and FR09/NFR04 follow in the UI slice. All 28 RTT groups
remain subject to independent evidence; B28 live quality/calibration and human
accessibility/CI are pending and cannot be satisfied by these unit checks.
Acceptance tests/implementation/diffs were not read or changed. No live provider,
DB mutation, push, PR, merge or deployment was performed.

Resource checkpoint: roughly 12 minutes from dispatch through backend static
verification, including dependency setup. Coordinator notified shared observed
token soft-budget overrun; no acceptance criterion was reduced. No own token
telemetry is exposed directly to this agent. Context reads and failures are
journaled in external experiment receipts.

## Backend repair checkpoint

Backend slice commit: `5c5541d3262707d5b28fba33ad28d7b17e4a4e2f`.
Independent coordinator PostgreSQL checks found that installed Zod string maxima
count code points, while the TDD requires JavaScript UTF-16 string length.
Repair 1 replaces F01 topic/prose/code/ID upper bounds with explicit `.length`
refinements. Prose still trims, code remains verbatim. Added surrogate-pair
at/above-bound coverage for topic, IDs and all six fields. Removed an unrequired
model-name bound; the approved model wire type is string or null.

Pinned contract declaration build passed. The same focused/regression test
command now passes 6 files / 60 tests. A second explicit Prettier pass repaired
three call-chain layouts in owned backend files (format-only). Whole-repository
format checking also reports immutable approved SDD and baseline evaluation/
handoff documents, left unchanged. Whole-repository lint passed before this
contract repair; final checks follow the UI slice.

An elevated Git staging attempt encountered the sandbox-created worktree's
different owner. No stage occurred; process-local `safe.directory` for this exact
worktree allowed authorized staging/commit without changing global Git settings.

## UI slice

Backend repair commit: `6d68891f91b6cc113c05115db593303c4a8a9caf`.
The instructor workspace links to the three protected feature routes. The API
library owns credentialed requests, contract validation and safe failure text;
it never automatically replays a POST. Generate accepts a bounded topic, locks
pending actions, displays one complete editable six-field unverified preview,
keeps its topic read-only, and allows explicit private Save. Save failures retain
all edits; success opens a read-only detail with success feedback. New question
clears local state. Unmount invalidates late responses without replay/restoration.
My drafts supports loading, empty/error/retry, fixed-page Load more and read-only
opening. Feature navigation is disabled while pending; ordinary shell navigation
stays available. Prose/code/list titles are React text, never interpreted markup.

Pinned local checks:

- `npm run typecheck -w @debugclinic/frontend`: passed, repeated after Unicode repair.
- `npm run build -w @debugclinic/frontend`: passed (dependency annotation and
  bundle-size advisory warnings only).
- Scoped frontend `npm exec -- eslint ... --max-warnings=0`: passed.
- `npm run lint`: whole repository passed.
- Scoped `npm exec -- prettier --check` of every owned F01 TS/TSX source/unit
  file: passed after the second focused backend formatting pass.
- Backend no-emit and declaration builds repeated after Unicode repair: passed.

Whole `npm run format:check` failed on three subsequently corrected owned files
and immutable approved SDD/historical planning records. Coordinator owns narrow
immutable-artifact exclusions and final integrated formatting. No approved bytes
were reformatted here. No UI-specific source check remains failing.

The source now covers all 13 PRD IDs. Independent HTTP/provider/PostgreSQL
observations are coordinator-owned: coordinator reported 150 H/T passes and,
after Unicode repair, 119/119 PG passes. Those are relayed observations, not runs
performed in this writer worktree. Browser/packaged application verification,
independent functional/standards/security reviews, human desktop/mobile
accessibility, CI and B28 calibrated live-provider quality remain pending in this
handoff. Static builds do not establish those behaviors. No acceptance source or
diff was read and no acceptance expectation was changed.

Resource checkpoint: approximately 20 minutes since dispatch including setup,
one validation repair and static builds. No dependency wait blocked UI work;
coordinator independently integrated/checked the backend while UI proceeded.

## Final provenance read check

UI slice commit: `74803bb00ebdd78b9382ee3d8d1aa38b437391b8`.
Own-source audit found that list selected topic but did not validate stored
provenance, despite the TDD's read-validation rule. List now explicitly selects
and validates provenance before returning the unchanged four-field summary;
malformed stored provenance yields fixed safe 503, never internal JSON. Detail
already validates provenance and retains its safe404 behavior. Added a focused
public-module unit case for summary privacy and malformed stored provenance.
Pinned focused/regression command passes 6 files / 61 tests; backend declaration
build, scoped ESLint and scoped Prettier check pass. No acceptance edits or reads.
