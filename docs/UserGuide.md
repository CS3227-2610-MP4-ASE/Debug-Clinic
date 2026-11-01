# DebugClinic User Guide

This guide describes only the behavior available in the basic infrastructure milestone.

## Public pages

- `/` explains the intended debugging-practice loop.
- `/sign-in` provides Google and email/password sign-in controls.
- `/register` creates learner accounts through email/password authentication.

Google sign-in requires configured OAuth credentials. Email verification and password-reset delivery require a transactional email provider and are not yet enabled.

## Role workspaces

- `/learner` is restricted to authenticated learners.
- `/instructor` is restricted to authenticated instructors.
- A signed-in user who opens the other role's workspace is sent to `/forbidden`.

Both workspaces are currently honest empty states. Exercise creation, publication, attempts, AI coaching, submission, and review are not yet implemented in the user interface.

## Development fixtures

The database seed creates one instructor, one learner, and one draft exercise. These fixtures do not include reusable passwords and cannot be used as production credentials.

## Known setup requirements

- Google authentication needs a Google OAuth client and approved callback URLs.
- Email verification and password reset need an email delivery service.
- The live NUS SoC LLM adapter remains disabled until the official request contract and credentials are supplied.
