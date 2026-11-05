# MP4-D2-F02 — Technical Design Document

**TDD v1 · Draft — awaiting independent package review and human package approval**  
**Workstream:** Developer 2 · **Owner:** Royden · **Date:** 2026-11-06 (Asia/Singapore).  
Public test seams are proposed for package approval. Implementation authorization is absent.

## 1. Authority and baseline

The complete [PRD v1](PRD.md), SHA-256 `f04089ad7555a61dabdd71645d0cf0e4f309fdd321cd609beef91841930b2b1c`, is approved under PRD-APPROVAL-01 by the owner's exact reply “approve”, including R1–R3. Its historical draft header is superseded by external provenance; preserve its bytes. Read it with the owner-approved [PRD clarification v1](PRDClarifications.md), SHA-256 `29bdcd79308625388410c923fc8b4ff1c2bd85b916e77ba10d91100dd1ca044e`, which explicitly narrows FR-04.AC1–AC2 for legacy unbound previews. [ApprovalRecord](ApprovalRecord.md) read for this design has SHA-256 `7c58ee0959ce3828b4e00b1232c01ba917ce25dd892cf0c63830ce4c359c2fab`. This releases the legacy-topic blocker; no owner intent blocker remains.

Other frozen inputs: [Mission Brief v4](../../mission-brief/MP4-D2-F02-publish-question.md), SHA-256 `8926bd04749633665d208065dbb94dc7cd101e413d67fef596efae092e4c5487`; [GrillingDecisions](GrillingDecisions.md), SHA-256 `4a11740c585617e876dca6d8701a15036ff3576c35e7561ff777e2d31a732b81`. [AGENTS.md](../../../AGENTS.md), [runbook](../../../workflow/agents/README.md), [coding standards](../../CodingStandards.md), and [ADR 003](../../../workflow/zhenghao/decisions/003-netlify-express.md) govern delivery. No CONTEXT.md or ADR-named file appeared in the permitted source inventory.

Source baseline is worktree `Debug-Clinic-publish-question`, branch `royden/mp4-d2-f02-publish-question`, base/HEAD `982b0641cd45bf8184bca8e623c36b611af9d898`, eventual PR target `master`. Source inspection corroborates [grounding](../../../workflow/evaluations/royden/MP4-D2-F02/grounding.md); it is not runtime evidence. F01 generates an editable unsaved preview, then creates a fresh private Exercise/Python version 1 per explicit Save. Its saved DTO status is literally DRAFT. Saved UI is read-only; publication/updates/learner browsing are absent. ExerciseStatus already has DRAFT, VERIFIED, PUBLISHED, ARCHIVED; publication requires publishedAt. Attempts restrict deletion of referenced versions.

F02 preserves all 18 PRD requirements/51 acceptance IDs. It adds six-field same-draft editing, both publication paths with the explicit legacy exception, own state management, immutable publication, archive removal, and learner allowlist views. No AI/provider calls, Python execution, queue/cache/general workflow framework, attempts, grading or functional hints are added. VERIFIED is neither a publication prerequisite nor an F02 management state. SCOPE-AMENDMENT-01 supersedes the three-approved-hints gate for F02: Publish never checks/creates hints. Question immutability does not freeze Developer 1's future hint lifecycle.

## 2. Deep modules and proposed ownership

Keep `InstructorDrafts`' existing generate/save/list/get interface and literal-DRAFT wire contracts. Add a deep `InstructorQuestions` module at `apps/backend/src/exercises/instructor-questions.ts`, hiding ownership, fixed-topic checks, transactions, CAS, replay and projections behind this interface:

```ts
interface InstructorQuestions {
  listOwner(ownerId: string, query: OwnerQuestionListQuery): Promise<OwnerQuestionListResponse>;
  getOwner(ownerId: string, id: string): Promise<OwnerQuestionResponse>;
  saveChanges(ownerId: string, id: string, input: SaveQuestionChangesRequest): Promise<OwnerQuestionResponse>;
  publish(ownerId: string, input: PublishQuestionRequest): Promise<PublishQuestionResponse>;
  remove(ownerId: string, id: string, input: RemoveQuestionRequest): Promise<OwnerQuestionResponse>;
  listPublished(query: PublishedQuestionListQuery): Promise<PublishedQuestionListResponse>;
  getPublished(id: string): Promise<PublishedQuestionResponse>;
}
```

Factory options are the existing typed Prisma client and safe logger, explicitly exported for declaration builds. No public repository/transaction collaborator is introduced solely for mocking. Express supplies principal identity from session and enforces role; no JSON author/status/time/provider metadata is trusted. The module checks ownership/current state again in write predicates and exposes only complete eligible Python version1 records. Learner methods return only current PUBLISHED data. The Postgres implementation is the sole persistence adapter.

`InstructorDrafts` retains provider/refusal/usage handling and deliberate fresh Save creation; only future generation-topic binding and its Save check are added. Share a small server-private digest helper with `InstructorQuestions`, while shared wire validation stays in contracts. Do not copy provider policy into publication.

`createApp` gains optional `instructorQuestions?: InstructorQuestions`, matching the existing drafts seam; missing composition returns safe 503. **Both** `apps/backend/src/server.ts` and `netlify/functions/api.ts` instantiate it using their existing Prisma/logger. Keep auth mounted before body parsing, Origin/JSON guards, cookie policy, thin Web adapter and existing rate policy. Frontend `lib/instructor-questions.ts` owns typed fetch/parsing/errors; pages own rendering/editor state. A focused editor/discard hook shares actual preview/saved behavior, not a generalized framework.

