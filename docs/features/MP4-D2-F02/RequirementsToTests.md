# MP4-D2-F02 — Requirements to Tests

**RTT v1 · Draft — awaiting independent package review and human package approval**  
Developer 2 / Royden · 2026-11-06 (Asia/Singapore). **Every case and evidence row below is Planned; zero acceptance cases executed.** Public seams and cases are proposals, not permission to create executable tests. Human exact-package/seam approval and separate implementation authorization remain required.

## Authority and frozen interpretation

The approved [PRD](PRD.md) retains its historical draft header; PRD-APPROVAL-01 records the owner's exact **“approve”**, including R1–R3. [PRDClarifications](PRDClarifications.md) records owner-selected legacy-preview fallback under PRD-CLARIFICATION-01. These govern all 18 requirements/51 unchanged acceptance IDs. The frozen [TDD](TDD.md) supplies proposed interfaces, errors, recovery and compatibility. This checklist neither changes product requirements nor claims design/package approval.

| Complete source read and verified | SHA-256 |
| --- | --- |
| [Mission Brief v4](../../mission-brief/MP4-D2-F02-publish-question.md) | `8926bd04749633665d208065dbb94dc7cd101e413d67fef596efae092e4c5487` |
| [GrillingDecisions](GrillingDecisions.md) | `4a11740c585617e876dca6d8701a15036ff3576c35e7561ff777e2d31a732b81` |
| [PRD v1](PRD.md) | `f04089ad7555a61dabdd71645d0cf0e4f309fdd321cd609beef91841930b2b1c` |
| [PRDClarifications v1](PRDClarifications.md) | `29bdcd79308625388410c923fc8b4ff1c2bd85b916e77ba10d91100dd1ca044e` |
| [ApprovalRecord](ApprovalRecord.md) | `7c58ee0959ce3828b4e00b1232c01ba917ce25dd892cf0c63830ce4c359c2fab` |
| [TDD v1](TDD.md), refrozen after exact snapshot-tooling correction | `87a985ac9f15d6727ccf8d4974d3ce3ea80e2e4a1fffaa26f0932a857f705983` |

Baseline: `982b0641cd45bf8184bca8e623c36b611af9d898`, branch `royden/mp4-d2-f02-publish-question`, eventual PR target `master`. Relevant existing contracts/schema/modules, tests/support, browser/integration configuration, package scripts, CI and DeveloperGuide were inspected; source facts are not runtime evidence. [AGENTS](../../../AGENTS.md), [runbook](../../../workflow/agents/README.md) and [coding standards](../../CodingStandards.md) apply. Relative links resolve from eventual repository location, not the external draft tree.

## Proposed public seam and evidence index

No executable test names are fixed before owner confirmation. F02-Bxx identifiers below name observable behaviors and manual observations; suggested file paths come from TDD §9 and remain proposals.

| Seam | Proposed boundary and evidence tier | Limit |
| --- | --- | --- |
| F02-S1 | Shared public request/response schemas; `packages/contracts/test/f02-contracts.test.ts`, retaining F01 contracts. **C** = schema/contract automation. | Parsing proves no persistence, session, browser or deployment behavior. |
| F02-S2 | Authenticated `createApp` HTTP with real `InstructorQuestions`, real synthetic sessions and PostgreSQL; `tests/integration/f02-publication.test.ts`. Focused raw-body/middleware checks may use isolated HTTP doubles in `apps/backend/test/f02-http.test.ts`. **H** = real HTTP/PG; **D** = explicit middleware double. | Doubled session/module tests cannot establish cookie auth, persistence, races or rollback. |
| F02-S3 | Public `InstructorQuestions` methods with real PostgreSQL and independent concurrent clients, same integration scope. **P** = public module/real PG; **MIG** = separately labelled structural migration/FK evidence. | No mock Prisma. DB inspection is permitted for fixture setup, target identity and structural constraints only; business outcomes use public owner/learner reads. |
| F02-S4 | Instructor/learner browser routes, controls and navigation; proposed `f02-instructor.spec.ts`, `f02-learner.spec.ts`, `f02-composed.spec.ts` under `tests/e2e/`. **B** = intercepted HTTP/browser state; **E** = real cookies/local PG/fake AI composed journey; **A** = named manual accessibility/visual observation. | Browser doubles prove rendering/state only. Manual observations and real composed journeys are reported separately. |
| F02-S5 | Extracted production Netlify Web handler, extended `scripts/verify-netlify-artifact.ts`; real synthetic PG/cookies, publish→learner read→archive. **N** = packaged-handler execution. | Source HTTP/build success is not extracted-package or deployed evidence. No deployment/live service is requested. |

In case tables, S1–S5 abbreviate F02-S1–F02-S5. All automated assertions use independent literals or spec-defined invariants. Do not calculate expected DTOs with app projection/schema/digest helpers or reproduce its transaction algorithm. For generated IDs/times, capture the first authoritative public response then assert stable identity, one list entry, unchanged snapshots and relative transition time; fixture-controlled ordering uses literal expected IDs. No internal call sequence is the product oracle.

