# DebugClinic

DebugClinic is a Python debugging-practice platform where instructors publish verified exercises with progressive hints and learners receive attempt-aware AI coaching before an instructor reviews their final submission.

This repository is an npm-workspace monorepo containing a React application, an Express API, shared Zod contracts, a PostgreSQL/Prisma data layer, deterministic tests, and team-managed Netlify/GitHub Actions configuration.

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- npm 11+
- Docker with Docker Compose for local PostgreSQL

## Local setup

```bash
cp .env.example .env
docker compose up -d postgres
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The frontend runs at `http://localhost:5173`; Vite proxies `/api` to the API at `http://localhost:3001`.

The example configuration uses the deterministic fake AI provider. Google OAuth, transactional email, the NUS SoC LLM, managed PostgreSQL, and Netlify require human-owned credentials and configuration before they can be verified.

See [CredentialsSetup.md](docs/CredentialsSetup.md) for the exact credential names,
Google callback URLs, local `.env` location, Netlify runtime variables, and GitHub
environment secrets. It also explains using Docker Desktop and an isolated
Node 24 runtime when those commands are absent from the shell PATH.

## Common commands

| Command                | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Start frontend and backend development servers      |
| `npm run build`        | Generate Prisma Client and create production builds |
| `npm run lint`         | Run ESLint                                          |
| `npm run typecheck`    | Type-check all workspaces and Netlify functions     |
| `npm test`             | Run deterministic unit and API tests                |
| `npm run test:api`     | Run Supertest API tests                             |
| `npm run test:e2e`     | Run Playwright browser tests                        |
| `npm run format`       | Format supported files                              |
| `npm run format:check` | Check formatting without modifying files            |
| `npm run db:migrate`   | Create/apply a local development migration          |
| `npm run db:deploy`    | Apply committed migrations in CI/production         |
| `npm run db:seed`      | Insert deterministic development fixtures           |

## Netlify development

After installing dependencies and preparing PostgreSQL, run:

```bash
npm run netlify:dev
```

Netlify serves the Vite app and rewrites `/api/*` to the Express-backed function. Configure environment variables through Netlify contexts; never upload a production database URL into a deploy-preview context.

See [DeveloperGuide.md](docs/DeveloperGuide.md) for architecture and security decisions and [UserGuide.md](docs/UserGuide.md) for currently working behavior.