### Exact shared-file requests before implementation

No edit below is authorized by this draft. Coordinator must record ownership approval before dependent shared edits; package approval proposes these changes, and separate implementation authorization remains required.

| Path / proposed owner | Current → proposed contract; compatibility/checks |
| --- | --- |
| `packages/contracts/src/index.ts` / shared contracts owner | Preserve all F01 names/literal DRAFT shapes. Add separate F02 DTOs/requests, CONFLICT and optional error mutationOutcome; add PostgreSQL-text representability refinements to question strings as described below. Old/new consumer contract tests and strict-input/privacy cases. |
| `prisma/schema.prisma`; new `prisma/migrations/<timestamp>_f02_publication/migration.sql` / database owner | Add revision/key/archive timestamp/topic digest and constraints in §5; no applied migration rewrite. Real-PG rehearsal, old data preservation, races/rollback/reference retention. |
| `apps/backend/src/app.ts`, `server.ts`; `netlify/functions/api.ts` / repository owner | New dependency/routes and both compositions; preserve auth/F01/adapter behavior. HTTP, declaration build and extracted-package checks. |
| `apps/backend/src/exercises/instructor-drafts.ts` / F01 owner | Future digest recording/check only; retain fresh-per-Save, legacy instructor-reported association, safe errors and provider behavior. F01 regression checks. |
| `apps/backend/src/exercises/instructor-questions.ts`; focused private digest helper / Developer 2 | New deep module implementing §3–6; public interface/HTTP tests with real PG. |
| `apps/frontend/src/App.tsx`, `main.tsx`, `components/AppShell.tsx`, `auth/RoleRoute.tsx`, `auth/AuthProvider.tsx` if expiry notification requires it; existing instructor pages/lib / shared UI owner | New routes/navigation, editor, discard interception, admitted-editor expiry handling and router composition in §7. Preserve initial route/auth protection; update only explicitly superseded F01 UI assertions. |
| Proposed `pages/InstructorQuestionsPage.tsx`, `InstructorQuestionPage.tsx`, `PublishedQuestionsPage.tsx`, `PublishedQuestionPage.tsx`, `lib/instructor-questions.ts`, focused editor/discard hook / Developer 2 | Own-state and learner views; no Dev1 hint API. Browser desktop/mobile/focus/retry checks. |
| `PRODUCT.md` / product owner | Amend each unconditional “exactly three approved, ordered hint stages before publication” rule to record F02's no-hint publication exception and Dev1 hint ownership; retain human review/other principles. No universal future hint policy. |
| `docs/DeveloperGuide.md`, `docs/UserGuide.md`, `workflow/agents/FEATURE_MAP.md` / later guide writers | Update from verified implementation only, including new routes, legacy fallback, retry/discard and evidence. Align DeveloperGuide's unconditional three-hint service gate with F02 exception. |
| `.prettierignore` / repository workflow owner; exact human package decision before edit | Following existing F01 precedent, exempt only these verbatim F02 snapshot paths: `docs/mission-brief/MP4-D2-F02-publish-question.md`; `docs/features/MP4-D2-F02/GrillingDecisions.md`; `docs/features/MP4-D2-F02/PRD.md`; `docs/features/MP4-D2-F02/PRDClarifications.md`; `docs/features/MP4-D2-F02/ApprovalRecord.md`; `docs/features/MP4-D2-F02/TDD.md`; `docs/features/MP4-D2-F02/RequirementsToTests.md`; `docs/features/MP4-D2-F02/PackageReview.md`; `docs/features/MP4-D2-F02/SecurityReview.md`; `docs/features/MP4-D2-F02/PackageApproval.md`. If committed as verbatim generated monitor outputs, also exempt only `workflow/evaluations/royden/MP4-D2-F02/report.json` and `workflow/evaluations/royden/MP4-D2-F02/report.md`. No directory-wide ignore. Preserve approved/frozen hashes; verify exact ignore matches and an unrelated-file negative control. Mutable coordinator evidence remains formatted separately. |
| Test paths in §9; `scripts/verify-netlify-artifact.ts`; `tests/support/browser-auth-server.ts` if fixture composition needs it / assigned test owners | Frozen acceptance interpretation before implementation diff when independent author used; extend packaged publication smoke and fixture composition; no mock-Prisma concurrency proof. |

Minimal Developer 1 public-contract handoff, through coordinator only: learner list/detail paths and allowed fields in §3; retained question/version identity on archive; future retrieval filters PUBLISHED; no hints/prerequisite rows; disabled Get Hint/Coming soon only; Dev1 owns functional hints and coordinates shared-contract changes. Do not send private SDD or invent a hint endpoint. No messages to Developer 1 are sent by this writer.

## 3. Wire contracts and validation

New request objects are strict Zod objects; share existing schemas/refinements, not duplicated numeric policy. Normalization: trim topic/title/problemStatement/expectedBehavior/bugExplanation, require nonempty; preserve buggyCode/correctedSolution verbatim, reject whitespace-only. UTF-16 maxima: topic 300, title 120, problemStatement 2000, expectedBehavior 1500, bugExplanation 2000, buggyCode 4000, correctedSolution 4000. Explicit `.length` checks are required because installed Zod string limits count code points. A surrogate pair consumes two units. No syntax/semantic execution. Parse once before compare/write; render/persist canonical prose and verbatim code.