## Fixtures, partitions and deliberate faults

Use synthetic identities `f02-owner-a@example.test` / Instructor A, `f02-owner-b@example.test` / Instructor B, and two unrelated LEARNER identities; no enrollment fixtures are required. Include guest, expired session and another authenticated identity. Each run owns uniquely scoped fixture IDs and an explicitly verified loopback PostgreSQL `_test` database. No production connection, assumed ambient DATABASE_URL, .env/credential/session-file reading or real user data is permitted. Direct/runtime/test/E2E target URLs must agree, with no query/hash overrides; assert connected database identity before fixture writes. Cleanup only owned fixtures/faults, preserving unrelated processes/data.

Independent ordinary reviewed fixture, topic **`Python lists and for loops`**:

```text
title: Sum all values
problemStatement: Fix the function so every list value contributes to its sum.
buggyCode: def total(values):\n    return sum(values[:-1])\n
expectedBehavior: total([3, 5]) returns 8; total([]) returns 0.
bugExplanation: The slice omits the last value.
correctedSolution: def total(values):\n    return sum(values)\n
```

Here `\n` denotes actual LF in the future fixture; expected persisted code includes its final LF. A changed snapshot uses literal title **`Count every value`** and expected behavior **`total([3, 5, 7]) returns 15.`**; distinguish it from both the original fixture and a competing tab's **`Other tab saved this title`**. Independent SHA-256/UTF-8 vector for the normalized topic above is `de5dbdb878170e00b2c1e94381074058f02b9d3d50211d6e52175cfd591b7b98`; a structural check may compare stored binding to this literal, while public accepted-topic/wrong-topic outcomes remain the business proof. Use sentinel secrets `F02_PRIVATE_EXPLANATION`, `F02_PRIVATE_SOLUTION`, `F02_PRIVATE_PROVENANCE`, author email and hint content in private fields. Assert none occurs anywhere in learner JSON/rendered DOM/errors, not merely absence of expected property names. Assert exact allowed keys, including only the TDD-approved public identity/metadata/content fields.

| Partition/boundary family | Representatives and independent expectation |
| --- | --- |
| Seven strings | Title120, problemStatement2000, expectedBehavior1500, bugExplanation2000, buggyCode4000, correctedSolution4000; topic300. For each separately: missing, null, number, empty, whitespace-only fail; nonempty lengths1, max−1, max pass; max+1 fails. Prose limits apply after trim; code lengths include all whitespace. Keep other fields ordinary to remain under64kb. |
| UTF-16/storage | For each string, ASCII padding plus `😀` at total max−1/max/max+1; valid pair counts2. NUL, lone high surrogate and lone low surrogate each fail at their own field before hashing/write; valid pair survives. Prose `  Sum all values  ` becomes exact `Sum all values`; code `\n  print('x')  \r\n` survives verbatim. No Python execution. |
| Strict request/scalars | Missing/false confirmation, unknown keys (owner/status/time/provenance), wrong discriminator; id empty/1/128/129 units; revision−1/0/2147483647/2147483648/fraction; canonical lowercase UUID versus malformed/uppercase key. Offsets0/49/50/4294967295 valid grammar, negative/fraction/NaN/overflow/duplicate/extra query invalid; overflow next page fails safely. |
| Lists/states | Counts0/1/49/50/51/101 per own state and learner list; literal tied timestamps/IDs establish id-desc tie order. Foreign/hidden/VERIFIED/incomplete rows surround page boundaries. Corrupt eligible stored contracts produce safe retrieval failure, not fabricated empty success. |
| Association/compatibility | New bound own successful generation, wrong topic, foreign/missing/FAILED/REJECTED/wrong-operation association; legacy null digest preview and saved draft; unrelated hints/attempt references; old literal-DRAFT consumers. No inference of original legacy LLM topic. |
| Faults/races | Temporary SQL trigger on owned test DB raises after Exercise CAS/before version write; verify real rollback via public reads and always remove trigger. Independent simultaneous clients exercise races. Owned loopback HTTP proxy drops response only after real commit; unreadable success/commit acknowledgment error is UNKNOWN, not rollback proof. Browser response gates control loading, late response/unmount and page-two failure; these are UI evidence only. |

Controlled timestamps/IDs are fixture setup; real transition times originate in PostgreSQL and are never set by client input. Named preview-key unique collision alone permits one authoritative reread after abort; exercise unrelated unique failure separately. Fault instrumentation is confined to test database/transport boundaries, not test-only production hooks.

## Planned observable behavior inventory

Each row defines a behavior family; individual partitions above are separate future examples, not one broad happy-path assertion. All rows remain Planned. Cases are implemented vertically after approval: one failing observable example, minimum code, green, then the next. An independent acceptance author freezes this interpretation before viewing implementation diffs; implementer still writes meaningful unit behavior coverage.

