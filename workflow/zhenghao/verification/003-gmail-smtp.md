# Verification 003: Gmail SMTP authentication email

Date: 2026-11-01

The email delivery adapter now uses Nodemailer SMTP instead of Resend. Gmail
defaults are `smtp.gmail.com`, port 465, and implicit TLS. Port 587 explicitly
requires STARTTLS. Certificate validation remains enabled; SMTP debugging is
disabled and delivery failures expose no upstream response or credential text.

`SMTP_USER` and `SMTP_PASSWORD` are required together and in production. The
sender defaults to `SMTP_USER`; Gmail configuration rejects a different
`EMAIL_FROM`. Google social login configuration is unchanged. The old Resend key
is no longer read by application code or referenced by deployment workflows.

The setup guide and example environment now explain a dedicated Gmail mailbox,
2-Step Verification, app-password creation, and the Netlify/GitHub field names.
`npm run email:verify` can verify SMTP connectivity and authentication without
sending a message. No actual mailbox credentials are included in the repository.

## Evidence

- Node 24.22.2: lint and complete type-checking pass.
- 37 unit/API tests pass, including Gmail defaults, partial credential rejection,
  strict TLS settings, production configuration, real MIME generation, rejected
  recipients, and safe errors.
- `npm run db:verify` passes against disposable PostgreSQL 17: migration, repeated
  seed, constraint checks, and two real Better Auth/Prisma integration tests.
  Email verification, password reset, learner-role enforcement, and immediate
  revocation of old sessions are preserved. Email delivery is an injected outbox
  during this check; no Gmail request occurs.
- Production build, formatting, and diff checks pass. The full dependency audit
  reports zero vulnerabilities.

## Remaining live check

An eligible dedicated Gmail account and its app password must be entered in
the ignored `.env` or deployment secret store. Run `npm run email:verify`, then
register a synthetic learner and confirm inbox delivery. That live check has
not been performed here. The existing password-reset API remains supported;
this transport change does not add a new password-reset UI.

The PostgreSQL verifier removed its own disposable container and synthetic data.
No production database, external mailbox, DNS record, or deployment was changed.

References: [Nodemailer SMTP](https://nodemailer.com/smtp),
[Google app-password requirements](https://support.google.com/accounts/answer/185833).
