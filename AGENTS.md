# Project lessons

- Every database-connected command must have an explicit verified database URL.
  Offline Prisma generation may use a placeholder; migrations and seeding must
  fail if the URL is missing. Stop command sequences on the first failure.
- Before declaring a local tool unavailable, check installed application bundles
  as well as PATH. Use the configured Node major for verification.
- Keep generated TypeScript build-info files ignored. When changing visible
  wording, update affected browser assertions before running the suite.
- MUI required markers can affect exact label-text matching even when hidden
  from the accessible name. Prefer semantic role/name queries for browser tests.
- Load every declared non-system font and verify design documentation against
  resolved MUI values, including numeric radius multipliers.

# Skill evaluation

When creating or substantially revising a skill, include at least three realistic
evaluation cases (ordinary and edge/failure cases), measurable success criteria,
and a semantic outcome rubric. Run a deterministic structural grader when
reliable, including a passing and failing case; otherwise document manual or
independent grading and why it is needed. Isolate evaluation data and preserve
authorization boundaries. Report results, blind spots, and improvements.

Record actionable lessons from mistakes here; merge overlapping guidance and
keep this file concise.