| ID | Observable scenario and independent expected result | Seam/tier | Status |
| --- | --- | --- | --- |
| F02-B01 | Preview and owned saved editor expose all six fields. Topic stays read-only; direct caller changing normalized topic fails without changing stored topic or any content. Both preview and saved topics use the authority defined in B09/B40. | S1/C, S2/H, S4/B,E | Planned |
| F02-B02 | Every per-string required/type/trim/verbatim/UTF-16 boundary above has its specified pass/fail. Invalid Save/Publish identifies paths and retains every raw entry; valid exact limits persist literally through owner GET. No partial write/learner availability on failure. | S1/C, S2/H, S4/B | Planned |
| F02-B03 | NUL and each unpaired surrogate are field-specific400 BAD_REQUEST/NOT_APPLIED before digest/write. Valid pair accepted at UTF-16 boundary. Failed Save/Publish leaves prior record/private state unchanged; invalid provider output retains inherited safe failure handling without content logs. | S1/C, S2/H, S3/P | Planned |
| F02-B04 | Save changes updates same question/version identity with canonical prose/verbatim code and one revision increment; own Drafts still has one private item, learner cannot retrieve it. Success announced; reload/new session reads literal edited fixture. | S2/H, S3/P, S4/E | Planned |
| F02-B05 | Editing alone changes no persisted field. Two intentional F01 preview Save calls create two distinct private IDs even for one generationId; same-draft Save changes creates no third ID/publication. Successful Save clears dirty/review state. No autosave or global generation deduplication. | S2/H, S4/B,E | Planned |
| F02-B06 | Exact initially unchecked review sentence is required. Cancel/decline sends no mutation and preserves content/availability. Missing/false confirmation rejected by direct caller. | S1/C, S2/H, S4/B,A | Planned |
| F02-B07 | Publish captures current edits, including unsaved saved-draft changes; separate Save unnecessary. Changing any field after confirmation resets it. Returned publication equals literal reviewed snapshot, never an older confirmed form. | S2/H, S4/E | Planned |
| F02-B08 | Pending Publish announces progress, blocks repeated keyboard/pointer activation immediately, locks conflicting form/Save/New actions, then exposes correct success/definite-failure/uncertain next action. Delayed old callbacks cannot update an unmounted/new workflow. | S4/B,E | Planned |
| F02-B09 | New bound preview publishes directly to one own PUBLISHED question/version with trusted generation metadata/fixed topic and read-only owner view. Own successful association required; wrong topic, missing/foreign/unsuccessful/wrong-operation reference gives safe400/NOT_APPLIED, no new question. Future F01 Save enforces same topic binding; normalization-equivalent topic accepted. | S1/C, S2/H, S4/E | Planned |
| F02-B10 | Publish without any hints succeeds in both paths and is learner-readable. Save/Publish/Remove/retrieval/placeholder make zero additional generation/hint/provider operations; no manufactured hints or attempts. Observe external fake-provider boundary deltas, not internal helper calls. | S2/H, S4/E | Planned |
| F02-B11 | Own saved draft opens, all edits publish atomically on same question/version; disappears from Drafts, appears once in Published and subsequent learner list/detail. No duplicate private or public question. | S2/H, S3/P, S4/E | Planned |
| F02-B12 | Invalid/denied/definite failed Publish leaves exact prior draft and learner visibility unchanged. Real trigger failure between parent and version rolls back fields/status/revision/key/version creation; safe NOT_APPLIED and retained editor entries permit edit/fresh confirmation/retry. | S2/H, S3/P, S4/B | Planned |
| F02-B13 | Two tabs load same revision; later Save makes stale Save/Publish409 with exact reload guidance. Newer literal title survives; stale local entries remain. Reload does not replace them until explicit discard consent. | S2/H, S3/P, S4/E | Planned |
| F02-B14 | Concurrent Save-vs-Save and Save-vs-Publish start before awaiting either. One allowed CAS wins: other Save cannot overwrite publication; losing Publish returns existing publication if winner published, otherwise stale409. No mixed parent/version snapshot or extra revision increment. Public reads identify one authoritative literal snapshot. | S2/H, S3/P | Planned |
| F02-B15 | Concurrent/repeated saved Publish returns same question/version/publication time/revision. Valid stale different submitted edits are ignored; existing response/feedback clearly says published content is authoritative. No overwrite/duplicate or misleading saved-current-edits announcement. | S2/H, S3/P, S4/B,E | Planned |
| F02-B16 | Same-key preview concurrent calls and committed response loss resolve one question/publication with original reviewed snapshot. Retry uses identical key/payload; pending duplicates create none. Same key with different valid fields/topic/generation returns existing authority before new association lookup; structural invalidity still fails. Another owner using same key sees none of the first owner's record. | S2/H, S3/P, S4/E | Planned |
| F02-B17 | UNKNOWN/lost/unreadable response or missing mutationOutcome displays unconfirmed outcome, never rollback. Captured snapshot/key/revision stay frozen; editing/Save/conflicting publish unavailable. Retry sends exact snapshot; definite rollback unlocks editing and fresh confirmation. Explicit Leave/New warns and may abandon, never cancels server commit. | S1/C, S4/B,E | Planned |
| F02-B18 | Saved or preview replay after archive returns same ARCHIVED record/outcome existing, original content/times/key and no learner visibility. Never republish/reallocate key, even with changed payload; retained key survives new app/session. | S2/H, S3/P, S4/E | Planned |
| F02-B19 | Definite Save failure rolls back prior fields/revision and retains editor. Lost Save response is unconfirmed; safe retry may give stale409, explicit-consent reload reveals committed authority. Never blindly overwrite or claim unobserved success. | S2/H, S3/P, S4/B,E | Planned |
| F02-B20 | Unsaved preview (even unedited) and changed saved fields trigger exact dirty dialog for New question, Link, history POP, stale reload and sign-out. Stay retains all work; Leave proceeds once. Browser unload uses native warning; accepted unload clears memory. Successful Save/Publish leaves no false dirty warning. | S4/B,E,A | Planned |
| F02-B21 | Own Drafts/Published/Removed filter correct owner/state before paging; respective actions edit/save/publish, view/remove, view only. Refresh/reopen reflects state; no draft delete/hard-delete/copy/restore/republish control. Empty Drafts offers New question. | S2/H, S4/E | Planned |
| F02-B22 | Stale owner view cannot authorize forbidden current-state action: Save after publication/archive409; Remove on DRAFT409; foreign/missing/ineligible/VERIFIED404. All six fields/topic immutable after publish/archive under direct calls and stale requests. Full owner record stays readable; removal changes no content. | S1/C, S2/H, S3/P, S4/B | Planned |
| F02-B23 | For each owner state and learner list,0/1/49/50/51/101 records traverse≤50 per page; order is created/published/archived DESC then id DESC. Expected tied IDs are literal. nextOffset/Load more only if remaining; invalid/overflow offsets safe400. No hidden/foreign items fill pages. UI deduplicates shifted IDs; refresh resets offset, no concurrent-snapshot guarantee. | S1/C, S2/H, S4/B,E | Planned |
| F02-B24 | Exact removal prompt with Cancel/Remove, initial Cancel focus/Escape cancellation and opener focus return. Cancel has no request/change. Pending Remove progress suppresses repeated activation. | S4/B,A | Planned |
| F02-B25 | Confirmed Remove retains same question/version/content/provenance/publishedAt and existing attempt references, first archivedAt; own Removed read-only. Repeated/concurrent Remove resolves same archived result/time with no second transition. Remove-vs-Publish replay may observe publication before archive or retained archive after it; final state is ARCHIVED, never republished. No permanent delete or restore. | S2/H, S3/P,MIG, S4/E | Planned |
| F02-B26 | Definite Remove rollback leaves published availability and retry. Lost/ambiguous response says unconfirmed, safe retry/refresh reveals current authority. No claimed erasure; repeat after real committed-response loss stays archived once. | S2/H, S3/P, S4/B,E | Planned |
| F02-B27 | After completed Remove, every subsequent learner list/detail request excludes record, direct detail404. Already-loaded learner page may remain; refresh/navigation gives unavailable/updated list. Read started before commit may finish; no push/polling requirement. | S2/H, S4/E | Planned |
| F02-B28 | Two unrelated learners discover both instructors' current publications without enrollment filters. Summary has exact title/topic/display name/publication time and opens read-only detail; author email never substitutes for display name. | S2/H, S4/E | Planned |
| F02-B29 | Learner list/detail strictly allow public DTO keys/content only: no explanation/solution/provenance/provider/hints/attempts/author email or sentinel anywhere in response/DOM/errors. Draft/ARCHIVED/VERIFIED/incomplete/foreign owner-management guesses expose no protected data or ownership distinction. | S1/C, S2/H, S4/E | Planned |
| F02-B30 | Successful empty learner result says no published questions; missing/removed/private detail safe unavailable with return-to-list. Transport/parse/server error remains failure/Retry, never empty success. Unexpected corrupted eligible stored record reports safe retrieval failure. | S2/H, S4/B,E | Planned |
| F02-B31 | Learner detail has disabled Get Hint and visible Coming soon. Pointer/keyboard attempts cause no request/provider operation/content reveal/attempt/state mutation. No hint existence/approval required for browse/publish. | S2/H, S4/B,E,A | Planned |
| F02-B32 | Real anonymous/session/role/owner matrix: guest401/sign-in; learner instructor mutation403; instructor learner-only operation403; other instructor owner list/detail/change/publish/remove cannot access A's records (404 for guessed eligible ID). Denied requests change neither persisted data nor learner availability. Controls alone never authorize. | S2/H, S4/E | Planned |
| F02-B33 | Mutation Origin absent/foreign rejected; accepted configured Origin/application-json works with session. Malformed JSON400, >64kb raw body413 BAD_REQUEST; strict unknown keys/scalars/confirmation/discriminator rejected before write. Error envelope safe requestId/path/no submitted values; no automatic mutation retry on rate/denial. | S1/C, S2/H,D | Planned |
| F02-B34 | Every list/detail loading state announced; first retrieval failure Retry differs from empty. Page-two failure preserves page one and retries same failed offset without false completion. Late/superseded response after navigation cannot repopulate new page or duplicate IDs. | S4/B,E | Planned |
| F02-B35 | Dirty admitted editor separately sees API401 and AuthProvider session loss: Outlet/entries/captured attempt remain mounted but disabled; no automatic protected refetch/mutation/replay. Sign-in/navigation needs discard consent. Initial anonymous still redirects; explicit logout resolves discard then clears memory. Different identity cannot inherit capsule and must reauthorize. Accepted reload/disposal loses local work. | S2/H, S4/B,E | Planned |
| F02-B36 | Hostile script/img/markup strings display literally in editor/lists/owner and learner content, no execution/DOM injection. Errors/captured logs exclude private code/explanation/provider output/topic/digest/URL credentials/token/internal SQL/stack; safe request IDs remain. Check allowed content separately from protected-field sentinel leak. | S2/H, S4/B,E | Planned |
| F02-B37 | Successful Save/Publish/Remove survives reload, new authenticated session and new app composition. Public identity/cardinality/content/times stable. Archive retains referenced version; structural FK rehearsal labels DB inspection separately. Confirmed abort has no orphan/key consumption; uncertain commit is resolved through authority, not compensation deletion. | S2/H, S3/P,MIG, S4/E | Planned |
| F02-B38 | Manual A-Keyboard/Focus/Announcements: complete both publish paths, validation, dialogs, cancel, stale reload, failure retry, list/detail and hint placeholder with keyboard/screen reader; labels/headings/errors meaningful, focus visible/returned, progress/errors announced, no focus trap escape. Record actual assistive tech/browser. | S4/A (B/E supporting) | Planned |
| F02-B39 | Manual A-Responsive/Contrast/Unload: desktop/mobile/zoom readable code with local scroll/wrap and reachable actions, no page-wide clipping; inspect resolved theme contrast/focus; browser native unload Stay/Leave behavior. Automated viewport assertions support but do not replace observation. | S4/A (B supporting) | Planned |
| F02-B40 | Compatibility migration: new bound normalized-topic digest matches known SHA-256 vector without app helper; wrong topic rejected. Legacy null-digest directPublish400/no creation, preserves edits and exact Save/open/regenerate guidance. Legacy F01 Save→open→publish succeeds with stored fixed topic; preexisting saved draft publishes without regeneration. Legacy Save remains instructor-reported, never claims original model-topic attestation. | S1/C, S2/H, S3/MIG, S4/E | Planned |
| F02-B41 | Additive migration rehearsal on synthetic old-schema fixtures preserves IDs/content/version1/hints/attempt/review FKs, old revision0/null digests/null keys. Multiple F01 null keys allowed; own nonnull key unique forever including archived. Save/initial saved Publish at revision max reject with conflict/support guidance, no wrap/write; replay never increments. ARCHIVED missing real times blocks preflight pending owner reconciliation, no fabricated dates; VERIFIED/incomplete unchanged/unexposed. Rollback disables routes without dropping committed data; old writer unbound saves use legacy fallback. | S2/H, S3/MIG | Planned |
| F02-B42 | F01 regression preserves generation topic/refusals/provider/prompt/retry/usage/provenance/private ownership/safe errors and intentional fresh Save; old literal-DRAFT endpoints/consumers unchanged, non-DRAFT detail404. Update only superseded saved-read-only/no-Publish/no-discard-warning UI assertions. No extra AI/attempt workflow. New Unicode rejection only prevents unrepresentable storage. | S1/C, S2/H, S4/E | Planned |
| F02-B43 | Source/production compositions inject new module; missing composition safe503. Declaration-emitting build and extracted-handler cookie/ESM/binary checks retain compatibility; packaged synthetic publish→learner read→archive exercises real module. Source tests alone never marked packaged passing. | S2/H,D, S5/N | Planned |
| F02-B44 | Bounded unique-race recovery: only named(authorId,previewKey) conflict performs one authoritative root reread; winner observed→existing, unavailable reread→safe UNKNOWN/same-key retry. Unrelated uniqueness/storage faults do not masquerade as replay or loop; conclusive rollback→NOT_APPLIED. Use actual SQL constraints/faults, public outcomes and bounded captured transport activity. | S2/H, S3/P | Planned |
| F02-B45 | Package/ownership observation: shared-file requests and product/guide three-hint alignment recorded before edits; concise permitted Dev1 handoff names public learner fields/paths, archive identity and disabled placeholder. No functional hint API or future lifecycle restriction invented. Exact snapshot-only `.prettierignore` request in TDD §2 needs human package decision before edit: ten named F02 Markdown snapshots and conditional verbatim monitor report.json/report.md only, no directory ignore. Verify frozen hashes, exact ignored=true matches/unrelated ignored=false control, and format mutable docs/evidence separately per tooling note below. Separate functional/standards/security reviews and exact-package/implementation gates remain explicit. | Document observation | Planned |
| F02-B46 | Evidence/traceability audit: all51 AC and18 requirements resolve to defined cases; each performed example later records runtime/target/tier/result/evidence/cleanup. Source, doubles, real PG, composed browser, manual, package, CI/live evidence distinct. No unperformed, deferred or semantic-correctness claim counted complete. | Document observation | Planned |

