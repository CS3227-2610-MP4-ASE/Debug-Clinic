# ADR 002: Better Auth with database sessions

## Status

Accepted for infrastructure; live providers remain unverified

## Decision

Use Better Auth with its Prisma adapter, Google provider, email/password support, and database-backed cookie sessions. Disable session cookie caching so revocation takes effect on the next authenticated request.

## Rationale

Current Better Auth documentation provides maintained integration paths for Express and Prisma/PostgreSQL, including Google and email/password methods. This avoids custom password hashing, OAuth state, cookie signing, and session cryptography.

## Alternatives

- Auth.js: strong ecosystem, but the requested standalone Express/Prisma composition is less direct than the selected documented integration.
- Hosted identity SaaS: reduces implementation work but introduces another external service, cost/quotas, and account dependency not selected by the team.
- Custom authentication: rejected because it would create avoidable security risk.

## Consequences

The team must configure Google callback URLs, transactional email, secrets, and final account-linking policy. Production readiness cannot be claimed until those flows are tested end to end.
