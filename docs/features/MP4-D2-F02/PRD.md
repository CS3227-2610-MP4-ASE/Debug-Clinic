# MP4-D2-F02 — Publish questions

**PRD v1 · Draft — awaiting owner approval**  
**Workstream:** Developer 2 · **Owner:** Royden · **Draft date:** 2026-11-06 (Asia/Singapore)  
**Approval date/reference:** absent. Drafting is authorized; technical design, package approval and implementation are not.

## Purpose, authority and evidence

Enable instructors to review, edit and publish generated Python debugging questions, manage their availability, and verify publication through a minimal learner view. Success means both publication entry points deliver exactly the reviewed question; private content stays private; published question content stays immutable; removal hides subsequent learner retrievals; and recoverable failures do not silently discard current-page work or create duplicate publications.

The scope authority is [Mission Brief v4](../../mission-brief/MP4-D2-F02-publish-question.md), the complete [Q1–Q13 decisions](GrillingDecisions.md), and [ApprovalRecord](ApprovalRecord.md), especially SCOPE-AMENDMENT-01 and SHARED-UNDERSTANDING-01 (“Confirmed. Draft the PRD”). [AGENTS.md](../../../AGENTS.md), the [workflow](../../../workflow/agents/README.md), and [coding standards](../../CodingStandards.md) govern delivery. This draft expresses those decisions as testable outcomes; its new refinements below require approval of the complete PRD.

SCOPE-AMENDMENT-01 explicitly supersedes [PRODUCT.md](../../../PRODUCT.md)'s three-approved-hints publication prerequisite for F02. Publication requires neither hints nor hint approval. No substitute hint records may be manufactured. Other product principles, including human review, backend authorization and accessibility, apply. Developer 1 owns future hint behavior; question immutability here does not freeze that future contract. Later design/package work must identify required product-document alignment and a concise Developer 1 handoff before implementation; this draft authorizes no shared-document or interface change.

Source grounding at [grounding.md](../../../workflow/evaluations/royden/MP4-D2-F02/grounding.md), corroborated against relevant source, describes baseline `982b0641cd45bf8184bca8e623c36b611af9d898`. F01 currently generates an unsaved editable preview, creates a fresh private draft on each explicit Save, and provides read-only saved list/detail. Learner publication browsing, saved editing, Publish and Remove are absent. These are source observations, not runtime proof. Field rules below retain [the existing authoritative contracts](../../../packages/contracts/src/index.ts). No feature acceptance has been executed for this draft.

## Users, terms and scope

An **INSTRUCTOR** owns their generated previews and saved questions. A **LEARNER** is any signed-in learner; course and enrollment membership do not restrict F02 browsing. A **preview** is current-page unsaved generated content. A **draft** is a privately saved question. **Published** means learner-accessible after explicit instructor review. **Removed** means retained in `ARCHIVED`, unavailable to future learner retrievals. A **reviewed snapshot** is the exact current topic and six fields the instructor confirms for one publication attempt, with the normalization below.

Included: both publication paths; all six editable draft fields with fixed topic; same-draft Save changes; confirmation, cancellation and failure recovery; own Drafts/Published/Removed views; immutable publication; confirmed archival; learner list/detail and a disabled hint placeholder.

Excluded: draft deletion, bulk actions, hard deletion, restore, copy/republication workflows, autosave, cross-reload unsaved recovery, live removal notifications, search/filter features, learner answering/attempts/execution/coaching/submission/grading, instructor assessment, new AI capabilities or provider calls, and all functional hint work. Existing F01 generation remains inherited. Published content is human-reviewed, not a claim of executable correctness or pedagogical certification.

### Proposed PRD refinements for owner approval

These complete observable edge behavior; they were not separately confirmed during grilling:

- **R1 — Bounded browsing:** retain Drafts newest-created-first; Published newest-published-first; Removed newest-removed-first. Ties have repeatable ordering for an unchanged collection. Reuse the existing maximum 50 items per page and **Load more** pattern for all included lists; no snapshot-consistency promise across concurrent changes.
- **R2 — Cancellation and removal:** use the exact application prompts/actions below; an already-removed Remove retry reports the retained removed result without another transition.
- **R3 — Uncertain publication outcome:** while a response-loss outcome remains unresolved, Retry uses the same reviewed snapshot. Further edits cannot silently replace that snapshot or start another publication from it. Resolve the existing outcome first; after a definite failure, editing and a fresh confirmation are available. Starting **New question** explicitly starts a new workflow after the discard warning.

## Functional requirements and acceptance criteria

### F02-FR-01 — Review and validate question content

