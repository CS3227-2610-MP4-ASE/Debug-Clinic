# DebugClinic coding standards

Review changed code against these standards and the repository's actual ESLint,
TypeScript, Prettier, workspace, and test configuration. Existing conventions are
the starting point; explain an intentional departure in the handoff. Mechanical
checks support review but do not establish functional correctness.

## Responsibilities and dependencies

- **SRP:** each module owns a coherent reason to change. Keep rendering and UI
  state in React components, API/session access behind frontend library/auth
  boundaries, and business authorization/data transitions on the server. Extract
  a boundary when responsibilities change independently; avoid one-line wrapper
  proliferation and arbitrary file-size targets.
- **DRY:** maintain one authority for a domain rule or contract. Put shared
  wire schemas and inferred types in `packages/contracts`; keep server-only
  secrets, persistence, and provider code outside that package. Consolidate
  repeated policy, validation, and error mapping when meanings are the same;
  similar-looking UI or test setup alone does not require an abstraction.
- **Concrete boundaries:** expose a small typed interface that hides an actual
  dependency or policy. Continue the testable `createApp` dependency seams and
  `AiProvider` transport boundary. React/MUI pages call the application API or
  auth boundary; Express owns authentication, authorization, validation, and
  response contracts; Prisma owns PostgreSQL access; the Netlify adapter stays
  thin. Introduce a service/repository only when it isolates real behavior.
- Keep shared-contract and schema changes compatible with running deployments.
  Record owner approval for a changed shared interface and exercise its consumers.

## Types, data, and errors

- Use strict TypeScript, explicit public boundary types where inference leaks
  implementation detail, and type-only imports per lint configuration. Preserve
  ESM `.js` import conventions and compiled workspace exports. Verify declaration
  builds for changed exported auth/application types.
- Parse untrusted input at the server boundary with the applicable Zod schema.
  A frontend guard or input control does not authorize a server operation.
  Check role, ownership, and current state before retrieval or mutation. Use
  transactions when a business invariant spans rows or multiple writes.
- Preserve Better Auth's cookie/origin protections and mount ordering. Return
  stable safe errors and request IDs; sanitize logs, URLs, tokens, user code,
  reasoning, credentials, and provider output. Give users actionable loading,
  empty, error, and retry states without exposing internals.
- Keep database targets explicit and verified. Use isolated synthetic fixtures
  for tests. Never substitute a production connection to make a local check pass.
- For AI changes, keep requests backend-only; validate output, minimize selected
  context, version prompts, bound usage/time/retries, and map failures safely.
  Record the feature's required token/latency/limit evidence and live acceptance
  gaps under its approved TDD/RTT.

## UI and tests

- Use the established MUI theme and accessible semantic elements. Preserve
  keyboard flow, focus, labels, responsive states, and status/error announcements.
  Verify resolved theme behavior when visual values depend on MUI multipliers.
- Test observable contracts and business invariants. Include relevant denied,
  malformed, empty, stale, boundary, and dependency-failure cases. Avoid tests
  that merely reproduce implementation calculations or inspect private details.
- Keep implementer unit tests even when an independent author supplies acceptance
  coverage. Acceptance cases derive from requirements and frozen interpretation;
  implementation changes cannot silently redefine their expected behavior.
- Mock a remote boundary deliberately and state what the mock cannot prove.
  Use real PostgreSQL integration for persistence/auth invariants and browser
  interaction for UI behavior. Prefer role/name/state assertions over sleeps.
  Test adapter cookies/binary responses and packaged ESM behavior when affected.

## Reviewer output

Return a functional verdict and a separate standards verdict, each **pass**,
**changes required**, or **unable to verify**. For every actionable finding name
severity, exact file/line or section, applicable requirement or standard,
concrete failure/maintenance impact, and correction. Separate blocking defects
from optional improvements. Avoid aesthetic rewrites without a demonstrated
problem. Record checks actually observed, evidence limitations, and unresolved
findings after repair. A security reviewer supplies an additional independent
risk verdict for sensitive changes.