PostgreSQL text also requires representable Unicode: reject U+0000 and unpaired UTF-16 high/low surrogates in topic and all six fields **before** UTF-8 hashing or database mutation. Valid surrogate pairs remain accepted and count two units. Put this storage-validity refinement in the shared question string helpers, preserving F01 DTO shapes, normal inputs and all numerical maxima; this is an explicit rejection of values PostgreSQL cannot persist, not a new pedagogical/topic restriction. Direct Save/Publish returns field-specific400 BAD_REQUEST/NOT_APPLIED, retaining every entry. Rejected malformed topic never reaches digest computation (avoids UTF-8 replacement-character collisions). Provider output containing these values follows existing invalid-output failure handling, with no content logging. A conclusive SQL representation rejection/confirmed rollback is NOT_APPLIED, never UNKNOWN solely because storage failed. Test NUL, lone high surrogate, lone low surrogate and valid pair separately at HTTP/schema seams, including no partial publication.

Reuse DraftId 1–128 UTF-16 units and decimal offset grammar 0–4,294,967,295. Revision is integer 0–2,147,483,647 (Prisma/PostgreSQL Int); successful Save/initial saved Publish increments once. At max reject before writes with conflict/support guidance; never wrap. previewKey is a canonical lowercase UUID string, one cryptographically random browser UUID per preview workflow, an idempotency identifier rather than authentication. No provider limits are introduced. New datetime fields use existing ISO datetime schema and millisecond UTC serialization.

```ts
SaveQuestionChangesRequest = { expectedRevision: Revision; topic: QuestionTopic; draft: QuestionFields };
PublishQuestionRequest =
  | { source: 'preview'; previewKey: UUID; generationId: DraftId; topic: QuestionTopic;
      draft: QuestionFields; reviewConfirmed: true }
  | { source: 'saved'; id: DraftId; expectedRevision: Revision; topic: QuestionTopic;
      draft: QuestionFields; reviewConfirmed: true };
RemoveQuestionRequest = { confirmed: true };
OwnerQuestion = QuestionFields & {
  id: DraftId; versionId: DraftId; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  topic: QuestionTopic; provenance: DraftProvenance; revision: Revision;
  createdAt: ISODateTime; publishedAt: ISODateTime | null; archivedAt: ISODateTime | null;
};
OwnerQuestionResponse = { question: OwnerQuestion };
PublishQuestionResponse = { question: OwnerQuestion; outcome: 'published' | 'existing' };
OwnerQuestionListQuery = { status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; offset?: DecimalOffset };
OwnerQuestionListResponse = {
  questions: Array<{ id; title; topic; status; createdAt; publishedAt; archivedAt }>;
  nextOffset: Offset | null;
};
PublishedQuestionSummary = { id; title; topic; instructorName; publishedAt: ISODateTime };
PublishedQuestionListResponse = { questions: PublishedQuestionSummary[]; nextOffset: Offset | null };
PublishedQuestion = PublishedQuestionSummary & { versionId: DraftId; problemStatement; buggyCode; expectedBehavior };
PublishedQuestionResponse = { question: PublishedQuestion };
```

Shorthand fields use their corresponding existing validated scalar. instructorName is nonempty persisted User.name, not email/client input. Lists have maximum 50. Owner state refinements: DRAFT times null; PUBLISHED publishedAt nonnull/archivedAt null; ARCHIVED both nonnull. Learner DTOs are strict explicit allowlists, constructed by selection rather than spreading/removing owner properties. Never return explanation, solution, generation provenance/provider, hints, attempts or author email to learners. versionId is a stable public identity, not access permission.

| Method/path | Role and response |
| --- | --- |
| Existing F01 generate and POST/GET `/api/v1/instructor/drafts[/:id]` | Preserve F01 INSTRUCTOR contracts; non-DRAFT detail still404. |
| GET `/api/v1/instructor/questions?status=DRAFT&offset=0` | INSTRUCTOR own state list200; status required, strict query. |
| GET `/api/v1/instructor/questions/:id` | INSTRUCTOR own eligible full record200. |
| PATCH `/api/v1/instructor/questions/:id` | INSTRUCTOR SaveQuestionChangesRequest → owner record200. |
| POST `/api/v1/instructor/questions/publish` | INSTRUCTOR discriminated request → PublishQuestionResponse200, initial/replay. Register fixed routes before conflicting parameter routes. |
| POST `/api/v1/instructor/questions/:id/remove` | INSTRUCTOR confirmed request → ARCHIVED owner record200, including repeat. |
| GET `/api/v1/learner/questions?offset=0` | LEARNER published list200, no course/enrollment restriction. |
| GET `/api/v1/learner/questions/:id` | LEARNER currently published allowlist detail200. |

Every mutation requires session/role/allowed configured Origin/application-json; no client-side guard authorizes it. Unknown extra properties fail. GETs never mutate. Missing/foreign/ineligible detail is indistinguishable404; wrong role403, unauthenticated401. Keep Express JSON `64kb` byte envelope: malformed JSON400 and oversize413 BAD_REQUEST. Combined valid field values may exceed that inherited byte limit; test each exact maximum with otherwise ordinary input, plus raw byte overflow separately. Storage representability failure must remain safe/atomic; no promise of arbitrary Python correctness follows validation.

### Error and completion grammar

Retain `{error:{code,message,requestId,details?}}`; add optional `error.mutationOutcome: 'NOT_APPLIED' | 'UNKNOWN'` and CONFLICT enum code for409. Old consumers remain compatible; new F02 client interprets the optional field. Validation details contain field paths/guidance, never values.

