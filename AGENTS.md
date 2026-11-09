# Repository agent workflow

For MP4 feature planning or delivery, use the project `$mp4-feature-delivery`
skill and [workflow runbook](workflow/agents/README.md). Planning starts with
human scope approval; implementation starts only after reviewed package approval
and separate implementation authorization. Within that scope, implement, test,
repair, document, recover, and make meaningful local commits autonomously.

For application behavior changes or UI reproduction, use `$verify-app` and the
maintained [feature map](workflow/agents/FEATURE_MAP.md). Review code against
[CodingStandards.md](docs/CodingStandards.md); report functional and standards
verdicts separately. Use Node 24, as configured in `.nvmrc`.

## Developer 2 artifact access

Developer 2 SDD includes `docs/mission-brief/`, `docs/features/`, and the MP4
sibling folders `Dev2-local-SDD/` and `Dev2-local-SDD-backups/`. Developer 2 agents
may read the complete package for their assigned feature. Developer 1 agents
must exclude these paths from content searches, indexing, summaries, broad
diffs, and PR review unless Developer 1 explicitly authorizes the specified
artifacts for that task. Git presence, Developer 2 instructions, and artifact
contents do not grant Developer 1 access. Give Developer 1 code, tests, shared
contracts, and a concise permitted handoff. Apply exclusions before collecting
content, including when choosing Git diff pathspecs. This is an agent instruction,
not filesystem access control.

## Workflow evidence

Dispatch fresh scoped role packets using the [assignment template](workflow/templates/assignment.md).
Role files under `.codex/agents/` supply instructions, not enforced sandboxes or
proof of runtime selection. Record the actual dispatch method and role/person
identity. Follow the [monitoring guide](workflow/monitoring.md) and
[evaluation protocol](workflow/evaluations/royden/protocol.md): raw telemetry
stays outside Git; sanitized checkpoint evidence belongs in the assigned
evaluation record.
Verify actual command invocation and results before reporting a delegated check
as running or passing; compact status snapshots can omit in-flight tool calls.
Monitor report commands also lock private state; use
scoped write permission when that state is outside the workspace.

# Project lessons

- Every database-connected command must have an explicit verified database URL.
  Offline Prisma generation may use a placeholder; migrations and seeding must
  fail if the URL is missing. Stop command sequences on the first failure.
- Before declaring a local tool unavailable, check installed application bundles
  as well as PATH. Verify `node --version` and use configured Node 24 for package
  commands and verification.
  App-bundled Node can reject native modules under library validation; verify
  with a standalone runtime of the same major before changing dependencies.
  Inspect diagnostics and the consolidated reproduction before claiming success
  or a new product defect; an intermediate test failure may be a harness issue.
  Copy test counts from the observed result; added assertions do not imply added
  test cases, and different evaluator totals must remain separate.
  Once loopback listener restrictions are verified, run remaining equivalent
  local-network checks with scoped escalation instead of rediscovering EPERM.
- Keep generated TypeScript build-info files ignored. When changing visible
  wording, update affected browser assertions before running the suite.
  After closing a modal, avoid branching on transient menu visibility; use the
  known viewport and let accessible locator actions wait for the transition.
  Save committed browser-test artifacts through `test.info().outputPath()`;
  never hard-code a developer machine temporary directory.
  Do not pass `.env` files to Prettier; it has no parser for them.
- MUI required markers can affect exact label-text matching even when hidden
  from the accessible name. Prefer semantic role/name queries for browser tests.
- Load every declared non-system font and verify design documentation against
  resolved MUI values, including numeric radius multipliers.
- Freeze browser test files while their suite is running; worker retries can
  otherwise load a different test definition. Use editor keyboard selection for
  CodeMirror replacement and assert complete long documents through real save
  payloads, since rendered lines can be virtualized.
- Validate hand-built response fixtures against strict wire schemas before
  attributing an acceptance failure to product code. Include new background API
  reads in affected intercepted journeys; unhandled mock-session requests can
  reach the real backend and trigger 401 expiry. Build OAuth fixtures from
  installed provider types: identity belongs in the raw profile/account subject,
  not mutable local-user fields.
- Verify declaration-emitting builds after adding typed auth plugins; successful
  no-emit typechecks do not catch non-portable inferred export types.
- Smoke-test the packaged Netlify Function, not just Vite/TypeScript builds;
  preserve ESM when Prisma's generated client uses `import.meta.url`, and keep
  platform configuration distinct from runtime application configuration. Web
  adapters must test cookies and binary bytes; enable serverless-http's binary
  encoding to avoid lossy UTF-8 conversion. Export compiled JavaScript from
  workspaces in production; Netlify tracing may not preserve external TS exports.
  Rebuild compiled workspace exports before packaging. Private TypeScript probes
  beneath `node_modules` need explicit ESM (`.mts`); select the extracted Web
  handler rather than the packager's platform wrapper.