The following independent literal text is part of B06/B13/B15/B17/B20/B24/B40 expectations:

| Purpose | Exact expected copy/actions |
| --- | --- |
| Review | “I have reviewed this question and understand that published content cannot be edited.” Initially unaccepted. |
| Discard | “You have unsaved changes. Leave and discard them?” **Stay** / **Leave**, Stay initially focused. |
| Removal | “Remove this question? It will no longer be available to learners. Your read-only record will be retained.” **Cancel** / **Remove**, Cancel initially focused. |
| Stale draft | “This draft changed. Reload to review the latest version.” |
| Existing authority | “An existing publication was found; its published content is authoritative.” |
| Unknown publication | “Publication outcome is unconfirmed. Retry to resolve the same reviewed question.” |
| Legacy direct denial | “This older preview cannot be published directly. Save draft and reopen it to publish, or generate a new question.” |
| Placeholder | **Get Hint**, disabled; visible **Coming soon**. |

## Complete acceptance mapping

Every full approved acceptance ID appears exactly once in this mapping. Each listed case is defined above; cases may support multiple AC but no AC is deferred. The requirement prefix in each row also establishes coverage of its parent requirement.

| Requirement | Full acceptance ID | Defined behavior IDs | Status |
| --- | --- | --- | --- |
| F02-FR-01 | F02-FR-01.AC1 | F02-B01, F02-B09, F02-B40 | Planned |
| F02-FR-01 | F02-FR-01.AC2 | F02-B02, F02-B03, F02-B04 | Planned |
| F02-FR-01 | F02-FR-01.AC3 | F02-B02, F02-B03, F02-B12 | Planned |
| F02-FR-02 | F02-FR-02.AC1 | F02-B04, F02-B05 | Planned |
| F02-FR-02 | F02-FR-02.AC2 | F02-B04, F02-B37 | Planned |
| F02-FR-02 | F02-FR-02.AC3 | F02-B05, F02-B42 | Planned |
| F02-FR-03 | F02-FR-03.AC1 | F02-B06, F02-B38 | Planned |
| F02-FR-03 | F02-FR-03.AC2 | F02-B07, F02-B11, F02-B15 | Planned |
| F02-FR-03 | F02-FR-03.AC3 | F02-B08, F02-B17 | Planned |
| F02-FR-04 | F02-FR-04.AC1 | F02-B09, F02-B37, F02-B40 | Planned |
| F02-FR-04 | F02-FR-04.AC2 | F02-B01, F02-B09, F02-B40 | Planned |
| F02-FR-04 | F02-FR-04.AC3 | F02-B10, F02-B31 | Planned |
| F02-FR-05 | F02-FR-05.AC1 | F02-B07, F02-B11, F02-B37 | Planned |
| F02-FR-05 | F02-FR-05.AC2 | F02-B10, F02-B11, F02-B28 | Planned |
| F02-FR-05 | F02-FR-05.AC3 | F02-B12, F02-B13, F02-B14, F02-B32 | Planned |
| F02-FR-06 | F02-FR-06.AC1 | F02-B13, F02-B14, F02-B20 | Planned |
| F02-FR-06 | F02-FR-06.AC2 | F02-B15, F02-B22 | Planned |
| F02-FR-06 | F02-FR-06.AC3 | F02-B08, F02-B16, F02-B44 | Planned |
| F02-FR-06 | F02-FR-06.AC4 | F02-B17, F02-B18, F02-B44 | Planned |
| F02-FR-07 | F02-FR-07.AC1 | F02-B12, F02-B17, F02-B19 | Planned |
| F02-FR-07 | F02-FR-07.AC2 | F02-B20, F02-B35, F02-B39 | Planned |
| F02-FR-07 | F02-FR-07.AC3 | F02-B05, F02-B13, F02-B20, F02-B35 | Planned |
| F02-FR-08 | F02-FR-08.AC1 | F02-B21, F02-B32 | Planned |
| F02-FR-08 | F02-FR-08.AC2 | F02-B22, F02-B37 | Planned |
| F02-FR-08 | F02-FR-08.AC3 | F02-B21, F02-B23, F02-B34 | Planned |
| F02-FR-09 | F02-FR-09.AC1 | F02-B14, F02-B15, F02-B18, F02-B22 | Planned |
| F02-FR-09 | F02-FR-09.AC2 | F02-B21, F02-B22, F02-B25 | Planned |
| F02-FR-09 | F02-FR-09.AC3 | F02-B31, F02-B45 | Planned |
| F02-FR-10 | F02-FR-10.AC1 | F02-B24, F02-B38 | Planned |
| F02-FR-10 | F02-FR-10.AC2 | F02-B18, F02-B21, F02-B25 | Planned |
| F02-FR-10 | F02-FR-10.AC3 | F02-B26, F02-B37 | Planned |
| F02-FR-10 | F02-FR-10.AC4 | F02-B27, F02-B29 | Planned |
| F02-FR-11 | F02-FR-11.AC1 | F02-B23, F02-B28 | Planned |
| F02-FR-11 | F02-FR-11.AC2 | F02-B29, F02-B36 | Planned |
| F02-FR-11 | F02-FR-11.AC3 | F02-B23, F02-B30, F02-B34 | Planned |
| F02-FR-12 | F02-FR-12.AC1 | F02-B10, F02-B31, F02-B38 | Planned |
| F02-FR-12 | F02-FR-12.AC2 | F02-B10, F02-B31, F02-B45 | Planned |
| F02-FR-13 | F02-FR-13.AC1 | F02-B22, F02-B29, F02-B32, F02-B35 | Planned |
| F02-FR-13 | F02-FR-13.AC2 | F02-B12, F02-B29, F02-B32, F02-B33 | Planned |
| F02-FR-13 | F02-FR-13.AC3 | F02-B30, F02-B34, F02-B35 | Planned |
| F02-NFR-01 | F02-NFR-01.AC1 | F02-B01, F02-B02, F02-B22, F02-B32, F02-B33 | Planned |
| F02-NFR-01 | F02-NFR-01.AC2 | F02-B29, F02-B33, F02-B36 | Planned |
| F02-NFR-02 | F02-NFR-02.AC1 | F02-B06, F02-B08, F02-B20, F02-B24, F02-B34, F02-B38 | Planned |
| F02-NFR-02 | F02-NFR-02.AC2 | F02-B39 | Planned |
| F02-NFR-03 | F02-NFR-03.AC1 | F02-B04, F02-B17, F02-B19, F02-B26, F02-B37 | Planned |
| F02-NFR-03 | F02-NFR-03.AC2 | F02-B25, F02-B37, F02-B41 | Planned |
| F02-NFR-04 | F02-NFR-04.AC1 | F02-B05, F02-B09, F02-B40, F02-B42 | Planned |
| F02-NFR-04 | F02-NFR-04.AC2 | F02-B10, F02-B20, F02-B42 | Planned |
| F02-NFR-04 | F02-NFR-04.AC3 | F02-B45 | Planned |
| F02-NFR-05 | F02-NFR-05.AC1 | F02-B46 (entire inventory) | Planned |
| F02-NFR-05 | F02-NFR-05.AC2 | F02-B38, F02-B39, F02-B43, F02-B46 | Planned |

