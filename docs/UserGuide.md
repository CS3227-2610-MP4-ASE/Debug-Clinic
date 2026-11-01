# DebugClinic User Guide

This guide describes only the behavior available in the basic infrastructure milestone.

## Public pages

- `/` explains the intended debugging-practice loop.
- `/sign-in` provides Google and email/password sign-in controls.
- `/register` creates learner accounts through email/password authentication.

Google sign-in requires configured OAuth credentials. If it cannot start, the
sign-in page displays an error and lets you retry or use email/password.

When SMTP is configured, email/password accounts must verify their email before
signing in. After registration, open the verification link sent to your inbox,
then return to sign in. Local development without SMTP does not require this
step; production requires SMTP credentials.

Password-reset delivery works through the API: request a link with
`POST /api/auth/request-password-reset`, then set a new password with
`POST /api/auth/reset-password` using the token from that link. A dedicated
password-reset screen is deferred. Resetting a password revokes existing sessions.

## Role workspaces

- `/learner` is restricted to authenticated learners.
- `/instructor` is restricted to authenticated instructors.
- A signed-in user who opens the other role's workspace is sent to `/forbidden`.
- Use **Sign out** in the header (or the navigation drawer on mobile) before
  leaving a shared computer. Successful sign-out ends the server session and
  returns to sign-in. If it fails, the interface reports the error and keeps the
  sign-out action available for retry; do not assume you are signed out.

Both workspaces are currently honest empty states. Exercise creation, publication, attempts, AI coaching, submission, and review are not yet implemented in the user interface.

## Development fixtures

The database seed creates one instructor, one learner, and one draft exercise. These fixtures do not include reusable passwords and cannot be used as production credentials.

## Known setup requirements

- Google authentication needs a Google OAuth client and approved callback URLs.
- Email verification and password reset need an email delivery service.
- The live NUS SoC LLM adapter remains disabled until the official request contract and credentials are supplied.