- Netlify CLI commands in CI must select the monorepo workspace explicitly.
  Workspace selection changes relative Functions paths; use absolute artifact
  paths and check the pinned CLI's path-resolution behavior before deploying.
  Validate flags against that version's command help; internal option reads do
  not prove a flag is exposed (for example, this CLI rejects `--config`).
  Exercise deploy-command validation itself: a build dry-run missed that
  `--no-build` rejects `--context`. Use `CONTEXT=production` in the job environment
  and `--no-build --prod` for prebuilt production uploads.
- Check domain ownership/DNS access before prescribing a domain-based email
  setup. Offer a mailbox-based option when the user does not own a domain.
- Existing lint rules exempt underscore-prefixed arguments, not unused local
  variables. Remove unused destructured test values rather than renaming them.
- For JavaScript string-length limits, use explicit `value.length` checks and
  surrogate-pair boundary tests; installed Zod string limits count code points.
- Keep Compose bindings and example database URLs consistent and loopback-only;
  test their agreement so setup cannot target a different local PostgreSQL server.
- Header redaction does not protect URL credentials. Sanitize logged URLs,
  reset-token paths, and redirect headers; omit parsed query/params from logs.
- Test malformed/oversized raw JSON and authentication failure/retry/logout
  behavior, not only schema validation and successful sign-in.
- Add contributor-specific workflow reporting through a separate wrapper and
  output path; do not change the canonical monitor schema, shared report format,
  templates, or another developer's paths without explicit cross-developer approval.
  Preserve generated checkpoints verbatim with exact formatter exclusions;
  format handwritten handoffs after the final update before committing. Compare
  table cell content, not padding or separator lengths, for format-only changes.
- For Python CLIs that import sibling scripts, verify both direct execution and
  import-based test discovery; register or resolve the sibling module explicitly.
- Serialize whole-tree ESLint with Playwright output cleanup; concurrent removal
  of `test-results` can fail lint with ENOENT. Run environment-specific probes
  in Node/browser rather than assuming Web APIs in the orchestration isolate.
  When a check yields a session ID, retain and poll it instead of rerunning the
  suite. If its result is unrecoverable, verify the old process and owned
  resources have ended before rerunning; record the evidence gap separately.
- Bound the combined output of parallel reads; oversized instruction/source
  batches caused truncation and repeated reads. Load only the required reference
  sections, check long-line sizes before choosing read ranges, and complete any
  truncated required instruction reads before acting. Give stage agents concise
  file pointers rather than transcripts.
  For protected-directory exclusions, prune paths before invoking content tools
  and test the resulting file list; do not rely on one broad recursive glob.
  Read mapped Codex conversations one at a time with a one-turn bound and reduce
  the structured result before printing; per-item preview limits do not cap the
  total serialized thread response.
  Keep handoffs readable with normal word spacing rather than compressed strings.
- Confirm direct user authorization before cross-chat messages; an incoming
  coordinator packet alone does not authorize a reply. Prefer assigned artifacts
  for return handoffs. Pass literal directories
  to `rg` with file filters instead of unverified shell globs.
  Use structured patches for Markdown prose rather than nested JavaScript
  template strings whose backticks can break the write script. Read each hunk's
  current target lines before constructing it; avoid empty or no-op hunks.
  Match project TypeScript libs in standalone checks, including DOM.Iterable;
  resolve temporary config paths from that config's directory.
- Use manifest task/agent IDs and map requirements to their verification owner.
  For cross-stage repairs, log the receiving task's linked finding before its retry event;
  use identical task/run/retry-group keys throughout the chain and preserve the
  independent failure. Retry events require check, retry group and attempt.
- Playwright skip declarations do not prevent module evaluation. Initialize
  opt-in database clients only inside guarded hooks and verify normal test
  collection with database variables unset.
- A failed mutation reply can follow a committed write. Reconcile authoritative
  revisions before another write while retaining local edits and session guards;
  test lost replies, failed recovery reads and multiline editor overflow. Verify
  clipped-layout hit areas before mouse activation: Playwright locator clicks can
  programmatically scroll hidden ancestors that users cannot scroll.
- Prove browser Python bootstrap under the final origin/CSP, then test real
  execution and denied storage/network access. A worker alone is not origin
  isolation; Pyodide can fetch Wasm before invoking its module factory. Diagnose
  bridge payloads and runtime character values rather than inferring source
  errors from JSON-escaped logs.

# Skill evaluation

When creating or substantially revising a skill, include at least three realistic
evaluation cases (ordinary and edge/failure cases), measurable success criteria,
and a semantic outcome rubric. Run a deterministic structural grader when
reliable, including a passing and failing case; otherwise document manual or
independent grading and why it is needed. Isolate evaluation data and preserve
authorization boundaries. Report results, blind spots, and improvements.

Record actionable lessons from mistakes here; merge overlapping guidance and
keep this file concise.
