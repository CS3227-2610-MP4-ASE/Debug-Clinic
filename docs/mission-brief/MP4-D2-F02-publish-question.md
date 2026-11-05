# MP4-D2-F02 — Publish questions

**Mission Brief v4 — scope consolidated; shared understanding confirmed; PRD drafting authorized**  
**Owner:** Developer 2 · **Date:** 2026-11-06 (Asia/Singapore)

The owner approved v1, directed the hint-scope amendment, accepted Q4/Q7–Q10, and on 2026-11-06 confirmed Q11–Q13 and the combined shared understanding with **“Confirmed. Draft the PRD”**. All Q1–Q13 product decisions are settled. Provenance is recorded separately in the [ApprovalRecord](../features/MP4-D2-F02/ApprovalRecord.md), including REQUIREMENTS-ROUND-03 / SHARED-UNDERSTANDING-01, and [GrillingDecisions](../features/MP4-D2-F02/GrillingDecisions.md). This brief is not an approved PRD, technical design, or implementation authorization.

## Goal and user request

Enable an **INSTRUCTOR** to turn their generated question drafts into reviewed, published questions and manage the continued availability of their own published questions. Include a minimal **LEARNER** view so publication can be verified from the learner's perspective.

The owner's request is:

> user should publish the questions generated from previous feature implementation. User can either publish straight after generating a draft, or select from the drafted questions. User can Review, edit, and publish their own question drafts. User can also remove or delete their published questions.

The owner additionally requires: **“Once published, no changes can be made (only removal or deletion allowed).”** The learner UI is **“a minimally viable learner UI to view the published questions by instructors for verification purpose”.**

## Starting point and owner-directed hint boundary

Read-only source investigation reports that F01 supports generating an editable, unsaved preview and saving it as a private instructor-owned draft. Its saved draft list and detail are currently read-only; saving creates a new draft rather than updating an existing one. It does not implement publication, saved-draft editing, or learner browsing of published questions. The learner dashboard is a placeholder. These are source observations, not runtime verification.

[PRODUCT.md](../../PRODUCT.md) still states that every published exercise has **exactly three approved, ordered hint stages**. The owner's explicit F02 amendment supersedes that publication prerequisite for this slice: **publication must work without hint records or hint approval**. The owner said: “hints are LEARNER side feature, will be developed by dev 1” and “Hints are not part of this implementation.” Developer 1 owns future hint behavior and integration.

F02 includes only the requested nonfunctional **Get Hint** button in the learner view, accepted as disabled with “Coming soon” explanatory text. It includes no hint authoring, approval, generation, delivery, backend contract, or provider calls. The later package must record compatibility and Developer 1 handoff obligations and any required PRODUCT.md alignment. No shared product-document or schema changes are authorized at this brief stage. F02 neither freezes nor mutates a future Developer 1 hint-feature contract.

Existing question explanations and corrected solutions are instructor-only. API-enforced role and ownership checks and human review before learner access remain applicable. Source investigation also reports that existing attempt references can constrain permanent deletion; the accepted removal approach retains the question record without expanding this feature into learner attempts.

## Scope and accepted clarifications

