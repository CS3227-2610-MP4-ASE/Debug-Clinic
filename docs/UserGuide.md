# DebugClinic User Guide

This guide describes authentication and instructor draft preparation.
Availability on a deployed site depends on its database, Google and email configuration.

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

## Preparing an instructor draft

Choose **New question** in the instructor workspace and enter a beginner Python topic, then select
**Generate**. A successful response shows one unsaved preview with six editable
fields: title, problem statement, buggy Python code, expected behavior, bug
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
read its problem, buggy Python code and expected behavior. Use **Back to
published questions** to return to the list; your search remains in the address and is
restored.

In the workspace, edit the Python 3 code and explain your reasoning. Keep both
fields nonblank. Choose **Save draft** to store your work, then reload the page
to confirm it is still there. Choose **Submit final attempt** and confirm in the dialog
to submit the current code and explanation. A successful final submission is
read-only. If a save or submission fails, your current editor text remains so you
can retry. Back navigation with unsaved edits asks whether to discard them.

On desktop, drag the divider between the editor and output areas to resize it;
the keyboard can also move the focused divider. On a narrow mobile screen, the
workspace sections stack vertically. **Run** and **Get Hint** remain disabled;
Python is not executed and no hint or coaching is delivered. Final attempts are
saved, but no instructor submission-review screen or live deployment is provided
by this feature.

## Development fixtures

The database seed creates one instructor, one learner, and one draft exercise. These fixtures do not include reusable passwords and cannot be used as production credentials.

## Known setup requirements

- Google authentication needs a Google OAuth client and approved callback URLs.
- Email verification and password reset need an email delivery service.
- Question generation needs a configured backend AI provider. Local synthetic
  verification uses the fake provider. Live SoC output quality and availability
  require separate acceptance evidence.
