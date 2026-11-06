# MP4-D2-F02 requirements decisions

Status: interview complete; all Q1–Q13 settled; shared understanding confirmed; PRD drafting authorized.
Date: 2026-11-06, Asia/Singapore. Scope approval: SCOPE-APPROVAL-01 in [ApprovalRecord.md](ApprovalRecord.md).

## Confirmed constraints

- Approved original Mission Brief v1 SHA-256 `b834da33099f368ddd42748539353369c4a095f77b9abced2e60dffe97a8f22b`; superseded hint scope by explicit SCOPE-AMENDMENT-01. Current consolidated v4 SHA-256 `8926bd04749633665d208065dbb94dc7cd101e413d67fef596efae092e4c5487` incorporates complete Q1–Q13 and shared-understanding confirmation. Earlier v2 `c6514f1be7d5b92f4add999c09575e26568128db1ecf141d26c613f0acfa7dc9` and v3 `43f981aaad9ba342cf6093bbfcd1886f6f78b71d434f139f37b5ed50852d3cd2` retained in dated recovery snapshots.
- INSTRUCTOR owns and reviews/edits drafts; both generated-preview and saved-draft publication paths are included.
- Published question content is immutable; only agreed removal/deletion operations follow publication. F02 does not define a future Developer 1 hint-content lifecycle.
- Hints are owned by Developer 1's learner feature and excluded from F02. Publication must not require hint existence/approval in this slice. This owner-directed feature exception supersedes the inherited three-hint prerequisite in PRODUCT.md. Include only a nonfunctional learner Get Hint placeholder; no hint content, authoring, approval, generation, API or provider calls.
- No new AI generation/provider calls, Python execution or learner attempt/coaching/submission/grading workflow.
- A minimal LEARNER published-question view is included. Instructor-only bug explanations and corrected solutions remain private.

## Decision tree and current frontier

Owner answer: “Accept all except Q2 and Q4”, followed by the hint ownership/placeholder correction and request for easiest Q4 recommendation. See full provenance in ApprovalRecord.md. Recommendations not explicitly accepted remain proposals.

| Root decision | Recorded outcome | Dependent decisions reserved for later rounds |
| --- | --- | --- |
| Q1 — Draft editing and saving | ACCEPTED: edit six existing question fields; topic fixed; explicit Save changes updates same draft | Recovery/concurrency settled by Q8/Q9 |
| Q2 — Hint ownership | REPLACED by owner: Dev1 owns hints; F02 has nonfunctional Get Hint placeholder only, with no hint publication prerequisite | Disabled button/Coming soon accepted by Q10; future Dev1 implementation remains deferred |
| Q3 — Immediate publication path | ACCEPTED: Publish from current generated preview without separate Save; persist reviewed content; failure preserves edits | Q7/Q12 review/retries settled |
| Q4 — Removal/deletion meanings | ACCEPTED in round 2: one confirmed Remove action archives, retains immutable owner record, hides learners; no hard delete/restore/republish | Q11/Q13 freshness/management settled |
| Q5 — Learner audience | ACCEPTED: all signed-in learners see all instructors' published questions; no course/enrollment filters | Q10 browsing settled; ordinary empty/error/validation refinements belong in draft PRD |
| Q6 — Learner content | ACCEPTED: title/topic/problem/buggy code/expected behavior; hide hints/bug explanation/corrected solution | Q10/Q11 presentation/removal settled; established accessibility applies |

## Round 2 outcomes — accepted

- Q4: single confirmed Remove/archive action, retained immutable instructor record; no permanent delete/restoration/republication.
- Q7: confirmation text “I have reviewed this question and understand that published content cannot be edited.” Publishing uses current edits without requiring a separate Save.
- Q8: warn before discarding unsaved edits; failed Save/Publish preserves edits in current page; no autosave or cross-reload recovery.
- Q9: reject stale saves/publishes with reload feedback; repeated Publish on the same saved draft returns the existing publication. The generated-preview response-loss case remains Q12; no network exactly-once delivery claim.
- Q10: newest-published-first learner list plus read-only detail; title/topic/instructor display name/publication time in list, accepted public question fields in detail; Get Hint disabled with Coming soon explanation.

Owner reply: “accept all recommendations.” See REQUIREMENTS-ROUND-02 in ApprovalRecord.md.

## Final dependent decisions — accepted

- Q11 removal freshness: removed questions disappear from subsequent learner list/detail retrievals; a page already open can retain loaded content until refresh/navigation. No live push/polling or retroactive erasure of already viewed content. Instructor retains a read-only removed record.
- Q12 immediate-publication retries: retrying Publish for the same generated preview must resolve to the same question after a response is lost; disable duplicate clicks while pending and preserve edits on failure. This is an observable no-duplicate requirement; implementation belongs in TDD. New question explicitly begins a new preview/workflow; existing F01 intentional Save behavior need not be silently changed.
- Q13 instructor management: own Drafts, Published and Removed views; Drafts editable with Save changes/Publish; Published read-only with Remove; Removed read-only. No new draft deletion, restoration, copy or republication workflow.

Owner reply: **“Confirmed. Draft the PRD”**. REQUIREMENTS-ROUND-03 / SHARED-UNDERSTANDING-01 accepts Q11–Q13 and confirms the combined complete requirements. Current frontier: **empty**. All product branches settled; future Dev1 hint behavior is an explicit owned deferral, not an unanswered F02 choice.

Next authorized action: fresh scoped PRD writer, using complete final Mission Brief, this decision record and ApprovalRecord. PRD remains a draft requiring its own explicit approval. No application/executable-test implementation is authorized.

## Evidence basis

Read-only source grounding is recorded in the assigned feature worktree at `workflow/evaluations/royden/MP4-D2-F02/grounding.md`. It establishes saved-draft read-only behavior, six current question fields, the original three-hint product constraint, instructor-only fields and deletion restrictions from existing attempts. SCOPE-AMENDMENT-01 supersedes that product prerequisite for F02. Existing ARCHIVED status supports the simplest removal proposal without deleting referenced records. These are source facts, not fresh runtime acceptance.