The instructor can read and edit title, problem statement, buggy Python code, expected behavior, bug explanation and corrected solution before publication. Topic stays read-only after generation and when reopening a saved draft.

| Field | Maximum UTF-16 code units | Normalization |
| --- | ---: | --- |
| Title | 120 | Trim surrounding whitespace; require nonempty |
| Problem statement | 2000 | Trim; require nonempty |
| Buggy Python code | 4000 | Preserve verbatim; reject whitespace-only |
| Expected behavior | 1500 | Trim; require nonempty |
| Bug explanation | 2000 | Trim; require nonempty |
| Corrected solution | 4000 | Preserve verbatim; reject whitespace-only |
| Fixed topic | 300 | Retain F01 trimmed, nonempty topic |

Length means JavaScript string length, including two units for a surrogate pair; prose limits apply after trimming. No syntax execution or semantic proof is added.

- **F02-FR-01.AC1:** Each six-field edit is possible on preview and owned saved draft; topic editing is unavailable and unauthorized topic changes are rejected.
- **F02-FR-01.AC2:** For every field, required/blank and maximum-plus-one values fail; valid exact-maximum values pass. Prose is trimmed and code whitespace/line breaks survive successful persistence verbatim.
- **F02-FR-01.AC3:** Invalid Save/Publish identifies affected fields, retains all entries, and changes no persisted question or learner availability; direct callers face the same validation.

### F02-FR-02 — Save changes to the same private draft

- **F02-FR-02.AC1:** Opening an owned saved draft permits review/edit; **Save changes** persists valid current edits to that same question, creating no additional draft or publication.
- **F02-FR-02.AC2:** Success is announced and reopening/reloading shows the saved content; the question remains private in Drafts.
- **F02-FR-02.AC3:** Edits alone do not persist. The existing preview **Save draft** creation workflow remains available; it retains F01's intentional fresh-draft-per-call semantics and is distinct from Save changes.

### F02-FR-03 — Confirm the current reviewed snapshot

- **F02-FR-03.AC1:** Publish requires an explicit, initially unaccepted confirmation: **“I have reviewed this question and understand that published content cannot be edited.”** Declining/cancelling leaves content, persistence and availability unchanged.
- **F02-FR-03.AC2:** Publish uses the current valid edits, including unsaved changes to a saved draft, without a separate Save. Changing content after confirmation requires review confirmation again; no older confirmed content silently replaces current edits.
- **F02-FR-03.AC3:** Pending publication visibly reports progress and disables duplicate Publish activation and conflicting form actions; completion/failure releases an appropriate next action.

### F02-FR-04 — Publish directly from a generated preview

- **F02-FR-04.AC1:** An instructor with a successful owned F01 preview can confirm and Publish without previously saving. Success durably retains the reviewed question as their publication, makes it learner-accessible, and exposes its read-only owner view.
- **F02-FR-04.AC2:** This path retains the existing valid generation association and fixed topic; another instructor's, missing or unsuccessful generation association cannot authorize publication.
- **F02-FR-04.AC3:** Publication succeeds with no hint records/approval and performs no new generation or hint/provider operation.

### F02-FR-05 — Publish an owned saved draft

- **F02-FR-05.AC1:** From Drafts, an instructor opens, optionally edits, confirms and publishes their saved question. Success moves that same question from Drafts to Published with the reviewed content; no duplicate draft/publication is created.
- **F02-FR-05.AC2:** The publication is available in learner list/detail on subsequent successful retrieval, including when it has no hints.
- **F02-FR-05.AC3:** Invalid, denied, stale or definitively failed publication preserves the prior persisted draft and learner visibility; no partial question becomes learner-visible.

### F02-FR-06 — Handle stale edits and publication retries

- **F02-FR-06.AC1:** When another tab changes the same draft after it was loaded, stale Save changes/Publish is rejected with clear reload feedback. The newer saved content is not overwritten; current local edits remain until the instructor explicitly chooses to discard/reload.
- **F02-FR-06.AC2:** Repeating Publish for an already-published saved draft returns its existing publication. Different stale submitted edits never overwrite it; feedback makes clear that the existing published content is authoritative.
- **F02-FR-06.AC3:** Retrying the same generated preview after a lost publication response resolves to the same question, with one publication and its original reviewed snapshot. Pending duplicate clicks create no additional question.
- **F02-FR-06.AC4:** Under R3, an uncertain result is described as unconfirmed, not proof of rollback. Retry resolves the same snapshot; edits require a definite failure or resolution first. A removed result remains removed and cannot be republished through retry.

### F02-FR-07 — Preserve unsaved work and honest recovery

