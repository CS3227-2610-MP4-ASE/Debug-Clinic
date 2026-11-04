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

The learner workspace remains a foundation screen. Instructors can prepare
private debugging drafts from the instructor workspace.

## Preparing an instructor draft

Choose **Generate question** and enter a beginner Python topic, then select
**Generate**. A successful response shows one unsaved preview with six editable
fields: title, problem statement, buggy Python code, expected behavior, bug
explanation and corrected solution. The original topic stays read-only after
generation. **New question** clears the topic and preview to start again.

Review and edit the fields, then select **Save draft** to create a private draft.
The saved view is read-only. **My drafts** lists your saved drafts, with **Load
more** when another page is available, and lets you reopen them after reload.
Other instructors and learners cannot retrieve your private drafts.

Generation and Save show progress and disable repeated actions. A generation
failure retains your topic and offers **Retry**; a failed Save retains your edits
for another explicit **Save draft** attempt. Leaving or reloading discards unsaved
work. Saved drafts remain available in **My drafts**.

Every preview and saved draft is visibly unverified. Check the explanation and
corrected solution yourself; this flow neither executes Python nor verifies or
publishes exercises. Hint authoring, learner attempts and publication remain
separate work.

## Development fixtures

The database seed creates one instructor, one learner, and one draft exercise. These fixtures do not include reusable passwords and cannot be used as production credentials.

## Known setup requirements

- Google authentication needs a Google OAuth client and approved callback URLs.
- Email verification and password reset need an email delivery service.
- Question generation needs a configured backend AI provider. Local synthetic
  verification uses the fake provider. Live SoC output quality and availability
  require separate acceptance evidence.
