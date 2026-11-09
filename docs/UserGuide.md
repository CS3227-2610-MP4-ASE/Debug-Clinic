# DebugClinic User Guide

This guide covers account access, instructor question publication, learner
practice, browser-local Python execution and the debugging coach. Availability
on a deployed site depends on its database, Google, email and AI-provider
configuration.

## Public pages

- `/` explains the intended debugging-practice loop.
- `/sign-in` provides Google and email/password sign-in controls.
- `/register` requires you to choose **Learner** or **Instructor** before using
  email/password or Google registration. Neither role is selected for you.
- `/verification` lets you request another verification link.
- `/forgot-password` requests a link to reset or establish a password.

Your initial role stays with your account. Signing in, registering again,
recovering a password or adding another login method cannot change it. Email
addresses are matched after surrounding whitespace is removed and letters are
lowercased; dots and aliases remain distinct.

Google sign-in requires configured OAuth credentials and a verified Google email.
Use registration with an explicit role for a new account. If Google cannot start
or complete, the interface offers safe retry, registration, verification and
password-recovery paths. Existing accounts retain their role even if a different
role is selected during a later registration attempt.

## Password registration and verification

Choose a role, enter your name and email, and use a password with 12 to 128
characters. When email verification is required, registration leaves you signed
out with verification guidance. Open the verification link, then sign in.
Verification alone does not sign you in. If sign-in is blocked by verification,
use **Resend verification email**.

An accepted resend request does not guarantee delivery or confirm whether an
account exists. If a message does not arrive, check your inbox/spam and retry.
Invalid or expired links offer another verification request or sign-in. Local
development without SMTP skips verification; production requires SMTP setup.

## Recovery and using both login methods

Select **Forgot password** from sign-in, enter your email and request a recovery
link. Follow the link to choose a new 12–128 character password, then sign in.
Expired, invalid or already-used recovery links require a new request. Successful
recovery ends existing sessions and replaces the old password.

A Google-first account can use this same recovery flow to establish its first
password while keeping Google access, identity and role. A verified password
account can use verified same-email Google sign-in for the same identity. Verify
the local account first if ownership has not been established. Registering again
does not replace an existing password or create a new role.

Recovery requests use the same acceptance message for existing and unknown
addresses. Acceptance is not proof of email delivery. Request and reset failures
show safe guidance and leave the controls available to retry.

## Role workspaces

- `/learner` is restricted to authenticated learners.
- `/instructor` is restricted to authenticated instructors.
- A signed-in user who opens the other role's workspace is sent to `/forbidden`.
- Use **Sign out** in the header (or the navigation drawer on mobile) before
  leaving a shared computer. Successful sign-out ends the server session and
  returns to sign-in. If it fails, the interface reports the error and keeps the
  sign-out action available for retry; do not assume you are signed out.

The learner workspace links to published instructor questions. Instructors can
prepare questions and manage their own Drafts, Published and Removed views.

The learner **Home** opens your activity dashboard. **Learner workspace** opens
the published question list at `/learner/question`; the older
`/learner/questions` list URL redirects there and keeps its search query.
Question details continue to use `/learner/questions/:id`. The dashboard counts
saved attempts by exercise, treats a final submission as complete, and shows up
to five saved drafts that are still available to reopen.

While the dashboard loads it shows **Loading your activity…**. Use **Refresh**
or **Try again** after an error. If you have no resumable work, it explains that
saved drafts will appear there and offers **Browse questions**. Choose **Resume**
to return to listed work.

While signed in, the DebugClinic brand is a label and does not navigate. For
learners, **Home** opens the dashboard; for instructors it opens the instructor
dashboard. If you have unsaved learner edits, choose **Stay** to keep working or
**Leave** to discard them before continuing with navigation.

## Preparing an instructor draft

In the instructor workspace, choose **New question**. Enter a specific
concept or task in **Python topic**, then select **Generate**.

- Simple example — `Summing a list with a Python for loop`
- Advanced example — `Python descriptors that store a separate value for each instance`