- **F02-FR-07.AC1:** Failed Save/Publish retains all current-page edits with actionable retry/reload guidance. A definite persistence failure leaves the previously committed state intact; a lost response is handled as uncertain under FR-06.
- **F02-FR-07.AC2:** Leaving an unsaved preview or discarding changed saved fields, including **New question** and in-app navigation, warns: **“You have unsaved changes. Leave and discard them?”** **Stay** retains work; **Leave** discards it and continues. Browser unload uses the browser-supported warning, whose wording is not application-controlled.
- **F02-FR-07.AC3:** No autosave or recovery after accepted reload/unload is promised. A stale-result reload requires explicit discard consent before replacing local edits. Successful Save/Publish is not presented as unsaved work.

### F02-FR-08 — Manage own question states

- **F02-FR-08.AC1:** Own **Drafts**, **Published**, and **Removed** views contain only the signed-in instructor's questions in the corresponding state. Drafts permits edit/Save changes/Publish; Published permits read-only view/Remove; Removed permits read-only view.
- **F02-FR-08.AC2:** Persisted state is reflected on reopening/refresh; a stale open owner view cannot authorize an operation forbidden by the question's current state.
- **F02-FR-08.AC3:** Under R1, each list follows its stated ordering, loads at most 50 entries at a time, and offers Load more only when more are available. Empty views explain their state; Drafts offers New question. No hidden-state or foreign-owner item fills an empty page.

### F02-FR-09 — Keep published question content immutable

- **F02-FR-09.AC1:** After publication, topic and all six question fields cannot be changed by UI or direct caller, including stale Save/Publish requests; rejected attempts change no question content.
- **F02-FR-09.AC2:** The instructor can read the retained full question after publication/removal. Only the accepted Remove state transition is offered after publication; removal does not alter question content.
- **F02-FR-09.AC3:** No hint authoring/delivery contract or future hint lifecycle restriction is inferred from question immutability.

### F02-FR-10 — Confirm removal and retain the record

- **F02-FR-10.AC1:** Under R2, Remove asks **“Remove this question? It will no longer be available to learners. Your read-only record will be retained.”** **Cancel** makes no change; **Remove** confirms. Pending removal suppresses repeated actions and reports progress.
- **F02-FR-10.AC2:** Confirmed success retains the question in `ARCHIVED`, moves it to the owner's Removed view and offers no hard-delete, restore or republish action. Repeated Remove resolves to the already-removed result.
- **F02-FR-10.AC3:** Definite removal failure retains published availability and offers retry. Uncertain completion offers safe retry/refresh without claiming success or erasure; refresh/retry reveals the authoritative state.
- **F02-FR-10.AC4:** Following completed removal, subsequent learner list/detail retrievals exclude the question, including direct detail access. Already-open learner content may remain until navigation/refresh; no push, polling or erasure of previously viewed content is required.

### F02-FR-11 — Browse published questions as a learner

- **F02-FR-11.AC1:** Every signed-in learner can discover currently published questions from all instructors, newest-published-first, without course/enrollment filtering. Each item shows title, topic, instructor display name and publication time and opens read-only detail.
- **F02-FR-11.AC2:** Detail question content includes only title, topic, problem statement, buggy Python code and expected behavior. Learner responses and rendered content never include bug explanation, corrected solution, private generation provenance or hint content.
- **F02-FR-11.AC3:** Under R1, the list uses bounded Load more browsing. An empty successful result clearly says no published questions are available; unavailable/missing/removed/private details provide a safe unavailable state and return-to-list action.

### F02-FR-12 — Present the nonfunctional hint placeholder

- **F02-FR-12.AC1:** Learner detail includes a disabled **Get Hint** button with visible **“Coming soon”** explanatory text. Keyboard/pointer interaction causes no hint request, provider call, content reveal, attempt creation or state mutation.
- **F02-FR-12.AC2:** No hint existence/approval condition blocks browsing or publication. Developer 1's future functional integration remains an explicitly owned dependency, with no invented API promise.

### F02-FR-13 — Enforce access and recoverable retrieval

- **F02-FR-13.AC1:** Unauthenticated access requires sign-in. Wrong-role operations are denied. Instructors cannot read/change/publish/remove another instructor's private or owner-management records, even by guessed identifiers; learners cannot retrieve drafts/removed questions or invoke instructor mutations.
- **F02-FR-13.AC2:** Missing, foreign and unavailable records reveal no protected content or ownership details. Denied/invalid operations produce no persistence or availability change.
- **F02-FR-13.AC3:** List/detail loading is announced; retrieval failure is distinct from an empty successful result and offers Retry. A failed later-page load retains already-loaded items and retries that load without misleading completion. Session expiry produces sign-in guidance without further unauthorized action; unsaved retention is limited to the current page.

