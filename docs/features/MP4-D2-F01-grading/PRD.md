# MP4-D2-F01 — Manual submission grading

**Version 1** · **Draft - awaiting owner approval** · **2026-11-10 (Asia/Singapore)** · **Developer 2**

The Mission Brief v1.1 defines the approved feature boundary. The accepted Q1–Q13 ledger governs the product behavior in this draft. On 2026-11-10 SGT, the owner confirmed shared understanding and authorized drafting. The next gate is owner approval of this PRD. [Mission Brief](../../mission-brief/MP4-D2-F01-grading.md) · [Grilling decisions](GrillingDecisions.md) · [Approval record](ApprovalRecord.md#requirements-round-02--shared-understanding-01) · [Planning gates](../../../workflow/agents/README.md#planning-gates)

## Purpose and scope

The instructor who owns a question can find and manually score a learner’s final submitted answer. Once grading completes, the current saved score is available on that learner’s final submission without a separate release action. Developer 2 owns the grading workflow across the instructor and learner surfaces.

Grading builds on the existing signed-in roles, question ownership, final submission, and question removal. The reviewed source at `e4483dd958d7100b066b75e4d48179d356f4c6a3` already supports an immutable final submission and keeps removed questions out of learner browsing and attempts. The instructor grading flow and learner grade result are new in this slice. [Developer Guide](../../DeveloperGuide.md#reviewed-publication-and-withdrawal) · [Existing review status](../../DeveloperGuide.md#security-notes)

The slice includes the instructor’s in-app queue, submission detail, score save and correction, and the learner’s private list and result view. Automatic or AI grading, bulk grading, grade exports, analytics, delegated grading, learner resubmission and appeals are outside the slice.

| Term | Meaning |
| --- | --- |
| Final submission | The learner’s read-only submitted code and reasoning for a specific version of a question. |
| Confirmed grade | The current persisted score for a final submission. A final with no saved score is **Awaiting grade**. |
| Pending score | An instructor’s entered choice before the app has confirmed it is saved. The confirmed grade, if present, is displayed separately. |
| Removed question | An archived question withdrawn from learner browsing and new attempts. Its existing final submissions remain eligible for private grading and result access. |

## Functional requirements and acceptance criteria

### GRD-FR-01 · Instructor submissions queue

Link **Submissions** from the instructor dashboard. Include existing and new finals for the instructor’s own questions, including removed questions. Default to **Awaiting grade**, ordered by submission time from oldest to newest. **Graded** shows the most recently saved grades first, including corrections. Each row shows the question title, learner display name, submission time and the awaiting status or current score, and opens that submission’s detail.

- **GRD-AC-01.** An instructor opens **Submissions** from the dashboard and lands on **Awaiting grade**. With multiple owned ungraded finals, including an existing final and a newly submitted one, the oldest appears first. Each row shows the required details and opens the matching submission.
- **GRD-AC-02.** With several graded finals, **Graded** lists the latest grade saves first and shows each current score. A confirmed first save moves the final to **Graded**, and a confirmed correction places it according to the new save time.
- **GRD-AC-03.** An owned draft or an unsubmitted edit never appears in either queue view. An empty view is distinguishable from a view the app could not load.

### GRD-FR-02 · Instructor submission detail

Show the exact submitted code and reasoning alongside the submitted version’s question title, problem and expected behavior. Identify the learner by display name and omit their email. Show the current score when graded, separately from any unsaved choice.

- **GRD-AC-04.** Opening an owned final shows its submitted code and reasoning, including meaningful formatting, with the correct question context and learner display name. The view and its data omit the learner’s email. A graded final also shows its current confirmed score.
- **GRD-AC-05.** After a question is removed, its owned final still appears in the appropriate queue view, opens with the same submitted answer and question context, and can be graded or corrected.

### GRD-FR-03 · First grade and corrections

The owning instructor enters one whole number from 1 through 10 inclusive. Grading collects only the score. **Save grade** explicitly completes an initial grade or applies a correction. A successful save establishes one current persisted score for the submission and makes it immediately available to the learner. While a save is pending, distinguish it from a confirmed grade. An edit left unsaved has no effect on the current result.

- **GRD-AC-06.** An instructor saves a valid score on an ungraded final. Both boundary scores, 1 and 10, are accepted. The instructor’s reopened detail shows the persisted score and the learner’s result shows it without a release action. The form requires no comment or verdict.
- **GRD-AC-07.** An empty entry, nonnumeric entry, fractional value or value outside 1–10 produces a clear validation outcome and cannot create or change a grade. An already graded submission continues to show its confirmed score after an invalid correction.
- **GRD-AC-08.** With a confirmed score of **6/10**, entering 8 leaves the persisted score at **6/10** until a save takes effect. While confirmation is pending, the instructor sees 8 as pending and **6/10** as the last confirmed score. After the correction is confirmed, **8/10** appears as current, including after reopening the submission.

### GRD-FR-04 · Concurrent grading

If a newer grade was saved after the instructor loaded the form, saving from that form cannot silently overwrite it. Show the latest confirmed score, keep the instructor’s choice separately, and let the instructor explicitly decide whether to apply it after seeing the latest score. Apply the same rule when two open forms start from an ungraded submission.

- **GRD-AC-09.** Two forms open an ungraded final. One saves 6, then the other tries to save 8. The saved result stays **6/10**, and the second form shows **6/10** as current and retains 8 as unsaved.
- **GRD-AC-10.** Two forms open a graded final and one saves a correction. An attempt to save from the stale form shows the newer confirmed score and retains the unsaved choice. A subsequent explicit save can apply that choice after review, subject to the same rule if another grade was saved in the meantime.

### GRD-FR-05 · Save failure and recovery

Keep the instructor’s entered score through a save failure or uncertain outcome in the same open grading session. If the save is known to have failed, show the failure and let the instructor retry explicitly. If the outcome is uncertain, check the current stored grade before reporting success or offering a write retry. If the check confirms the intended score as current, show that score as confirmed. If it establishes a different score or no grade, show that result and retain the unsaved choice for an explicit decision. If the check fails, state that the outcome could not be confirmed and let the instructor check again. A check only reads the current grade. Pending input and recovery state belong to that submission and signed-in session.

- **GRD-AC-11.** After a confirmed save failure, the instructor sees the failure, retains the entered value, and can explicitly retry. The learner continues to see the existing confirmed score or **Awaiting grade** if the final has no grade.
- **GRD-AC-12.** If the reply is lost after the grade was saved, a successful check shows the persisted score as confirmed without a second write.
- **GRD-AC-13.** If an uncertain save is followed by a check confirming a different score or no grade, the form shows that confirmed state and keeps the entered value available for a deliberate save. Any newer grade is protected by GRD-FR-04.
- **GRD-AC-14.** If the check also fails, the same open form keeps the entered score, shows that the outcome is unconfirmed, and offers another check without offering a write retry. A later successful check restores the appropriate confirmed state and action.

### GRD-FR-06 · Learner submissions and private result

Link **My submissions** from the learner dashboard. List the learner’s own finals newest first by submission time, with question title, submission time and grading status. Keep the numeric score in the read-only final submission view. Opening a list entry shows the matching final and its grade state, including for removed questions. For an available question, show the same grade state in the existing read-only final submission view reached through the question.

- **GRD-AC-15.** A learner opens **My submissions** from the dashboard. Their final submissions appear newest first with title, submission time and grading status. Drafts, other learners’ finals and numeric scores are absent from the list.
- **GRD-AC-16.** A learner opens their final from **My submissions** or through its still-available question. Each entry point shows the matching read-only final with **Awaiting grade** when ungraded or the current score in the form **8/10** when graded.
- **GRD-AC-17.** After removal, the submitting learner can still open the final and see its current grade state through **My submissions**. Learner browsing and new attempts for the removed question remain blocked.

### GRD-FR-07 · Learner result freshness and recovery

A newly opened final result view loads the current persisted grade state. While the learner keeps the result view open and active under normal connectivity, an initial grade or correction appears within 15 seconds of being saved, without a manual refresh. If the initial result cannot be loaded, show **Result unavailable**. If an update fails after a successful load, keep the last confirmed state and indicate it may be out of date. Let the learner retry and resume current results when the app reconnects successfully. Clear the stale or unavailable indication after a successful result load.

- **GRD-AC-18.** A newly opened result shows the current persisted score even if the learner last saw an older score or **Awaiting grade**.
- **GRD-AC-19.** While a result view is open and active with normal connectivity, an initial score and a later correction each appear within 15 seconds of their respective saves without manual refresh. The same rule applies to results for removed questions.
- **GRD-AC-20.** When the result cannot be loaded on first opening, the view shows **Result unavailable** without substituting **Awaiting grade** or a score. A successful retry loads the confirmed state and clears the message.
- **GRD-AC-21.** If an update fails after the learner has seen **Awaiting grade** or a score, the last confirmed state remains visible with an out-of-date indication. After a successful reconnect or retry, the view shows the current state and clears that indication.

## Non-functional requirements and acceptance criteria

### GRD-NFR-01 · Role and ownership privacy

Enforce the signed-in role and ownership checks on each grading read and write, including direct access. Only the question owner in the instructor role can access the instructor queue data, read a final there or grade it. Only the submitting learner can read their result through the learner surfaces. Draft and unsubmitted content stays private to its learner. Removed questions follow the same authorization rules.

- **GRD-AC-22.** A different instructor cannot list, open or grade the final. A different learner cannot read the result or obtain it from a list. Direct access by signed-out users or users with the wrong role returns no private submission or grade data and permits no write, including for removed questions.
- **GRD-AC-23.** After sign-out or a change of signed-in account, the grading and result views reveal no previous user’s data, pending input or recovery state.

### GRD-NFR-02 · Keyboard access and status communication

Dashboard links, list entries, queue views, score entry, save and recovery actions are operable by keyboard with visible focus and accessible names. The grading pages use semantic structure, responsive layouts and sufficient contrast. Validation, pending and confirmed saves, conflicts, and result loading, failure and freshness states are available as text and to assistive technology. Automatic updates preserve the learner’s focus. [Product accessibility requirements](../../../PRODUCT.md#accessibility--inclusion)

- **GRD-AC-24.** On narrow and desktop layouts, an instructor can reach a submission, switch queue views, enter a score and use save and recovery actions. A learner can open and retry a result. These actions work by keyboard. The controls and status text have sufficient contrast, and the controls have accessible names and visible focus.
- **GRD-AC-25.** A user relying on assistive technology can distinguish validation, pending and confirmed saves, conflicts, unavailable and stale results, and a confirmed grade update. An automatic grade update leaves keyboard focus where it was.

### GRD-NFR-03 · Submission and question compatibility

Preserve the submitted code, reasoning and submission time through grading and corrections. Preserve existing learner browsing, draft save, final submit and recovery behavior, as well as instructor publication and removal. Treat final submissions created before grading is available in the same way as new finals.

- **GRD-AC-26.** A learner can browse published questions, save a private draft, recover from an uncertain attempt save or submit, and finalize an attempt through the existing flow. An identical final-submit retry resolves to the same final. The submitted snapshot remains read-only and intact after the first grade and a correction.
- **GRD-AC-27.** The instructor can publish a question and remove it through the existing flows. Removed questions leave learner browsing and reject new attempts while the existing private final and its grade remain accessible to the authorized users.

## Accepted decision coverage

| Decision | Requirement and acceptance evidence |
| --- | --- |
| Q1 · Instructor intake | GRD-FR-01 · GRD-AC-01 |
| Q2 · Learner result placement | GRD-FR-06 · GRD-AC-16 |
| Q3 · Active result freshness | GRD-FR-07 · GRD-AC-18, GRD-AC-19 |
| Q4 · Grade format | GRD-FR-03 · GRD-AC-06, GRD-AC-07 |
| Q5 · Completion and correction | GRD-FR-03 · GRD-AC-06, GRD-AC-08 |
| Q6 · Existing finals | GRD-FR-01, GRD-NFR-03 · GRD-AC-01, GRD-AC-26 |
| Q7 · Removed questions | GRD-FR-02, GRD-FR-06, GRD-NFR-03 · GRD-AC-05, GRD-AC-17, GRD-AC-27 |
| Q8 · Queue views and order | GRD-FR-01 · GRD-AC-01, GRD-AC-02 |
| Q9 · Instructor detail | GRD-FR-02 · GRD-AC-04 |
| Q10 · Learner dashboard and submissions | GRD-FR-06 · GRD-AC-15, GRD-AC-16, GRD-AC-17 |
| Q11 · Concurrent edits and corrections | GRD-FR-04, GRD-FR-07 · GRD-AC-09, GRD-AC-10, GRD-AC-19 |
| Q12 · Save failure and uncertain outcome | GRD-FR-05 · GRD-AC-11, GRD-AC-12, GRD-AC-13, GRD-AC-14 |
| Q13 · Result unavailable and stale | GRD-FR-07 · GRD-AC-20, GRD-AC-21 |