Requirement coverage is **13 functional + 5 non-functional = 18**; acceptance coverage is **40 functional + 11 non-functional = 51**. The approved legacy clarification is additional normative coverage in B01/B09/B40/B41/B42, read together with the original FR-04 AC rows. It does not delete/renumber an AC or claim an older preview can prove its original generated topic.

Additional design-obligation coverage: strict/error/state DTO grammar and storage validity B02/B03/B33; CAS/revision/time/key retention B04/B14–B18/B25/B37/B41/B44; READ COMMITTED parent-before-version rollback B12/B14/B19; eligibility/ordering/corrupt retrieval B23/B29/B30/B41; app/Netlify and migration rollout B41/B43; retained expired Outlet/identity transition B20/B35; shared-file ownership and Dev1 handoff B45. These are design verification obligations awaiting approval, not silently new product requirements.

## Planned execution and reporting gate

No commands below were run for acceptance during drafting. New test paths do not yet exist and are proposals until approved. Use actual Node24/npm11 (`.nvmrc`/engines); record executable/version, command, runtime/environment, verified target, case IDs, tier, result, evidence location and cleanup. Fail fast, at most three meaningful evidence-backed repair attempts per runbook. Separate functional, standards and security review verdicts are required; a green build cannot replace them.

Before connected verification, confirm owned PostgreSQL17 test target and explicit identical `DATABASE_URL`, `DATABASE_URL_POOLED`, `TEST_DATABASE_URL`, `E2E_TEST_DATABASE_URL`. Use synthetic auth secret and local allowed origins, `NODE_ENV=test`, `AI_PROVIDER=fake`, external Google/SMTP/SoC/OAuth credentials blank; do not print secrets/URLs containing credentials. Verify protocol/loopback host/`_test` suffix/no query/hash and connected database identity. Existing target validator applies. Offline Prisma generation/validation may use a placeholder only; migrations/seed require a real verified target. Never reset a shared/unknown database.