## Non-functional requirements

### F02-NFR-01 — Privacy and safe presentation

- **F02-NFR-01.AC1:** Authorization, ownership, validation and immutability hold at the backend independently of controls.
- **F02-NFR-01.AC2:** Render question/code strings literally, including markup-like input; errors/logs expose no credentials, private content, provider output or internal failure details.

### F02-NFR-02 — Accessible, usable journeys

- **F02-NFR-02.AC1:** Included workflows support keyboard navigation, visible focus, semantic headings/labels, announced progress/errors and accessible confirmation/cancellation with sensible focus return.
- **F02-NFR-02.AC2:** Desktop/mobile layouts retain readable code and reachable actions without page-wide clipping; contrast follows the established product theme.

### F02-NFR-03 — Durable and truthful outcomes

- **F02-NFR-03.AC1:** Successful Save changes, Publish and Remove survive reload/new sessions; failures and uncertain responses meet FR-05–07/10 rather than claiming unobserved success.
- **F02-NFR-03.AC2:** Removal retains question identity/content and existing references; no permanent deletion is performed.

### F02-NFR-04 — F01 compatibility and ownership

- **F02-NFR-04.AC1:** Existing generation topic validation/refusals, provider/prompt behavior, usage/provenance handling, fresh preview Save creation, private ownership and safe errors remain compatible.
- **F02-NFR-04.AC2:** Explicitly superseded read-only saved-detail, no-Publish and no-discard-warning expectations are updated for F02; no new provider calls or learner attempt behavior appear.
- **F02-NFR-04.AC3:** Later package identifies shared-contract/product-document ownership and Developer 1 handoff needs without claiming their implementation is approved.

### F02-NFR-05 — Verifiable delivery

- **F02-NFR-05.AC1:** Later Requirements-to-Tests maps every acceptance criterion here to observable evidence, including stale, duplicate, denied, failure and persistence cases.
- **F02-NFR-05.AC2:** Reports distinguish source inspection, simulated boundaries, real persistence, browser/manual accessibility and live-provider evidence; no unperformed acceptance or universal semantic correctness is claimed.

## Decision coverage and requirement index

| Confirmed decision | Requirement coverage |
| --- | --- |
| Q1 six editable fields, fixed topic, same-draft Save | FR-01–02 |
| Q2 owner amendment: Dev1 hints, no hint gate | FR-04.AC3, FR-05.AC2, FR-12; authority/scope; NFR-04 |
| Q3 direct preview Publish and failure retention | FR-03–04, FR-07 |
| Q4 confirmed archive, retention, no restore/delete | FR-09–10; exclusions |
| Q5 all signed-in learners | FR-11, FR-13 |
| Q6 learner field boundary | FR-11.AC2, NFR-01 |
| Q7 exact review confirmation/current edits | FR-03, FR-05 |
| Q8 discard warning, failure retention, no autosave | FR-07 |
| Q9 stale rejection/saved-publication replay | FR-06.AC1–2, FR-09 |
| Q10 learner order/metadata/disabled hint | FR-11–12 |
| Q11 future removal visibility/open-page allowance | FR-10.AC4 |
| Q12 same-preview retry/pending suppression | FR-03.AC3, FR-06.AC3–4 |
| Q13 own three management views/state actions | FR-08–10 |

All abbreviated FR/NFR references in this document carry the `F02-` prefix. Every acceptance bullet has a unique full identifier for later traceability.

| Stable requirement | Traceability subject |
| --- | --- |
| F02-FR-01 | Fields, normalization, validation |
| F02-FR-02 | Same-draft explicit saving |
| F02-FR-03 | Current review and confirmation |
| F02-FR-04 | Preview publication |
| F02-FR-05 | Saved-draft publication |
| F02-FR-06 | Concurrency and retries |
| F02-FR-07 | Discard/cancel/failure recovery |
| F02-FR-08 | Own state-based management |
| F02-FR-09 | Question immutability |
| F02-FR-10 | Confirmed archival and visibility |
| F02-FR-11 | Learner discovery/detail |
| F02-FR-12 | Hint placeholder and deferral |
| F02-FR-13 | Access and retrieval states |
| F02-NFR-01 | Privacy and literal presentation |
| F02-NFR-02 | Accessibility/responsiveness |
| F02-NFR-03 | Persistence and truthful outcomes |
| F02-NFR-04 | F01/Dev1 compatibility |
| F02-NFR-05 | Evidence and traceability |

Approval must bind the complete PRD, including R1–R3. Only then may fresh technical-design and Requirements-to-Tests drafting begin. API signatures, data structures, persistence algorithms, implementation modules and executable tests remain reserved for those later authorized stages.