| Status/code | Product mapping / outcome |
| --- | --- |
|400 BAD_REQUEST|Invalid fields/confirmation/topic/generation reference: identify safe fields, retain edits, NOT_APPLIED. Legacy unbound direct Publish: “This older preview cannot be published directly. Save draft and reopen it to publish, or generate a new question.” No question is created.|
|401 UNAUTHENTICATED|Sign-in guidance; stop automatic actions, preserve current page until accepted navigation; NOT_APPLIED for denied request.|
|403 FORBIDDEN;404 NOT_FOUND|Safe denial/unavailable without ownership detail; no change, NOT_APPLIED. Learner unavailable view has return-to-list.|
|409 CONFLICT|“This draft changed. Reload to review the latest version.” or “This question is no longer editable/removable. Reload its current state.” Retain edits, discard consent before reload; NOT_APPLIED.|
|429 RATE_LIMITED|Existing safe retry guidance; NOT_APPLIED when denied before execution; no automatic mutation retry.|
|503 DEPENDENCY_UNAVAILABLE|Confirmed rollback/preflight failure: safe retained-edits/retry guidance and NOT_APPLIED. Only use this certainty if abort/rollback is conclusive.|
|503/500, lost connection, unreadable success, commit-ack failure|UNKNOWN: “Publication outcome is unconfirmed. Retry to resolve the same reviewed question.” Save/Remove say refresh/retry may reveal committed state. Missing outcome on unexpected mutation failure is conservatively UNKNOWN.|

Never infer rollback from HTTP status alone. Validate response projection inside the transaction before commit; return success only after commit resolves. Once commit is attempted, ambiguous acknowledgment is UNKNOWN unless DB conclusively reports abort. Wrap database failures into safe categories; no raw Prisma error/request/content/topic/digest/provider output in logs. Request IDs remain available. Never compensate uncertainty by deleting a question.

## 4. Fixed topic and legacy compatibility

For future F01 generation, store nullable `generationTopicDigest = lowercaseHex(SHA256(UTF8(QuestionTopicSchema.parse(rawTopic))))` on AiUsageEvent alongside existing metadata. Compute from normalized input before provider call; persist with usage recording. Only own successful `operation='generate-question'` association authorizes a new preview publication. Compare digest of submitted normalized topic with stored digest; mismatch rejects before mutation. F01 Save checks this binding for future bound events too. No response shape/provider request changes are needed. Hex length64 derives from SHA-256 encoding, not an invented product limit. Log neither topic nor digest. Keep existing provider/model/promptVersion/generatedAt snapshots from usage, never the caller. Binding proves exact normalized topic association, not semantic provenance of six edited fields; `association='instructor-reported'` stays truthful.

Existing events lack original topic; no backfill from arbitrary saved siblings/logs/model content or first caller is truthful. Under PRD-CLARIFICATION-01, direct Publish of an unbound old preview fails with §3 guidance, no creation, retained edits. Existing F01 Save remains usable with own successful association and existing instructor-reported semantics; Save creates a fresh private draft. Instructor can open it and publish, or generate a new bound preview. Existing eligible saved F01 drafts use persisted version.topic as fixed authority and require no regeneration/digest. Save changes/Publish compare normalized requested topic with that stored value and never rewrite it. Do not claim the legacy Save authenticates an original LLM topic. Never deduplicate generationId globally: intentional F01 Save calls remain fresh.

## 5. Persistence and transaction protocol

Add Exercise fields `editRevision Int @default(0)`, `previewPublicationKey String?`, `archivedAt DateTime?`, unique `(authorId,previewPublicationKey)` and index `(authorId,status,archivedAt)`. Null keys remain allowed repeatedly: all F01 Saves use null; saved Publish does not allocate a key. The retained Exercise is preview replay authority; no receipt table, fingerprint, queue or cache is needed. Retain nonnull key forever, including ARCHIVED; no TTL/cleanup may permit duplicate replay. Add nullable AiUsageEvent.generationTopicDigest with SQL null-or-lowercase64-hex check.

Add SQL checks revision0..2147483647; archivedAt null unless status ARCHIVED; ARCHIVED requires archivedAt and publishedAt. Retain existing PUBLISHED publishedAt check. All first transition times use database UTC clock, existing TIMESTAMP(3)/Prisma DateTime precision: `(clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3)`, read using parameterized SQL within the transaction. No client clock/time is trusted. publishedAt is set once and retained after archive; archivedAt is set once on successful Remove, never inferred from updatedAt. Revision overflow rejects before writes.

Migration is additive; preserve IDs/content/version1/hints/attempts/reviews/FKs. Old drafts start revision0, old usage digests remain null. No invented topic/removal date or applied migration rewrite. Preflight existing ARCHIVED rows lacking real archivedAt/publishedAt: stop and seek owner data reconciliation before adding checks, rather than silently fabricate chronology. No archive transition exists in inspected seed; this is a future target preflight, not live data evidence. Existing incomplete/VERIFIED rows remain unchanged and unexposed. Rehearse on synthetic old F01 records. Application rollback disables new routes while retaining additive fields and committed outcomes; no data-dropping rollback. Old F01 writers can create unbound references during staged rollout, covered by explicit legacy fallback; they cannot edit publications. Coordinate schema-before-new-code rollout because migrations/function deployment are not atomic.