If your topic is too vague, name the Python feature and the behavior you
want students to debug. For example, narrow “Python” to “Summing a list
with a Python for loop.”

A successful response shows one unsaved preview with six editable fields:
title, problem statement, buggy Python code, expected behavior, bug
explanation and corrected solution. The original topic stays read-only after
generation. **New question** starts again after any discard warning.

Review and edit the fields, then select **Save draft** to create a private draft.
Open a saved draft to edit the same fields; **Save changes** updates that same
draft. **My drafts** lists your drafts, with **Load more** when another page is
available, and lets you reopen them after reload.
Other instructors and learners cannot retrieve your private drafts.

Generation and Save show progress and disable repeated actions. A generation
failure retains your topic and offers **Retry**; a failed Save retains your edits
for another explicit **Save draft** attempt. Unsaved previews and changed saved
fields trigger **“You have unsaved changes. Leave and discard them?”**, with
**Stay** and **Leave**. Browser unload uses the browser's own warning. Accepted
navigation/unload discards current-page work; there is no autosave or cross-reload
recovery. Saved drafts remain available in **My drafts**.

Every preview and saved draft is unverified. Check the explanation and corrected
solution yourself; this flow never executes Python or certifies correctness.

## Reviewing and publishing

Publish directly from the generated preview or open one of your saved drafts.
Review your current edits and select **“I have reviewed this question and
understand that published content cannot be edited.”**, then **Publish**.
Changing content resets confirmation. A saved draft publishes its current edits
without a separate Save. Pending publication locks conflicting actions.

An older preview without a trusted original-topic binding cannot publish directly.
Save draft, reopen it, then Publish, or generate a new question. Previously saved
drafts can publish without regeneration. Publication requires no hints.

If another tab saved newer content, the stale operation is rejected and your
entries remain. **Reload latest** asks for discard consent before replacing them.
An already-published result displays the authoritative published content; stale
submitted edits are not applied.

If publication completion is unconfirmed, keep the page and use **Retry** to
resolve the same reviewed snapshot. Fields and Save stay locked while that
publication is unresolved. A lost response does not prove rollback. A definite
failed attempt permits editing and a fresh confirmation. Starting New question or
leaving can abandon current-page recovery after the discard warning; it cannot
cancel a transaction that already committed. Session expiry preserves already
loaded editor entries on the current page and disables mutations; follow sign-in
guidance when ready to leave.

## Published and removed questions

Your **Published** view is read-only. Choose **Remove** to withdraw a question.
The dialog asks **“Remove this question? It will no longer be available to
learners. Your read-only record will be retained.”** **Cancel** keeps it published;
**Remove** confirms. Failed or unconfirmed removal offers retry/refresh guidance.

Successful removal retains the question under **Removed**. Future learner list
and detail requests exclude it; an already-open learner page may retain loaded
content until refresh or navigation. There is no hard delete, restore or republish
action. Drafts are newest-created-first, Published newest-published-first and
Removed newest-removed-first, with Load more for further pages.

## Viewing questions as a learner

Open **Published questions** from your learner workspace. Browse current
questions newest first, or enter words in **Search questions** to match a title
or topic. Search applies before pages of up to 50 results. Open a question to
read it in the white **Description** pane. On desktop, the question's actual
title and topic stay in the header while **Problem**, **Starting code** and
**Expected behavior** scroll separately in the body. Use **Back to
published questions** to return to the list; your search remains in the address and is
restored.

The list distinguishes initial **Loading questions…** from **Updating
questions…**. Use **Retry** after a failed load. An empty search says **No
questions match your search**; an empty catalogue says **No published questions
are available**. A removed, foreign or otherwise unavailable detail page shows
**This question is unavailable** without exposing private content.

Opening a detail page first shows **Loading question…** and may then show
**Loading question and saved attempt…** while your saved state is restored. If
that request fails, use the displayed retry action; the editor does not replace
the failure with guessed content.

