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
wildcards for these callback URLs. A Netlify PR preview needs its exact callback
registered too; see the preview section below. Gmail login requires neither a
Gmail API key nor Gmail mail-sending permission.

Reference: [Google's web-server OAuth instructions](https://developers.google.com/identity/protocols/oauth2/web-server).

## 3. Authentication email

The backend now supports Resend for verification and password-reset emails.

1. Open [Resend](https://resend.com/), use a team-owned account, and add a sender
   domain under **Domains**.
2. Add the DNS records Resend supplies at your domain's DNS provider. Wait until
   Resend reports the domain as verified.
3. Under **API Keys**, create a sending key scoped to that domain. Use separate
   development and production keys where possible.
4. Set these values in root `.env`:

```dotenv
RESEND_API_KEY=<Resend sending API key>
EMAIL_FROM=no-reply@<your verified domain>
```

`EMAIL_FROM` must be a bare email address, not `DebugClinic <address>`. A Resend
test sender is suitable only for recipients allowed by your Resend account;
verify a domain before supporting real users.

When both values are present, new email/password accounts must verify their
email before login. Password reset is available through Better Auth's
`POST /api/auth/request-password-reset` and `POST /api/auth/reset-password`
endpoints. A dedicated reset form is a later UI task; configuring delivery alone
does not add that screen. In local development, leaving both fields empty keeps
email verification disabled. Production startup requires both values.

References: [Resend sending API](https://resend.com/docs/api-reference/emails/send-email),
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

For a concrete setup if the team has no existing provider, Neon can supply these
standard PostgreSQL URLs:

1. Open [Neon Console](https://console.neon.tech/) in the team account and create
   separate `debugclinic-dev` and `debugclinic-prod` projects. Select PostgreSQL
   17 and a region close to the Netlify Functions region.
2. In each project click **Connect**, then select the intended branch, database,
   and role. Copy the direct string into the corresponding `DATABASE_URL` store.
3. Select the pooled connection option and copy its string into
   `DATABASE_URL_POOLED`. The pooled hostname includes `-pooler`.
4. Retain TLS query parameters exactly as supplied. Apply migrations to the
   development project first. Keep the production project's URL out of local
   development files and preview environments.

Reference: [Neon connection instructions](https://neon.com/docs/get-started/connect-neon).

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

| Netlify variable       | Development/preview site              | Production site               |
| ---------------------- | ------------------------------------- | ----------------------------- |
| `NODE_ENV`             | `production`                          | `production`                  |
| `APP_ORIGIN`           | Exact active preview origin           | Production HTTPS origin       |
| `CORS_ORIGINS`         | Same preview origin                   | Same production origin        |
| `BETTER_AUTH_URL`      | Same preview origin                   | Same production origin        |
| `DATABASE_URL`         | Development direct URL                | Production direct URL         |
| `DATABASE_URL_POOLED`  | Development pooled URL                | Production pooled URL         |
| `BETTER_AUTH_SECRET`   | Independently generated random secret | Different random secret       |
| `GOOGLE_CLIENT_ID`     | Development client ID                 | Production client ID          |
| `GOOGLE_CLIENT_SECRET` | Development client secret             | Production client secret      |
| `RESEND_API_KEY`       | Development sending key               | Production sending key        |
| `EMAIL_FROM`           | Verified development sender           | Verified production sender    |
| `AI_PROVIDER`          | `fake` initially                      | `soc` after live verification |
| `SOC_LLM_ENDPOINT`     | Full chat endpoint if using `soc`     | Full chat endpoint            |
| `SOC_LLM_MODEL`        | Selected model if using `soc`         | Selected model ID             |
| `SOC_LLM_API_KEY`      | Development key if using `soc`        | Production-authorized key     |
| `AI_TIMEOUT_MS`        | `10000`                               | `10000`                       |
| `AI_MAX_RETRIES`       | `2`                                   | `2`                           |

Configure runtime values for the **Deploy Previews** context on the preview site
and **Production** context on the production site. Rebuild/redeploy after changing
Netlify runtime variables. GitHub job environment variables are not automatically
persisted into Netlify Functions.

### Exact PR preview origins

The workflow uses alias `deploy-preview-<PR number>`. If the development Netlify
site name is `debugclinic-dev` and the PR is 12, the origin is:

```text
https://deploy-preview-12--debugclinic-dev.netlify.app
```

Before enabling authentication on that preview, set its exact origin in the
three Netlify origin variables and `PREVIEW_APP_ORIGIN` in GitHub, and register
`https://deploy-preview-12--debugclinic-dev.netlify.app/api/auth/callback/google`
in the development Google OAuth client. The current shared preview environment
supports one configured authenticated preview at a time. Multiple simultaneous
authenticated previews require per-preview environment overrides or separate
sites; do not add a wildcard trusted origin to work around this.

Reference: [Netlify environment-variable configuration](https://docs.netlify.com/build/environment-variables/get-started/).

## 7. GitHub deployment environments

Open the [repository](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic), then
**Settings → Environments**. Create environments named exactly `deploy-preview`
and `production`. Protect production with the team's required reviewer(s) and
restrict its deployment branch to `master` where your GitHub plan supports
these protection rules.

Within each environment, use **Environment secrets → Add secret** and
**Environment variables → Add variable**. These are the exact workflow names:

| Environment      | Secret names                                                                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy-preview` | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `PREVIEW_DATABASE_URL`, `PREVIEW_DATABASE_URL_POOLED`, `PREVIEW_BETTER_AUTH_SECRET`, `PREVIEW_GOOGLE_CLIENT_ID`, `PREVIEW_GOOGLE_CLIENT_SECRET`, `PREVIEW_RESEND_API_KEY`                                                          |
| `production`     | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `PRODUCTION_DATABASE_URL`, `PRODUCTION_DATABASE_URL_POOLED`, `PRODUCTION_BETTER_AUTH_SECRET`, `PRODUCTION_GOOGLE_CLIENT_ID`, `PRODUCTION_GOOGLE_CLIENT_SECRET`, `PRODUCTION_RESEND_API_KEY`, `SOC_LLM_ENDPOINT`, `SOC_LLM_API_KEY` |

| Environment      | Variable names                                                    |
| ---------------- | ----------------------------------------------------------------- |
| `deploy-preview` | `PREVIEW_APP_ORIGIN`, `PREVIEW_EMAIL_FROM`                        |
| `production`     | `PRODUCTION_APP_ORIGIN`, `PRODUCTION_EMAIL_FROM`, `SOC_LLM_MODEL` |

`NETLIFY_SITE_ID` is the site's **Project ID**, found under Netlify **Project
configuration → General → Project details**. Use the development site's ID for
`deploy-preview` and the production site's ID for `production`.
`NETLIFY_AUTH_TOKEN` comes from Netlify **User settings → Applications → Personal
access tokens** for a team-authorized deployment account.

Although the names differ, each `PREVIEW_*` / `PRODUCTION_*` value must match the
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