Use short interactive Prisma transactions at PostgreSQL READ COMMITTED. Conditional parent update/CAS and unique index supply concurrency guarantees; read-then-unconditional-write does not. Lock/update Exercise before its version consistently. Every field/state/key/version publication write commits together. No automatic provider/whole-operation retries. Unique-key race recovery is one authoritative reread after aborted transaction; if unresolved, safe UNKNOWN/retry, no unbounded internal loop.

| Operation/current state | Algorithm and authoritative outcome |
| --- | --- |
| Save changes / own DRAFT | Parse/normalize; transaction loads own eligible record/version and compares topic. Conditional Exercise update WHERE id+authorId+status DRAFT+editRevision expectedRevision claims parent, updates title/description and increments revision. Only count1 permits updating existing Python version1 code/expectedBehavior/explanation/solution; retain topic/provenance/versionId. Project/validate owner DTO before commit. Later failure rolls back both rows/revision. |
| Save CAS miss | Reread own state in transaction: missing→404; newer DRAFT→409 stale; PUBLISHED/ARCHIVED→409 not editable. Never update a version after failed CAS. |
| Saved Publish / own DRAFT | Same topic/revision CAS; set PUBLISHED/first DB publishedAt and increment revision, persist all current reviewed fields across parent/version, validate projection and commit. Same id/versionId; no prior Save or hints needed. |
| Saved Publish / already PUBLISHED or ARCHIVED | Own eligible record required; return existing immutable owner DTO/outcome existing. Ignore submitted edits/revision for mutation; touch no content/time/revision. Feedback identifies existing authority; ARCHIVED stays removed. Request still must be structurally valid and confirmed. |
| Saved Publish CAS miss | Reread: winner published/archived→existing result; winner only saved newer DRAFT→409 stale; absent→404. Competing Save cannot overwrite a publication. |
| Preview Publish / absent own key | In transaction check own key first; if absent, verify own successful generation and bound topic, snapshot server provenance, create PUBLISHED Exercise/key/revision1/first times and Python version1/current reviewed fields. Validate projection, commit. No intermediate draft is observable. |
| Preview Publish / existing own key | Before new-generation lookup, return existing authority/outcome existing, including ARCHIVED. Changed payload/generationId/topic with reused key never overwrites content or consumes another key. Return explicit existing-content feedback. Structural request validation still precedes access. No payload hash is required because every same-key replay resolves authority. |
| Concurrent absent-key preview calls | Unique(authorId,key) picks winner. Loser's entire transaction including attempted question/version rolls back. Only this named unique constraint violation triggers one reread of own key on root client after aborted transaction; unrelated uniqueness/storage failures use safe fault mapping. Return winner if observed. If DB failure prevents observing authority, UNKNOWN; caller retries same key. Never retry with an internally generated new key. Same UUID under another owner reveals nothing. |
| Remove / own PUBLISHED | Transaction conditional update WHERE id+authorId+status PUBLISHED sets ARCHIVED/first DB archivedAt. Content/version/key/provenance/publishedAt unchanged. Validate projection/commit; preserve references. |
| Remove / already ARCHIVED or race loser | Reread/return same retained ARCHIVED result, same archivedAt, no second transition. DRAFT→409; unexposed VERIFIED/ineligible→404. No hard delete, restore or republish. |
| Learner read | One query selects eligible currently PUBLISHED row/version and explicit public fields. Retrieval begun after completed Remove cannot return it. A read begun before commit may finish with loaded content; no push/poll/cache/retroactive erasure. |

Commit is durability threshold; process memory is never publication authority. Any confirmed aborted transaction leaves no orphan version/question, consumed key or visibility change. A definite rollback permits editing/fresh confirmation and reusing the same key; an UNKNOWN attempt must reuse exact captured normalized snapshot/key until resolution. Current page keeps key/form in memory only; no localStorage/sessionStorage/reload recovery promise. Server retains authority even after page is intentionally abandoned.

### Lists, eligibility and ordering

Eligible records have existing F01 complete Python version1 topic/fields/provenance satisfying shared schemas. Filter ownership/status/completeness **before** skip/take. Order owner DRAFT `(createdAt DESC,id DESC)`, owner/learner PUBLISHED `(publishedAt DESC,id DESC)`, owner ARCHIVED `(archivedAt DESC,id DESC)`. Fetch 51, return≤50 with nextOffset=offset+50; reject unsigned-offset overflow. Ties are repeatable for unchanged collection. No concurrent collection snapshot promise; UI deduplicates repeated IDs if offset shifts. Incomplete legacy records stay outside surface; unexpected corrupt stored contracts give safe retrieval failure rather than misleading empty-success. Never fill an empty page with foreign/hidden state. Refresh resets collection/offset. Failed later-page load retains existing items and retries failed offset.

## 6. Recovery and state flows

Normal preview: Generate→unsaved six-field editor/fixed topic→validate→initially unaccepted exact review confirmation→capture normalized snapshot/key→Publish pending disables conflicts→authoritative owner read-only view. Save draft remains deliberate fresh creation, clears unsaved flag on success and opens new saved editor with confirmation false. Normal saved flow: own Drafts→load baseline/revision→edit→Save changes same id or confirm/Publish current edits directly→Published read-only. Content change resets confirmation; cancellation persists nothing.

