# Local Google OAuth configuration follow-up

Recorded 4 November 2026, Asia/Singapore. Application source remains the reviewed
authentication implementation; this follow-up changes local configuration and adds
the expressly approved development OAuth client.

## Authorization and executed changes

The user identified Google Cloud project `debug-clinic`, then answered **Approve
local OAuth client** to question0 in approval call
`call_yB6wByT7KNOnD5ckC80Xz18I`. The question explicitly named the new client,
loopback origin/callback and credential storage in the ignored local `.env`.

- Created Web application client **DebugClinic Local Development** in that project.
- Authorized origin: `http://127.0.0.1:5173`.
- Authorized callback: `http://127.0.0.1:5173/api/auth/callback/google`.
- Saved the newly issued client credentials directly into the worktree's ignored
  `.env`, without printing secret values or committing that file.
- Restarted the owned local API using Node24 with `--env-file=.env`. The local
  frontend, database and existing password accounts are retained.
- Verified the new client appears in Cloud Console alongside the existing shared
  client. The existing client's settings and deployed runtime were not edited.

The first stale browser handle could list tabs but could not claim the previous
draft; a fresh tab in the same selected browser restored the exact approved draft.
Creation was performed once. The post-create confirmation and client-list row were
observed. A credential-free screenshot is retained privately as
`oauth-local-client-created.jpg` in the feature run directory outside Git.

## Observed checks and remaining human acceptance

| Check                                                                       | Observed result                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `npm run config:check`                                                      | Valid development configuration; Google configured; SMTP disabled; values omitted |
| `git check-ignore .env`                                                     | Ignored                                                                           |
| Browser-origin `/api/ready`                                                 | HTTP200                                                                           |
| Real local `POST /api/auth/sign-in/social`, correct Origin, Google provider | HTTP200                                                                           |
| Returned authorization destination                                          | `accounts.google.com`                                                             |
| Returned redirect URI                                                       | Exact approved loopback callback                                                  |
| Authorization state                                                         | Present; value not recorded                                                       |
| Local registration page                                                     | Learner/Instructor both initially unselected; Google action available             |

The last HTTP200 is Google **initiation**, not proof of successful provider consent,
token exchange or application session creation. The user must choose the initial
role and complete their own Google account selection/consent. No real Google user
was registered or signed in by the agent during this configuration step.

For a new Google identity, use `/register`, choose the role and continue with Google.
An already registered local password identity must satisfy local email verification
before same-email Google association. SMTP remains disabled; that verification
dependency is not bypassed by configuring Google.

Production database readiness, production provider settings, SMTP delivery and
deployment remain separate owner work. No production release, Git push or merge
was performed. Ignored local credentials and live test services are intentionally
left available for the user's manual test.