| Future evidence group | Exact command sequence / prerequisites | Cases supported | Status |
| --- | --- | --- | --- |
| Runtime/static/contracts | `node --version`; `npm --version`; `npm run db:generate`; `npm run db:validate`; `npm run test -- packages/contracts/test/f01-contracts.test.ts packages/contracts/test/f02-contracts.test.ts`; `npm run test:api`; `npm run lint`; `npm run typecheck`; `npm run format:check`; `npm run build`. Installed dependencies and development build configuration required; each command separate, stop first failure. Build includes declaration emit. | C/D cases, B42/B43; not PG/browser/manual proof | Planned |
| Real persistence, existing isolated target | After target verification: `npm run db:deploy`; `npm run db:seed`; `npm run test:integration -- tests/integration/f02-publication.test.ts`; `npm run test:integration`. Rehearse old-schema synthetic fixtures/migration and scoped SQL trigger/proxy faults; remove faults in finally cleanup. | H/P/MIG cases | Planned |
| Disposable full DB verification | `npm run db:verify`. Requires working Docker/PostgreSQL17; inspected script owns disposable loopback target/container, sets its matching URLs, applies migrations/seeds twice/full integration, and cleans it up. Verify prerequisites/target ownership first. | H/P/MIG plus existing integration regression | Planned |
| Browser doubles | `npm run test:e2e -- tests/e2e/f02-instructor.spec.ts tests/e2e/f02-learner.spec.ts`. Playwright Chromium installed; owns ports3001/5173, no unknown-server reuse; config sets local origins and fake AI. Label intercepted requests as B, not E. | B cases | Planned |
| Composed local journey | Set `E2E_AUTH_COMPLETION=1`, leave `E2E_REAL_AUTH` unset, explicit owned migrated E2E target; private captured outbox/local cookies/PG/fake AI. `npm run test:e2e -- tests/e2e/f02-composed.spec.ts tests/e2e/f01-composed.spec.ts --workers=1`. Own loopback proxy provides committed-response loss. | E cases, especially B16–B18/B35/B37/B40 | Planned |
| Browser regression | `npm run test:e2e -- tests/e2e/f01-instructor.spec.ts tests/e2e/auth-feedback.spec.ts tests/e2e/app-shell.spec.ts`. Retain auth/deep-link/sign-out regressions and only approved F02 assertion updates. | B20/B35/B42 | Planned |
| Manual accessibility/visual | Perform named A-Keyboard/Focus/Announcements and A-Responsive/Contrast/Unload observations from B38/B39 on desktop/mobile, actual screen reader/browser and zoom; retain observations/screenshots/limitations separately. No command claims this evidence. | B38/B39 and supporting mapped UI AC | Planned |
| Production artifact | After local production build: `node --import tsx scripts/verify-built-frontend.ts`; `node scripts/package-netlify-artifact.mjs <absolute-netlify-cli-27.16.1-package.json>`; `node --import tsx scripts/verify-netlify-artifact.ts <absolute-extracted-netlify/functions/api.mjs>`. Replace angle-bracket arguments with verified local absolute paths; pinned CLI/local extracted ZIP and matching verified PG URLs/cookies required. No upload/link/deploy. | B43 / N, B29/B37 composed smoke | Planned |
| Node24 CI | Existing `.github/workflows/ci.yml`: `npm ci`; `python3 -B -m unittest discover -s tests/workflow -v`; `npm run format:check`; `npm run lint`; `npm run typecheck`; `npm run db:validate`; `npm run db:deploy`; `npm run db:seed`; `npm test`; `npm run test:integration`; `npm audit --audit-level=moderate`; `npm run build`. Browser job `npm ci`; `npx playwright install --with-deps chromium`; `npm run test:e2e`. Existing verify service is loopback PG17 *_test; browser job currently supplies no PG service/composed flag, so composed evidence needs an explicitly provisioned owned target/job before claiming CI E coverage. | Deterministic CI evidence only; no CI run observed | Planned |