| Event | Current-page state / next action |
| --- | --- |
| Invalid local/server fields | Keep every raw entry/topic; show path errors/summary, focus invalid field; no persistence change. |
| Definite Save failure | Keep fields/baseline/revision; Retry/edit available. Lost Save response is unconfirmed: safe retry may yield stale409; GET/reload with discard consent reveals authority, never blindly overwrites. |
| Stale Save/Publish | Retain edits; offer Reload latest with explicit discard consent. Do not replace local form automatically. If another tab already published, Publish replay returns existing authority and explicitly explains submitted stale edits were not applied. |
| Definite Publish rollback | Keep entries, unlock editing, reset confirmation; edit or retry after fresh confirmation. |
| Publish UNKNOWN/response loss | Keep captured payload/key/revision and raw form; after pending ends, freeze editing/Save/conflicting publication. Offer Retry same snapshot, or explicit Leave/New question under discard warning. Retry never samples changed form/allocates a new key. Do not claim rollback. |
| Retry returns PUBLISHED | Show returned read-only snapshot: “An existing publication was found; its published content is authoritative.” Clear dirty/review state; never label different submitted bytes as saved. |
| Retry returns ARCHIVED | Show retained Removed record; explain already removed; no republish. |
| Remove Cancel | No request/change; close dialog and restore focus. |
| Remove pending/failure/UNKNOWN | Suppress duplicate while pending. Definite failure keeps published availability/Retry; unknown says unconfirmed with safe retry/refresh. Never claim learner erasure. Authoritative GET/retry reveals state. |
| Expired session | Sign-in guidance, no further automatic mutation/replay after reauthentication; current-page entries remain until accepted navigation/unload. |
| Success/navigation | Mark dirty=false before navigation. Ignore stale/unmounted response callbacks; successful Save/Publish does not show unsaved warning. |

No background/partial publication. Accepted Leave may abandon an uncertain attempt; it cannot cancel a committed server transaction. New question explicitly starts a new preview after consent and is never an automatic retry. Cross-reload recovery/autosave remain excluded.

## 7. Frontend, discard and accessibility

Preserve `/instructor/questions/new`, `/instructor/drafts`, `/instructor/drafts/:id`; old draft URLs bridge to new owner list/editor without changing old APIs. New `/instructor/questions?status=...` and `/instructor/questions/:id` supply own Drafts/Published/Removed navigation. Drafts edit/Save changes/Publish; Published read-only/Remove; Removed read-only only. Empty Drafts offers New question. No delete/copy/restore/republish control. Learner `/learner` links to `/learner/questions` and `/learner/questions/:id`; summary shows title/topic/instructor display name/publication time. Detail uses a separate public renderer, never the full instructor-fields renderer. Disabled Get Hint with visible Coming soon has no handler/network/attempt/provider mutation.

Editor state: loaded server baseline/revision, raw six fields, normalized dirty comparison, confirmation=false, pending operation, captured publication attempt, definite/uncertain outcome and field/general errors. Unsaved generated preview is dirty even when unedited. Changed saved fields are dirty relative to last successful baseline. Successful Save uses returned canonical values/revision as new baseline; Publish uses returned authority. Preserve code whitespace. A busy ref closes repeated activation before React rerender; disabled controls are not backend protection.

Exact review sentence: **“I have reviewed this question and understand that published content cannot be edited.”** Initially unchecked; reset on content change/definite failure; Publish requires true. Pending shows role=status/labelled progress and disables conflicting form actions. Cancelling review keeps content and persistence unchanged.

Exact removal dialog: **“Remove this question? It will no longer be available to learners. Your read-only record will be retained.”** Actions **Cancel** and **Remove**; initial focus Cancel, Escape cancels, sensible opener focus return. Exact dirty dialog: **“You have unsaved changes. Leave and discard them?”**, **Stay** initial focus / **Leave**. Stay preserves work; Leave proceeds once. Covers New question, in-app Links, history POP, stale-result reload, and sign-out before unmount. Browser beforeunload uses browser-supported warning only, not application-controlled wording.

Existing BrowserRouter cannot assume data-router useBlocker support. Proposed minimal router change: `main.tsx` uses createBrowserRouter/RouterProvider with one root element rendering existing App/Routes under unchanged theme/AuthProvider; focused hook uses supported data-router blocker for POP/Link/navigation. AppShell sign-out consults same unsaved hook before auth action because auth unmount can bypass navigation. Shared-router approval and auth/deep-link regressions are required; no silent consent on auth state change.

Session expiry is not ordinary navigation. RoleRoute must distinguish initial unauthenticated access (existing sign-in redirect) from a question editor already admitted for the same instructor. Once that editor reports401 or AuthProvider loses its session, keep its current Outlet/editor mounted in an explicit expired mode, preserve local entries/captured uncertain attempt, disable all mutations and automatic protected refetches, and show sign-in guidance. Do not rely on useBlocker to prevent a conditional guard unmount. This admits no new data/request and displays only content already loaded on that current page. Choosing sign-in/navigation invokes discard consent before leaving; successful Save/Publish is still clean. Explicit sign-out first resolves discard and clears editor memory, then the normal guard redirects. A different authenticated identity must never inherit the prior editor capsule: clear it on accepted identity transition and reauthorize fresh retrieval. Route disposal/reload clears memory; no recovery after accepted unload is promised. Browser tests must separately simulate API401 and AuthProvider session loss while an editor is dirty, as well as initial anonymous routing, explicit logout and another-user sign-in.

Use semantic h1/h2, labels/helper/error associations, literal React text in pre/code (never HTML execution), visible focus and announced loading/errors. Validation focuses summary/first invalid field. Empty success differs from retrieval failure; list/detail Retry and unavailable return-to-list exist. Later-page failure retains items. Bound width/local code wrapping or scroll preserves mobile readability/reachable actions without page clipping. Established theme supplies contrast; observe resolved behavior. Keyboard/screen-reader/focus/contrast/unload observations are explicit manual obligations, not inferred from MUI props.

