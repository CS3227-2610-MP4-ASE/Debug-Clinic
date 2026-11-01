# Project lessons

- Every database-connected command must have an explicit verified database URL.
  Offline Prisma generation may use a placeholder; migrations and seeding must
  fail if the URL is missing. Stop command sequences on the first failure.
- Before declaring a local tool unavailable, check installed application bundles
  as well as PATH. Use the configured Node major for verification.
- Keep generated TypeScript build-info files ignored. When changing visible
  wording, update affected browser assertions before running the suite.
  Do not pass `.env` files to Prettier; it has no parser for them.
- MUI required markers can affect exact label-text matching even when hidden
  from the accessible name. Prefer semantic role/name queries for browser tests.
- Load every declared non-system font and verify design documentation against
  resolved MUI values, including numeric radius multipliers.
- Build OAuth test fixtures from the installed provider types: provider identity
  belongs in the raw profile/account subject, not mutable local-user fields.
- Verify declaration-emitting builds after adding typed auth plugins; successful
  no-emit typechecks do not catch non-portable inferred export types.
- Smoke-test the packaged Netlify Function, not just Vite/TypeScript builds;
  preserve ESM when Prisma's generated client uses `import.meta.url`, and keep
  platform configuration distinct from runtime application configuration. Web
  adapters must test cookies and binary bytes; enable serverless-http's binary
  encoding to avoid lossy UTF-8 conversion. Export compiled JavaScript from
  workspaces in production; Netlify tracing may not preserve external TS exports.
- Check domain ownership/DNS access before prescribing a domain-based email
  setup. Offer a mailbox-based option when the user does not own a domain.
- Existing lint rules exempt underscore-prefixed arguments, not unused local
  variables. Remove unused destructured test values rather than renaming them.
- Keep Compose bindings and example database URLs consistent and loopback-only;
  test their agreement so setup cannot target a different local PostgreSQL server.
- Header redaction does not protect URL credentials. Sanitize logged URLs,
  reset-token paths, and redirect headers; omit parsed query/params from logs.
- Test malformed/oversized raw JSON and authentication failure/retry/logout
  behavior, not only schema validation and successful sign-in.

# Skill evaluation

When creating or substantially revising a skill, include at least three realistic
evaluation cases (ordinary and edge/failure cases), measurable success criteria,
and a semantic outcome rubric. Run a deterministic structural grader when
reliable, including a passing and failing case; otherwise document manual or
independent grading and why it is needed. Isolate evaluation data and preserve
authorization boundaries. Report results, blind spots, and improvements.

Record actionable lessons from mistakes here; merge overlapping guidance and
keep this file concise.
