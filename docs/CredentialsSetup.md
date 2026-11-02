# Credential setup for DebugClinic

Use this sequence: local development, provider accounts, Netlify runtime
configuration, then GitHub deployment configuration. Actual secret values belong
only in the stores below. Never use a `VITE_` prefix for a secret: Vite exposes
those values to the browser bundle.

## 1. Local file and runtime

From the repository root, using Node 24:

```bash
cp -n .env.example .env
openssl rand -hex 32
```

Copy the generated random value into `BETTER_AUTH_SECRET` in the root `.env`.
Edit that file in your editor. `.env` is ignored by Git; `.env.example` is the
public template and must never contain real credentials.

If Node 24 is not on your PATH, this project can run without changing the system
Node installation:

```bash
npm exec --yes --package=node@24 --call 'node --version && npm ci'
npm exec --yes --package=node@24 --call 'npm run config:check'
npm exec --yes --package=node@24 --call 'npm run dev'
```

On this Mac, Docker Desktop's installed CLI is available with:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
docker version
docker compose up -d postgres
```

To repeat the isolated database check without touching your development data:

```bash
npm exec --yes --package=node@24 --call 'npm run db:verify'
```

This command detects Docker Desktop's CLI, creates PostgreSQL 17 on a random
loopback port, applies migrations, seeds twice, tests real authentication and
database constraints, and removes only its own temporary container afterward.

Keep these local URL values together:

```dotenv
APP_ORIGIN=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
BETTER_AUTH_URL=http://localhost:5173
```

Use this same `localhost` URL in your browser and in Google callbacks. Restart
`npm run dev` after changing `.env`.

## 2. Google OAuth credentials

1. Open [Google Cloud Console](https://console.cloud.google.com/), select the
   team's Google Cloud project, and open **Google Auth Platform**.
2. Configure **Branding** with the DebugClinic app name and team support email.
3. Under **Audience**, select the appropriate internal/external audience. While
   the app is in testing, add each developer under **Test users**.
4. Under **Clients**, create an OAuth client of type **Web application**.
5. For the local client, add the authorized JavaScript origin
   `http://localhost:5173` and the exact authorized redirect URI
   `http://localhost:5173/api/auth/callback/google`.
6. Put the displayed client ID and client secret into root `.env`:

```dotenv
GOOGLE_CLIENT_ID=<client ID ending in .apps.googleusercontent.com>
GOOGLE_CLIENT_SECRET=<Google client secret>
```

Create separate development and production OAuth clients. Each deployed client
must have its own exact HTTPS origin and
`https://<that-host>/api/auth/callback/google` redirect URI. Google does not accept
wildcards for these callback URLs. Development PR previews use the stable dev
callback through the OAuth proxy described below. Gmail login requires neither a
Gmail API key nor Gmail mail-sending permission.