## 8. Security and compatibility obligations

Separate future security review is required for authentication/authorization, shared learner DTOs and persistence. Review ID guessing, role/session/origin checks, stale state, replay-key isolation, concurrent transactions, all seven immutable topic/content fields, raw JSON/byte limits, hostile markup, logging, rollback and retained references. Functional and coding-standards reviews supply separate verdicts; security does not substitute for them.

F01 generation topic validation/refusals, prompt/provider/time/retry/usage handling and fresh private Save remain compatible. No new provider call is made by Save/Publish/Remove/retrieval/placeholder. Existing literal-DRAFT contracts stay unchanged; new owner-state DTOs do not widen them. Explicitly superseded saved-read-only/no-Publish/no-discard-warning browser expectations are updated only where F02 requires. Future topic digest attests exact normalized topic association only; old saved provenance remains instructor-reported. No archived/private/VERIFIED data leaks through old draft routes.

No AI generation policy is introduced: inherited prompt/version/token/latency/provider acceptance evidence remains separately reported. Fake provider cannot establish live semantic correctness. F02 requires no new live-provider calls; any controlled inherited acceptance is separately authorized and remains unperformed here. Shared schema/contract approval does not authorize deployment. ADR003's migration/function non-atomicity remains a rollout constraint.

## 9. Proposed public test seams and vertical red-green plan

All seams below are **proposed**, not confirmed. Human exact-package approval must bind them before executable tests; separate implementation authorization is also required. [RequirementsToTests](RequirementsToTests.md) maps all 18 PRD requirements and all 51 AC, read with PRDClarifications; feature tests/manual observations remain Planned until performed.

| Seam | Public interface, evidence and proposed path |
| --- | --- |
| F02-S1 | Shared schemas at `packages/contracts/test/f02-contracts.test.ts`, retaining F01 tests. Independent literal fixtures; each field blank, below/at/above UTF-16 maximum, surrogate pairs, normalization/verbatim code, strict extra keys/state/error shapes. |
| F02-S2 | Authenticated createApp HTTP with real InstructorQuestions and isolated PG at `tests/integration/f02-publication.test.ts`; focused middleware/raw-body policy at `apps/backend/test/f02-http.test.ts`. Real sessions/roles for acceptance. Observe persisted results through owner/learner GET/list and identity/cardinality; isolated HTTP doubles prove middleware behavior only. |
| F02-S3 | Public InstructorQuestions methods with real PG and independent concurrent clients, same integration scope. A temporary test-owner SQL trigger raises after parent CAS/before version write to prove real rollback; installed/removed only in owned isolated `_test` DB. No mock Prisma. Fixture setup/structural migration/FK checks may inspect DB separately, labelled structural evidence rather than public behavior proof. |
| F02-S4 | Browser routes/controls/dialogs/navigation at `tests/e2e/f02-instructor.spec.ts`, `f02-learner.spec.ts`, `f02-composed.spec.ts`. Intercepted HTTP proves UI state; composed cookies/local PG/fake AI proves deterministic journey. An owned local HTTP proxy drops an already-committed response for real response-loss behavior. Manual keyboard/focus/contrast/unload observations remain distinct. |
| F02-S5 | Extracted Netlify Web handler via extended `scripts/verify-netlify-artifact.ts`, real synthetic PG/cookies, publish→learner read→archive smoke. Preserve ESM/cookie/binary checks. Source createApp tests are not packaged evidence. |

No test-only random/time interface is needed: use returned identities/times and relational assertions; controlled fixture DB timestamps establish literal ties/order. Real mutation times come from PG. Fault triggers/proxies are actual database/transport fault seams, not production testing hooks. External provider/delivery doubles stay at real external seams. Concurrent calls start before awaiting either; assert one authoritative snapshot/id via public reads. Cover Save-vs-Save, Save-vs-Publish, Publish-vs-Publish, same-key preview race, response loss, edited-payload same-key replay, archive replay and failure at parent/version boundary. No retry uses a new key or mutable unknown snapshot. Test all role/ownership/status partitions, all seven immutable fields, no hints/provider calls, per-page 50/51/empty/overflow/ties and failed later page. Include legacy unbound rejection→Save/open/Publish, legacy saved publication without regeneration, new bound topic mismatch, missing/foreign/unsuccessful generation and intentional repeated F01 Save.

After approval/authorization, implement one tracer bullet at a time (one failing observable test → minimum implementation → green, then next); do not write a horizontal batch of imagined executable tests:

1. Own owner list/detail and denied foreign record → minimal DTO/projection/routes. Next literal-DRAFT F01 compatibility case.
2. Same-id private Save/verbatim code → CAS transaction. Next stale concurrent Save, then real database fault rollback, each red→green separately.
3. Current-edits saved Publish/no hints and learner allowlist → atomic transition/projection. Next Save/Publish race, existing-publication replay and immutable-field denials.
4. Bound-preview direct Publish → digest/create/key. Next concurrent key, committed response-loss, changed-payload replay and approved legacy fallback; keep fresh F01 Save regression.
5. Confirmed Remove hides future retrieval and retains references → archive. Next repeated/concurrent Remove, response loss and archived publication replay.
6. Browser current confirmation/reset/retained edits → editor state. Add dirty Link/POP/New/reload/sign-out, uncertain frozen snapshot/retry and exact prompts/focus one behavior at a time.
7. Bounded management/learner Load more and later-page retry → UI. Add mobile/public placeholder, full composed journey, Netlify composition/package smoke and regression/static gates.