The Python 3 editor provides highlighting, line numbers, indentation, bracket
matching, undo/redo and keyboard editing. A new attempt starts with the published
buggy code; saved work stays in place. Enter your fix and explain your reasoning.
Use **Run** to execute the code, or add your own assertions under **Scratch tests**
and choose **Test** to run them after the code. Test requires nonblank scratch
test code. **Standard input** lets programs that call `input()` receive text.
The Output panel shows actual output, errors and run state. Results are local
feedback, not official grading. Scratch tests and
standard input stay on this device and are never saved or submitted. Editing code,
tests or input marks the previous output as stale. Choose **Stop** to end a run;
the next Run or Test starts a fresh run. A successful Run or Test is not required
to save a draft or submit a final attempt.

Keep code and reasoning nonblank to save. Choose **Save draft** to store your
work, then reload the page to confirm it is still there. Choose **Submit final
attempt** and confirm to submit the current code and explanation. A successful
final submission is read-only. If Save or Submit reports a conflict or uncertain
result, the page checks the latest attempt without sending the write again. If
that check fails, your code and reasoning stay in the editor, Save and Submit
pause, and **Retry attempt check** repeats only the read. Once the server
confirms a draft or no attempt, choose Save or Submit yourself to send another
write. If the server already has a different final submission, that version is
shown read-only while your unsent local edits are kept separately. Back
navigation with unsaved edits asks whether to discard them.

On desktop, drag the divider between the editor and output areas to resize it;
the keyboard can also move the focused divider. On a narrow mobile screen, the
workspace sections stack vertically. The reasoning field shows up to four lines
at a time and scrolls longer explanations.

## Using the debugging coach

Choose **Get Hint** while an attempt is editable, or **Open coaching chat** after
final submission. The **Debugging coach** opens as a modeless side panel on
desktop and a full-screen dialog on small screens. **Minimize coaching chat**
returns focus to its floating launcher. You can drag that launcher, move it with
the arrow keys (hold Shift for larger steps), or press Home to reset it.

Before each message, choose what to share:

- **Current code** is on by default.
- **Reasoning** and **Run output** are off by default.
- Scratch tests and standard input are never shared.

The summary above the conversation tells you what the next request will share.
Type under **Message the coach** and choose **Send**. Advice begins at **Level 1
of 3** and remains at that level until a successful reply enables **Next hint**.
Next hint can advance to levels 2 and 3. A failed or rejected response does not
advance the level.

The conversation is private to your account and this published question
version. It is restored when you reopen the coach, with up to 50 messages shown.
Successful activity keeps its content for 30 days. **Clear chat** deletes the
stored messages and their shared snapshots, but it does not reset the current
hint level or the rolling request count.

The coach shows **Loading your private chat…** during its initial read. An empty
conversation invites you to ask about the exercise. Provider, policy and network
failures appear as warnings without inventing a reply or advancing the level;
the controls remain available for an explicit later retry when the outcome is
known.

Messages and Next hint share a limit of 100 requests per learner in a rolling
ten-minute window across exercises. Opening the coach, reading history and
checking a pending request do not consume another slot. If the outcome of a send
is uncertain, use **Check status**; do not assume failure and immediately send a
duplicate. If the service confirms that no reply was saved, you may send a new
request yourself.

After final submission the coach is read-only, although **Clear chat** remains
available. Replies are advisory text: they cannot edit or run your code, and
they may be incomplete, incorrect or too revealing. Local synthetic environments
use a fake provider, and the audited live free-text evaluation did not establish
safe or useful production coaching. Availability and reply quality therefore
depend on the configured environment.

DebugClinic stores final attempts, but the audited master revision has no
instructor submission-review screen. Instructors can create, publish and remove
questions; they cannot review learner submissions in the current interface.

## Development fixtures

The database seed creates one instructor, one learner, and one draft exercise. These fixtures do not include reusable passwords and cannot be used as production credentials.

## Known setup requirements

- Google authentication needs a Google OAuth client and approved callback URLs.
- Email verification and password reset need an email delivery service.
- Question generation needs a configured backend AI provider. Local synthetic
  verification uses the fake provider. Live SoC output quality and availability
  require separate acceptance evidence.
