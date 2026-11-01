# ADR 001: npm-workspace monorepo

## Status

Accepted

## Decision

Use npm workspaces with `apps/frontend`, `apps/backend`, and `packages/contracts`. Keep Prisma and Netlify configuration at the repository root.

## Rationale

The browser and API need one shared source of truth for Zod contracts while retaining independently testable application boundaries. npm workspaces avoid an additional package manager and work directly with Netlify and GitHub Actions.

## Consequences

Workspace commands run from the root. `packages/contracts` must remain transport-focused and cannot import server secrets or Prisma implementation.
