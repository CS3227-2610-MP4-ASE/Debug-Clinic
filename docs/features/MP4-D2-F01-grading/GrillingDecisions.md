# MP4-D2-F01 — Manual submission grading decisions

**Q1–Q13 accepted. Shared understanding confirmed on 2026-11-10 (Asia/Singapore).**

[Mission Brief](../../mission-brief/MP4-D2-F01-grading.md) scope was approved in [SCOPE-APPROVAL-01](ApprovalRecord.md#scope-approval-01). The question owner manually grades a learner's final submitted answer on a 1–10 scale. The submitting learner sees the score after grading is complete. Developer 2 owns grading on both surfaces. Drafts remain private, and grading does not change the submitted answer.

## Round 1: first product decisions

The owner accepted Q1–Q7 in [REQUIREMENTS-ROUND-01](ApprovalRecord.md#requirements-round-01).

| ID | Decision | Confirmed outcome |
| --- | --- | --- |
| Q1 | Instructor intake | **Submissions** queue linked from the instructor dashboard. |
| Q2 | Learner result placement | Show **Awaiting grade** or the saved score, such as **8/10**, in the read-only final submission view. |
| Q3 | Active result freshness | While the result view is active, update within 15 seconds under normal connectivity without manual refresh. A newly opened view loads the current result. |
| Q4 | Grade format | One whole number from 1 through 10 inclusive; no comment or separate verdict in this slice. |
| Q5 | Completion and correction | Explicit **Save grade** makes the score available to the learner. The owning instructor can correct it with another explicit save. |
| Q6 | Existing submissions | Existing and new final submissions for the owner's questions follow the same rules. |
| Q7 | Removed questions | Existing final submissions remain gradable and the submitting learner retains private access to their own result. The removed question remains unavailable for browsing and new attempts. |

## Round 2: queue, private results, and recovery

The owner accepted Q8–Q13 and authorized the PRD in [REQUIREMENTS-ROUND-02](ApprovalRecord.md#requirements-round-02--shared-understanding-01).

| ID | Decision | Confirmed outcome |
| --- | --- | --- |
| Q8 | Queue views and order | Default to **Awaiting grade**, oldest submission first. A **Graded** view shows the most recent grade saves first. Rows show question title, learner display name, submission time, and status or current score. |
| Q9 | Instructor detail | Show the exact submitted code and reasoning alongside the question title, problem, and expected behavior. Show the current score if graded. Use learner display name and omit email. |
| Q10 | Learner access after removal | Link **My submissions** from the learner dashboard. List the learner's own final submissions, newest first, with title, submission time and grading status. Opening an entry shows that submission's read-only result, including for removed questions. Keep the score in the result view. |
| Q11 | Simultaneous grading edits and learner freshness | A stale form cannot silently overwrite a newer score. Show the latest saved score and retain the instructor's unsaved choice so they can decide whether to apply it. Corrections follow the same 15-second visibility rule. |
| Q12 | Grade save failure or uncertain outcome | Keep the score the instructor entered. Confirm the stored grade before declaring success or offering a retry after an uncertain save. If that check fails, show that the outcome could not be confirmed. |
| Q13 | Learner result load and update failures | Show **Result unavailable** if no result could be loaded. If a refresh fails after loading, keep the last confirmed result and indicate that it may be out of date until the app reconnects or the learner retries. |
