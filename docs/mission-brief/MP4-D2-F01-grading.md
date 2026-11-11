# MP4-D2-F01 — Manual submission grading

**Mission Brief v1.1** · **2026-11-10 (Asia/Singapore)** · **Owner Developer 2**

**Status** · Scope approved; requirements clarification in progress. [Approval record](../features/MP4-D2-F01-grading/ApprovalRecord.md)

The artifact key `MP4-D2-F01-grading` distinguishes this slice from the historical `MP4-D2-F01` question-generation package while retaining the requested feature ID in the title. [Question-generation mission brief](MP4-D2-F01-generate-question.md)

## Confirmed intent

> After learner submits an answer to a question, the instructor of that question should receive the student's answer and grade it manually with a score index from 1-10. After grading finishes, it will be automatically reflected on the learner's UI.

- **Instructor, the primary user.** The instructor who owns the question receives access to the learner's final submitted answer and assigns a score on the 1–10 scale.
- **Learner.** The learner who submitted the answer sees the resulting score for that submission once grading is complete. Display follows instructor completion without a separate release step.
- **Delivery ownership.** Developer 2 owns the grading work on both surfaces. The learner-side scope is limited to reflecting the grade and its state within the learner experience.

## Current behavior from source

- A learner submits their own proposed code and reasoning for a published question. The backend stores an attempt for that learner and exercise version. A successful final submission becomes `FINAL_SUBMITTED` and remains read-only. An identical submit retry returns the same final attempt. The published-question page calls the existing submit route. [Learner question page](../../apps/frontend/src/pages/PublishedQuestionPage.tsx), [API routes](../../apps/backend/src/app.ts), [attempt service](../../apps/backend/src/exercises/learner-attempts.ts)
- The product describes a final human review loop. The schema links each attempt to its exercise version, each exercise to its author, and each attempt to at most one `Review`. `Review` requires an instructor, a decision, and a comment, with no numeric score field. The Developer Guide records that the review model has no instructor submission-review route or interface. The learner attempt contract contains no grade. [Product](../../PRODUCT.md), [Prisma schema](../../prisma/schema.prisma), [Developer Guide](../DeveloperGuide.md#security-notes), [learner attempt contract](../../packages/contracts/src/learner-attempts.ts)

## Proposed scope boundaries

- Grading starts from the immutable final attempt and uses the submitted code and reasoning. Draft saves and unsubmitted edits stay private to the learner. The API enforces the existing role and session boundaries, with instructor access restricted to submissions for their own questions and learner grade access restricted to their own submissions.
- Preserve existing learner browsing, draft saves, submission and recovery behavior, and finalized attempt contents. Grading uses the existing question ownership relationship. Keep the question publication and removal workflows as they are.
- Proposed exclusions are automatic or AI grading, bulk grading, grade exports or analytics, delegated graders, and learner resubmission or appeals. The product decisions below define the initial manual grading experience.

## Confirmed requirements direction

- **Instructor intake.** Find final submissions in a **Submissions** queue linked from the instructor dashboard. Both existing and new final submissions qualify.
- **Learner visibility.** Show **Awaiting grade** or the score in the read-only final submission view. A newly opened view shows the current result. An active view updates within 15 seconds under normal connectivity.
- **Grading lifecycle.** Enter one whole number from 1 through 10. **Save grade** completes grading and makes the score available to the learner. The owning instructor can explicitly save a correction. This slice collects only a score.
- **Removed questions.** Existing final submissions remain gradable and their results remain privately accessible to the submitting learner. Removed questions stay unavailable for browsing and new attempts. The current published-question route does not serve archived questions, so the requirements must define how learners find those results. [Attempt service](../../apps/backend/src/exercises/learner-attempts.ts), [Developer Guide](../DeveloperGuide.md#reviewed-publication-and-withdrawal)

Queue behavior, result access, and save and refresh recovery are being clarified in the [decision ledger](../features/MP4-D2-F01-grading/GrillingDecisions.md). Persistence compatibility with the existing `Review` model belongs in the technical design.

## Scope-level completion evidence

- A learner uses the existing final submit flow. The question owner can open the exact submitted code and reasoning and complete manual grading with a score on the requested scale. Out-of-range values cannot complete grading. An unsubmitted draft stays outside the grading flow.
- After completion, the submitting learner sees the persisted score on the same submission through the agreed learner UI behavior. An ungraded final submission has no completed score. The submitted answer remains read-only and intact.
- Another instructor cannot access or grade the submission, another learner cannot see the grade, and existing learner draft, submission, and recovery behavior remains usable.

## Approval gate

The owner approved scope and confirmed the first round of decisions. Complete the remaining requirements decisions and confirm shared understanding before drafting the PRD. The planning and implementation gates follow the repository runbook. [MP4 agent workflow](../../workflow/agents/README.md#planning-gates)
