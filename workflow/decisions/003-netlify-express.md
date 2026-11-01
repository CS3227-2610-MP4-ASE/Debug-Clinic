# ADR 003: Express through Netlify Functions

## Status

Accepted with constraints

## Decision

Deploy the Vite app as the Netlify site and wrap the Express application in one `serverless-http` function. Use a direct database URL for migrations and a pooled URL for function traffic.

## Rationale

Netlify's current Express guide documents this adapter and rewrite pattern. Prisma's Netlify guidance warns that function instances can exhaust database connections without pooling.

## Consequences

- Netlify function duration, memory, and background-work limits apply.
- Rate limiting cannot remain process-local for production scale.
- Database migrations and function deployment are not atomic; migrations must be backward-compatible.
- Long-running execution, including a future Python sandbox, belongs on a separate purpose-built service.