Reference: [Google's web-server OAuth instructions](https://developers.google.com/identity/protocols/oauth2/web-server).

## 3. Authentication email

The backend uses Gmail SMTP through Nodemailer for coursework/development.
You do not need a custom domain, DNS records, or a Resend account.

1. Create or choose a dedicated Gmail mailbox for DebugClinic. Sign in to that
   mailbox's Google Account, not the learner's account.
2. Open **Google Account → Security → 2-Step Verification** and enable it.
3. Open [App passwords](https://myaccount.google.com/apppasswords), name a new
   app password `DebugClinic`, and generate it. If this option is unavailable,
   check Google's account-policy restrictions; school/work accounts or Advanced
   Protection can prevent app passwords. An eligible dedicated Gmail account
   is needed for this setup.
4. Copy the generated app password into `SMTP_PASSWORD` without display spaces.
   This is separate from both your Google login password and OAuth client secret.
5. Replace the old `RESEND_API_KEY` entry in root `.env` with these settings:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-debugclinic-mailbox@gmail.com
SMTP_PASSWORD=your16characterapppassword
EMAIL_FROM=your-debugclinic-mailbox@gmail.com
```

Use your actual dedicated mailbox in both address fields. `EMAIL_FROM` can also
be left blank to use `SMTP_USER` automatically. Do not put an address at a domain
you do not own here. Google OAuth client ID/secret settings remain unchanged.

When SMTP credentials are present, new email/password accounts must verify their
email before login. Password reset is available through Better Auth's
`POST /api/auth/request-password-reset` and `POST /api/auth/reset-password`
endpoints. A dedicated reset form is a later UI task; configuring delivery alone
does not add that screen. In local development, leaving both SMTP credential
fields and `EMAIL_FROM` empty keeps email verification disabled. Production
startup requires SMTP credentials even for a coursework deployment on Netlify.

Restart the application after changing `.env`, then run with Node 24:

```bash
npm run config:check
npm run email:verify
```

`email:verify` checks the SMTP connection and authentication without sending a
message. Then register a synthetic learner with an inbox you control and confirm
the verification email arrives. Gmail delivery is subject to Google's sending
limits and account/security policies; it is suitable for this small coursework
setup rather than bulk sending. Deployment from a new location may require
reviewing the mailbox's Google security alerts.

For a provider using STARTTLS on port 587, set `SMTP_PORT=587` and
`SMTP_SECURE=false`; the adapter still requires encryption and valid certificates.

References: [Google app passwords](https://support.google.com/accounts/answer/185833),
[Nodemailer SMTP](https://nodemailer.com/smtp),
[Better Auth email flows](https://better-auth.com/docs/concepts/email).

## 4. NUS SoCLaaS

1. Connect to the NUS network or NUS VPN.
2. Open the [SoCLaaS portal](https://soclaas-portal.comp.nus.edu.sg/), sign in,
   and create an API key. The portal's **Client Setup** page can generate a
   `soclaas.env` file containing `SOCLAAS_API_KEY`.
3. Copy that key into this project's `SOC_LLM_API_KEY` field. The project uses
   `SOC_LLM_API_KEY`, rather than the portal's `SOCLAAS_API_KEY` name.
4. Use the portal's model catalogue, or its documented `GET /v1/models` request,
   to choose a chat-capable model ID. Do not guess a model name.
5. Set:

```dotenv
AI_PROVIDER=soc
SOC_LLM_ENDPOINT=https://soclaas-api.comp.nus.edu.sg/v1/chat/completions
SOC_LLM_MODEL=<exact chat model ID from the catalogue>
SOC_LLM_API_KEY=<your SoCLaaS API key>
AI_TIMEOUT_MS=10000
AI_MAX_RETRIES=2
```

The endpoint here is the full chat-completions URL, not just the `/v1` base URL.
The adapter uses the official bearer-authenticated chat protocol, validates JSON
coaching content, imposes an overall timeout, and retries only transient failures
within the configured bound. Keep `AI_PROVIDER=fake` until the key and model are
ready. Portal access requires the NUS network; the API gateway itself is public.

Reference: [official SoCLaaS direct API guide](https://soclaas.comp.nus.edu.sg/guides/api.html).

## 5. Managed PostgreSQL

Use the team's managed PostgreSQL provider. Create separate development and
production databases/projects, then copy their connection strings from the
provider's connection panel:

- `DATABASE_URL`: the direct PostgreSQL connection, for Prisma migrations.
- `DATABASE_URL_POOLED`: the provider's pooled connection, for serverless API
  traffic. Use a Prisma/pg-compatible pooler and retain the provider's TLS
  parameters, typically `sslmode=require`.

This repository maps the development Supabase project to
`fgfcfqbjgtemffpcpsum` and production to `ngacjlbzxfwpcapemdtp`. In Supabase's
**Connect** panel use the session pooler on port 5432 for `DATABASE_URL` when the
direct host is unreachable over IPv4, and the transaction pooler on port 6543
for `DATABASE_URL_POOLED`. URL-encode special characters in the database password
and retain TLS parameters. The native development build checks both URLs against
the development project before running migrations; changing providers requires
updating that explicit mapping in `apps/backend/src/config/deployment.ts`.

Do not paste production URLs into local `.env` for development. The direct
production URL belongs in the production GitHub environment for migrations;
runtime URLs belong in the production Netlify site's environment variables.
Never run the development seed against production.

## 6. Netlify runtime environment variables

Create two Netlify sites in the team's workspace: one for development/previews
and one for production. Separate sites prevent accidental cross-environment
database or authentication configuration. Select your actual site names before
creating Google's deployed callbacks.

For each site, open **Project configuration → Environment variables → Add a
variable**. Add the following names. Enable the **Functions** scope for runtime
values; enable **Builds** too if Netlify performs the build. If the plan does not
offer granular scopes, retain the default all-scopes setting. Mark credential
values as secret when the UI offers that option.

| Netlify variable       | Development/preview site                | Production site                        |
| ---------------------- | --------------------------------------- | -------------------------------------- |
| `NODE_ENV`             | `production`                            | `production`                           |
| `APP_ORIGIN`           | `https://debugclinic-dev.netlify.app`   | `https://debugclinic-prod.netlify.app` |
| `CORS_ORIGINS`         | Same stable development origin          | Same production origin                 |
| `BETTER_AUTH_URL`      | Same stable development origin          | Same production origin                 |
| `DATABASE_URL`         | Development direct URL                  | Production direct URL                  |
| `DATABASE_URL_POOLED`  | Development pooled URL                  | Production pooled URL                  |
| `BETTER_AUTH_SECRET`   | Independently generated random secret   | Different random secret                |
| `GOOGLE_CLIENT_ID`     | Development client ID                   | Production client ID                   |
| `GOOGLE_CLIENT_SECRET` | Development client secret               | Production client secret               |
| `OAUTH_PROXY_URL`      | `https://debugclinic-dev.netlify.app`   | Omit entirely                          |
| `OAUTH_PROXY_SECRET`   | Dedicated random secret, 32+ characters | Omit entirely                          |
| `SMTP_HOST`            | `smtp.gmail.com`                        | `smtp.gmail.com`                       |
| `SMTP_PORT`            | `465`                                   | `465`                                  |
| `SMTP_SECURE`          | `true`                                  | `true`                                 |
| `SMTP_USER`            | Dedicated development Gmail address     | Dedicated sender address               |
| `SMTP_PASSWORD`        | Development Gmail app password          | Sender's Gmail app password            |
| `EMAIL_FROM`           | Same as `SMTP_USER`, or blank           | Same as `SMTP_USER`, or blank          |
| `AI_PROVIDER`          | `fake` initially                        | `soc` after live verification          |
| `SOC_LLM_ENDPOINT`     | Full chat endpoint if using `soc`       | Full chat endpoint                     |
| `SOC_LLM_MODEL`        | Selected model if using `soc`           | Selected model ID                      |
| `SOC_LLM_API_KEY`      | Development key if using `soc`          | Production-authorized key              |
| `AI_TIMEOUT_MS`        | `10000`                                 | `10000`                                |
| `AI_MAX_RETRIES`       | `2`                                     | `2`                                    |

On the development site, configure these for both **Production** (the stable dev
deployment) and **Deploy Previews**, with **Builds and Functions** scope. The two
development contexts must use the same Google credentials and `OAUTH_PROXY_SECRET`.
On the actual production site configure the **Production** context. Rebuild/redeploy
after changing values. GitHub job variables are not automatically persisted into
Netlify Functions. There are no required `VITE_*` variables; browser requests use
same-origin `/api`.

### Automatic preview origins and a fixed Google callback

Native Netlify PR previews use `deploy-preview-<PR number>`. For PR 12:

```text
https://deploy-preview-12--debugclinic-dev.netlify.app
```

No per-PR variable edits are needed. During the build, `SITE_ID`, `CONTEXT`,
`REVIEW_ID`, and `DEPLOY_PRIME_URL` produce a small public
`generated/deployment.json` artifact. The Function uses that artifact to override
the three origin variables for its own deployment. Unsupported sites, branch
deploys, and mismatched preview URLs fail closed. Preview AI is forced to `fake`.
No request Host header or shared environment-variable mutation is used.

Do these dashboard steps once:

1. On **debugclinic-dev**, link this repository under **Build & deploy → Continuous
   deployment**, keep builds **Active**, and enable Deploy Previews for trusted
   team PRs targeting `master`. Under **Branches and deploy contexts**, disable
   branch deploys. `master` remains the target branch for PR discovery; the
   committed ignore command skips this site's production-context master builds,
   so it publishes only PR preview URLs. Do not stop all builds on this site,
   because that would also disable previews. The committed `netlify.toml` provides build settings. Configure
   Netlify's GitHub integration/PR deploy notifications if you want its preview
   comment. Do not run a second GitHub CLI preview deployment. Preview publication
   is independent of CI; require CI and the Netlify deploy check in GitHub's
   branch protection before merging.
2. Generate a fresh secret with `openssl rand -hex 32`. Add `OAUTH_PROXY_SECRET`
   and `OAUTH_PROXY_URL=https://debugclinic-dev.netlify.app` to the development
   site's **Production and Deploy Previews** contexts, with Builds/Functions scope.
   This secret is separate from `BETTER_AUTH_SECRET` and must never be used on
   the actual production site.
3. In the **development Google OAuth client**, register the JavaScript origin
   `https://debugclinic-dev.netlify.app` and the single redirect URI
   `https://debugclinic-dev.netlify.app/api/auth/callback/google`. Keep the
   production client's callback separate. Do not register every PR callback.
4. Deploy this code to the **stable dev URL first**, before testing PR Google
   login: both ends need the proxy plugin and matching shared secret. If this
   callback has already been deployed, retain it. Otherwise bootstrap it once
   through an explicitly reviewed manual deployment. Master pushes no longer
   refresh the stable dev URL. This callback service is required by the current
   Google preview-login design; removing it requires a different callback design.
5. Open a trusted team PR. Its Netlify build applies development migrations
   before publishing, then Google redirects through stable dev back to that
   preview, where its session cookie is created. Email links also use that
   preview's bundled origin. Concurrent PRs have distinct origins, but share
   the development database: keep schema changes backward-compatible.
6. On **debugclinic-prod**, keep native Git-triggered builds stopped/disabled
   while allowing manual CLI deployments. The protected GitHub production job
   must remain the only production deployment owner.
   Open **Project configuration → Developer settings → Continuous deployment →
   Build settings → Configure**, set **Build status → Stopped builds**, and save.
   This is different from stopping auto publishing. Leave `debugclinic-dev`
   builds active. A native production build that throws "Production must use the
   protected GitHub workflow" means this dashboard step has not taken effect.

Only trusted team code may receive development secrets or use this proxy. A PR
can execute arbitrary build code and a shared proxy key grants identity assertion
authority within development. Require review/approval before secret-bearing
preview builds; do not enable them for untrusted fork PRs. Production neither
loads the proxy nor trusts the preview wildcard. The proxy's limited development
origin pattern is for OAuth redirects, not a wildcard Express CORS policy.

References: [Better Auth OAuth proxy](https://better-auth.com/docs/plugins/oauth-proxy),
[Netlify Functions environment variables](https://docs.netlify.com/build/functions/environment-variables/).

Reference: [Netlify environment-variable configuration](https://docs.netlify.com/build/environment-variables/get-started/).

## 7. GitHub deployment environments

Open the [repository](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic), then
**Settings → Environments**. Create the environment named exactly `production`.
The former `deploy-preview` environment and its `PREVIEW_*` entries are no longer
read by any workflow; previews are owned by native Netlify. Protect production with the team's required reviewer(s) and
restrict its deployment branch to `master` where your GitHub plan supports
these protection rules.

Within each environment, use **Environment secrets → Add secret** and
**Environment variables → Add variable**. These are the exact workflow names:

| Environment  | Secret names                                                                                                                                                                                                                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `production` | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `PRODUCTION_DATABASE_URL`, `PRODUCTION_DATABASE_URL_POOLED`, `PRODUCTION_BETTER_AUTH_SECRET`, `PRODUCTION_GOOGLE_CLIENT_ID`, `PRODUCTION_GOOGLE_CLIENT_SECRET`, `PRODUCTION_SMTP_USER`, `PRODUCTION_SMTP_PASSWORD`, `SOC_LLM_ENDPOINT`, `SOC_LLM_API_KEY` |

| Environment  | Variable names                                                    |
| ------------ | ----------------------------------------------------------------- |
| `production` | `PRODUCTION_APP_ORIGIN`, `PRODUCTION_EMAIL_FROM`, `SOC_LLM_MODEL` |

`NETLIFY_SITE_ID` is the site's **Project ID**, found under Netlify **Project
configuration → General → Project details**. Set production's `NETLIFY_SITE_ID`
to `3df9e8cb-b1c3-456a-ac32-60c043756d4c` and `PRODUCTION_APP_ORIGIN` to
`https://debugclinic-prod.netlify.app`.
`NETLIFY_AUTH_TOKEN` comes from Netlify **User settings → Applications → Personal
access tokens** for a team-authorized deployment account.

Although the names differ, each `PRODUCTION_*` value must match the
corresponding unprefixed Netlify runtime variable. For example,
`PRODUCTION_BETTER_AUTH_SECRET` in GitHub must equal `BETTER_AUTH_SECRET` on the
production Netlify site. Keep `NETLIFY_AUTH_TOKEN` only in GitHub; the API runtime
does not need that token. No Google, email, or SoC key belongs in frontend code.

## 8. Verification after entering credentials

1. Run `npm run config:check` locally with Node 24. It reports configured
   capabilities without displaying values. This checks configuration shape,
   not whether provider credentials are accepted.
2. Start the application with the development database. Register a synthetic
   learner, receive the verification email, verify it, and sign in. Exercise the
   password-reset API using only that synthetic account.
3. Sign in with a Google test user. Confirm the callback returns to the same
   origin and that the resulting role is `LEARNER`.
4. Enable `AI_PROVIDER=soc` with the selected model. Request a hint from a
   synthetic attempt and confirm structured advisory feedback or a safe 503.
5. Push the reviewed branch and open a PR when ready to run hosted CI/preview.
   Confirm migrations, integration tests, health/readiness, email, and OAuth on
   the preview before merging to `master` for production.

The current session verified PostgreSQL 17 and Node 24 locally, including real
database sessions and email flow logic with an injected test outbox. No provider
account, DNS record, live email, Google consent, remote secret, or deployment was
created. Live checks follow only after these credentials have been entered.