1. **Both publication entry points.** An instructor can publish immediately after reviewing a generated draft or select one of their saved drafts to review, edit, and publish. A separate Save is not required before Publish: publication persists the reviewed form. If publication fails, retain the instructor's edits for recovery. Retries from the same generated preview resolve to the same question after a lost response; disable duplicate Publish clicks while pending. Hint records and approval do not gate publication.
2. **Review and edit owned drafts.** Before publication, allow editing all six question fields: title, problemStatement, buggyCode, expectedBehavior, bugExplanation, and correctedSolution. Topic remains fixed. An explicit **Save changes** updates the same saved draft. Warn before leaving and discarding unsaved edits; preserve edits after failed Save or Publish. Autosave and recovery across reloads are excluded.
3. **Publish with instructor control.** Require the explicit confirmation: **“I have reviewed this question and understand that published content cannot be edited.”** Publish the reviewed current edits and make the question available through the learner verification view. Enforce ownership, roles, and applicable question validation through the backend. Do not expose another instructor's private draft or instructor-only content. Reject stale concurrent changes to the same draft with reload feedback. A repeated Publish of the same saved draft returns its existing publication rather than creating another.
4. **Keep published question content immutable.** Once published, question content cannot be edited; management permits only the accepted Remove/archive action. This restriction concerns question content and does not define future hint-feature behavior.
5. **Manage own questions.** Provide own **Drafts**, **Published**, and **Removed** views: drafts support edit/publish, published questions support view/remove, and removed questions are read-only. A confirmed **Remove** action uses the existing `ARCHIVED` state, retaining the immutable instructor record. Hide removed questions from future learner list and detail requests. An already-open learner page may retain loaded content until refresh or navigation; no live push is required. Include no hard-delete, restore, or republish UI.
6. **Minimal learner verification view.** All signed-in learners can discover published questions from all instructors through a newest-published-first list and read-only detail. The list shows title, topic, instructor display name, and publication time. Detail question content is limited to title, topic, problem statement, buggy code, and expected behavior. Do not expose hints, bug explanations, or corrected solutions. Include the disabled **Get Hint** button with “Coming soon” text for later Developer 1 integration, plus clear empty, unavailable, and failure states within this narrow flow.

The included instructor and learner interactions must follow the product's keyboard, focus, semantic, responsive, contrast, and recoverable-error expectations. Detailed screens, APIs, data structures, and numerical limits belong in later approved artifacts.

## Explicit exclusions

- Learner answering, attempt creation or execution, coaching, submissions, grading, and instructor assessment of submissions.
- Learner access to instructor-only solutions or explanations.
- All functional hint work: authoring, approval, generation, delivery, backend contracts, and provider calls. Only the nonfunctional learner button is included.
- New AI generation capabilities or additional model-provider calls.
- Bulk publication/removal workflows, arbitrary Python execution, deployment, and live infrastructure changes.

Both publishing entry points, editing saved drafts, the accepted Remove/archive behavior, and the minimal learner verification UI remain included.

## Settled product boundary

**Q4 accepted:** the single confirmed Remove/archive action above satisfies the requested removal/deletion scope. The owner also accepted publication review confirmation, unsaved-leave warning and failure recovery, stale-draft rejection and same-saved-draft publication retries, and the learner browsing/placeholder presentation described above.

Q11–Q13 are also accepted: future learner requests hide removed questions while already-loaded content may remain until refresh/navigation; same-generated-preview Publish retries resolve to the same question and pending duplicate clicks are disabled; instructor management uses own Drafts/Published/Removed views with the actions specified above. The owner explicitly confirmed the combined shared understanding. No product-decision frontier remains for this slice. The PRD will express these settled outcomes as requirements and acceptance criteria.

## Completion boundary and next gate

The eventual feature should demonstrate both publication paths, same-draft editing/saving, explicit review confirmation, retained edits after Save/Publish failure, publication without hints, stale-draft rejection, saved-draft and generated-preview publication retries, immutable published question content, confirmed removal and its agreed learner visibility, instructor management views, ownership/privacy enforcement, and learner browsing with the disabled hint placeholder. The PRD will define stable requirements and acceptance criteria; this brief does not fix their implementation or test contracts.

**Current gate: PRD drafting authorized; PRD not yet approved.** The owner's shared-understanding confirmation authorizes drafting the PRD from this consolidated scope and the recorded decisions. Obtain human approval of the complete PRD, then prepare TDD and Requirements-to-Tests, obtain an independent review of the complete package, resolve blocking findings, and request human package approval. **No implementation authorization has been given.** Implementation requires separate explicit authorization after those gates, following the [workflow runbook](../../workflow/agents/README.md).