Semicolons in the table separate documented commands, not a shell instruction to ignore failures. A future runner must execute each command and stop on failure. Any targeted fixtures/flags needed by newly approved tests must be recorded in the implementation handoff, not guessed now. Existing command/config facts are source inspection only; no new tests, checks, migrations, packages or CI runs have been performed here.

Functional hints are **Excluded — Developer 1 owns future integration**. This is the sole owned deferral, not an F02 AC status: disabled Get Hint/no-request behavior and no hint prerequisite are included now in B10/B31. No hint delivery/authoring/API/approval/provider acceptance is invented. F02 changes no generation policy, so inherited provider/prompt/token/latency/limit/retry/semantic acceptance remains separate F01 evidence. No additional live-provider acceptance/calls are required or claimed for unchanged generation; fake AI proves no live semantic correctness.

B45 tooling check scope (Planned): only after human exact-package decision approves TDD §2's enumerated exception, apply those exact `.prettierignore` entries before full formatting checks. For every listed existing snapshot and conditionally exempted generated report, `npx prettier --file-info <exact-snapshot-path>` must report ignored=true; negative control `npx prettier --file-info docs/UserGuide.md` must report ignored=false. Run `npx prettier --check docs/DeveloperGuide.md docs/UserGuide.md workflow/agents/FEATURE_MAP.md` and explicitly named mutable coordinator Markdown paths, then `npm run format:check`. Reverify frozen snapshot hashes against ledger/backup after copy and after checks. Never reformat approved bytes or ignore whole F02 directories/evidence. This note records the complete targeted TDD correction read against its original frozen backup; it changes no product/AC/seam behavior and authorizes no config edits now.

Completion requires owner-confirmed seams/exact package, separate implementation authorization, all mapped F02 cases performed with honest tiered results, required static/build/real-PG/browser/package/CI checks and independent reviews, with outstanding manual observations explicitly unresolved. No deferred F02 acceptance may be treated as complete. Published content remains human-reviewed, not proven Python/pedagogical correctness. Drafting checks (hashes, full-ID coverage, links) establish document integrity only; they do not change any Planned status.
