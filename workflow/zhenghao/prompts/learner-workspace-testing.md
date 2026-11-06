# ZH-LWS-01 independent testing prompt

Requested model: gpt-6.1-sol / high. Single independent testing conversation;
reuse for repair verification, no subagents or additional chats.

Human authorization: explicit green pass after requirements and PR #9 review to
complete necessary implementation, tests/repairs and documentation. Requirements
are workflow/zhenghao/specs/002-learner-workspace.md, LWS-01..06; compatibility is
workflow/zhenghao/verification/005-pr9-compatibility.md. Read these before the
implementation diff; record your acceptance interpretation in testing.md first.
Do not infer acceptance solely from implementation tests.

Branch zh/learner-workspace. Review base 2fa9dfe4650f481e867e75bdacdce71c498db031
already contains PR9 head 7ac19d5 via ae0097c. Review head 4eb3447 contains builder
source 3e73351, handoff f0dddb5, and coordinator's two-line Netlify service injection
fix 4eb3447. That fix supersedes the handoff's Netlify 503 limitation; verify it.

Use applicable AGENTS.md, verify-app and CodingStandards. Do not read/index/diff
Developer2 SDD docs/features/**, docs/mission-brief/** or sibling SDD directories.
You are not alone. Preserve dirty .gitignore, AGENTS.md, docs/Reflections-ZhengHao.md,
coordinator delivery.md, monitor reports and all unrelated edits. Do not stage
them. Coordinator owns telemetry, approvals and integration; builder owns source
repairs. You own testing.md and independent acceptance tests only. Add meaningful
tests for uncovered invariants, not tests mirroring implementation. Do not alter
product code or silently weaken existing expectations. Return consolidated source
findings to coordinator for the same Luna implementation chat.

Verify functional behavior, coding standards and security in separate passes
within this conversation. Report each verdict separately. Inspect exact source
and tests, failure/retry paths, authorization/origin/body bounds, cross-account
and stale response disposal, privacy, search before 50-item pagination, revision
and final immutability, archive race serialization, safe migrations and adapter
composition. Keep PR9 instructor publication/removal/idempotency/retained identity
and session refresh intact. Run remains unavailable; fake output states are test
only. Require keyboard and pointer resize, 320px mobile and desktop, clear
unsaved-work/submit confirmation and preserved code on failures.

Node24.22.2: prefix PATH with
/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin.
The application-bundled Node24 rejects Rollup native loads; coordinator repaired
the local dependency signature and verified the standalone runtime loads it.
Docker Desktop is running; CLI /Applications/Docker.app/Contents/Resources/bin/docker.
Explicit verified owned disposable database URL (set all four identically for
connected commands): DATABASE_URL, DATABASE_URL_POOLED, TEST_DATABASE_URL,
E2E_TEST_DATABASE_URL =
postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test.
Container name debugclinic-zh-lws-01a1af89; coordinator owns cleanup. Never use .env
targets or guessed databases. Use scoped escalation for loopback sockets, Docker
and tsx IPC when denied. Do not substitute hand checks for runnable test suites.

Run applicable formatting/lint/typecheck, npm test, full database integration,
full normal Playwright suite and real-cookie composed journeys with fake AI and
captured SMTP. Read playwright.config.ts/browser-auth-server.ts to set the
opt-in E2E_AUTH_COMPLETION=1 and explicit target/ports. Add a real composed
instructor publishes -> learner reads/saves/finalizes -> instructor removes ->
new learner reads/mutations denied while references remain journey if absent.
Exercise migration duplicate refusal, concurrent writes/finalize/archive,
lost reply/retry, session expiry/account switch, pagination/search beyond page1,
no-hint publication, malicious code/output as text and all production unavailable
states. Preserve F01/F02 coverage; UI changes can update assertions deliberately
with explanation, never remove privacy/authorization expectations.

Rebuild production/declarations and run verify-built-frontend.ts. Adapter source
changed: perform the existing packaged Netlify function checks against explicit
synthetic targets, including authenticated attempt service wiring when feasible.
Keep built-vs-packaged-vs-live evidence distinct; no deployments/external services.

Write testing.md with exact commands/runtime/results, revision, interpretation,
functional/standards/security verdicts, concrete findings with path/line and
reproduction, evidence limits, required repairs and useful reflection evidence.
Initial soft budget 1m cumulative tokens/2h. Record overrun; keep Sol high. Avoid
full transcript/session scans and broad SDD diffs. Coordinator maps your session.
Maximum three meaningful repairs per failed check, two correction/review rounds.
Commit only independently added tests and testing.md using explicit paths and
staged review. No source commits, push, merge, PR or deploy. Return a concise
handoff to the coordinator when checks finish or a consolidated repair is needed.