Independent acceptance author, if assigned, freezes interpretation/fixtures/cases before seeing implementation diff; implementation cannot redefine expected behavior. Implementer still writes meaningful behavior/unit tests. Future reviews return separate functional, standards and security verdicts with actual evidence/limits. RTT owns stable test IDs, named manual observations and status; no unperformed acceptance is marked passing.

## 10. Future verification gate and observed checks

Run from repository root with actual Node 24/npm 11 executables per `.nvmrc`/engines; record versions. Inspect installed bundles before declaring tools unavailable. Before any connected command verify explicit identical DATABASE_URL, DATABASE_URL_POOLED, TEST_DATABASE_URL point to owned loopback PostgreSQL `_test` database with no query/hash overrides; E2E_TEST_DATABASE_URL uses same owned target. Existing test target validator applies. Use synthetic identities/test auth secret/origins, AI_PROVIDER=fake, blank external Google/SMTP/SoC/OAuth credentials; do not read/print credentials. Stop on first failure; at most three evidence-backed repair attempts per runbook.

Snapshot/CI compatibility: after the exact human package decision approves the narrowly enumerated `.prettierignore` request in §2, apply it before the full `npm run format:check`; never reformat approved PRD/brief or other frozen artifacts to satisfy formatting. Reverify every snapshot SHA-256 against the approved ledger/backup after copy and after checks. Use `npx prettier --file-info <exact-snapshot-path>` for every listed existing snapshot (and each exempted generated report if used) to confirm ignored=true; negative control `npx prettier --file-info docs/UserGuide.md` must remain ignored=false. Run targeted `npx prettier --check docs/DeveloperGuide.md docs/UserGuide.md workflow/agents/FEATURE_MAP.md` and the explicit mutable coordinator Markdown paths before the full check. No blanket ignore of F02 directories/evidence or automatic rewriting of approved bytes is permitted. This is a proposed tooling exception, not current permission to edit `.prettierignore`.

Exact future commands (new paths are proposed until approved/created):

```text
node --version
npm --version
npm run db:generate
npm run db:validate
npm run test -- packages/contracts/test/f01-contracts.test.ts packages/contracts/test/f02-contracts.test.ts
npm run test:api
npm run lint
npm run typecheck
npm run format:check
npm run build
npm run db:verify
```

`db:verify` owns a disposable loopback PostgreSQL 17 container/target, migrates, seeds twice, runs full integration and removes its container; inspect Windows/Docker prerequisites first. It sets its own matching verified URLs. For an already-owned isolated target, after explicit URL verification run `npm run db:deploy`, `npm run db:seed`, `npm run test:integration -- tests/integration/f02-publication.test.ts`, then `npm run test:integration`. Migration compatibility rehearsal uses synthetic old-schema fixtures only. Never use db:reset on shared/unknown data. Offline generation/validation may use placeholder per existing Prisma config, but migrations/seed never do.

```text
npm run test:e2e -- tests/e2e/f02-instructor.spec.ts tests/e2e/f02-learner.spec.ts
npm run test:e2e -- tests/e2e/f02-composed.spec.ts tests/e2e/f01-composed.spec.ts --workers=1
npm run test:e2e -- tests/e2e/f01-instructor.spec.ts tests/e2e/auth-feedback.spec.ts tests/e2e/app-shell.spec.ts
node --import tsx scripts/verify-built-frontend.ts
node scripts/package-netlify-artifact.mjs <absolute-netlify-cli-27.16.1-package.json>
node --import tsx scripts/verify-netlify-artifact.ts <absolute-extracted-netlify/functions/api.mjs>
```

Composed fixture uses E2E_AUTH_COMPLETION=1, explicit owned E2E DB, private captured outbox, local HTTP/cookies/PG/fake AI; E2E_REAL_AUTH unset. Intercepted specs are reported separately. Playwright owns ports 3001/5173, desktop/mobile Chromium, refuses unknown-server reuse; leave unrelated processes. Packaging follows local production build, pinned CLI package and extracted local ZIP; invoke emitted handler with matching verified direct/pooled/test URLs. Build checks declaration emit; packaged execution checks ESM/runtime dependency composition. No linkage/upload/deployment is authorized. No push/PR/merge is authorized.

Capture command/runtime/environment/result/diagnostics/cleanup; distinguish source/schema/HTTP simulation, real PG concurrency/persistence, composed browser, manual accessibility, production build, extracted package, CI and live provider. Required final delivery covers every AC, both compositions, security review and unresolved manual/live gaps explicitly. A build cannot complete manual accessibility or prove deployment correctness.

**Observed drafting checks:** complete assigned frozen inputs and required workflow/design/testing references read; original four supplied hashes matched; updated approval/clarification read; branch/base verified; relevant contracts/schema/modules/router/compositions/tooling/ADR inspected. Coordinator-owned untracked evaluation/handoff paths observed, untouched. An incorrect component path was corrected to `pages/InstructorDraftFields.tsx`. An oversized Windows write command failed with CreateProcess206 before writing; bounded patch writes recovered. No app/test/shared-doc/schema edits, executable tests/builds, live/provider/database calls, services, migrations, commits or deployment occurred. TDD.md is the sole writer-owned output. Document structural/link checks and SHA-256 are drafting evidence only. Complete package/public seams/implementation remain unapproved.
