# DebugClinic Developer Guide

This guide describes the behavior present at audited master revision
`5d4155b2062cbbb4de558c5794384f674e9b9985`. Proposed designs and unmerged work
are not presented as delivered features.

## Prerequisites and local setup

- Node.js 24 (the repository pins major version 24 in `.nvmrc`) and npm 11 or
  later.
- Docker with Compose for the local PostgreSQL 17 services.
- A local environment file based on `.env.example`; never commit credentials.

Run `nvm use`, then `npm ci`. `docker compose up -d postgres` starts the
development database on loopback port 55432. Copy `.env.example` to `.env`,
verify that both database URLs target that development service, then run
`npm run db:migrate` and `npm run db:seed`. Start the frontend and API with
`npm run dev`.

Tests that connect to PostgreSQL must use an explicitly verified disposable
database whose name ends in `_test`. `docker compose up -d postgres-test` starts
the repository's test service on loopback port 5433; use `.env.test.example` as
the matching template. Never run migration,
seed, integration, or browser-database commands with a missing, implicit, or
unverified database URL.

Useful repository checks include `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test`, `npm run test:api`, `npm run
test:integration`, `npm run test:e2e`, and `npm run build`. Database and opt-in
browser suites have additional requirements described under
[Testing strategy](#testing-strategy).

## Architecture

DebugClinic is an npm-workspace monorepo:

| Area                 | Responsibility                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/frontend`      | React/Vite application shell, MUI components, routing, and role-aware navigation                     |
| `apps/backend`       | Express application, Better Auth, authorization middleware, AI boundary, errors, logging, and probes |
| `packages/contracts` | Shared Zod request/response schemas and inferred TypeScript types                                    |
| `prisma`             | PostgreSQL schema, migrations, and deterministic development seed                                    |
| `netlify/functions`  | Thin serverless adapter around the separately testable Express application                           |
| `tests/e2e`          | Playwright browser journeys                                                                          |
| `workflow`           | Specifications, architecture decisions, and verification evidence                                    |

The browser calls same-origin `/api` endpoints. Local Vite development proxies these calls to Express. Netlify rewrites the same path to a serverless function using `serverless-http`.

The audited package manifests use React 19 and MUI 7 on Vite 7; Express 5 and
Better Auth 1.7.14 on the API; Prisma 7 with PostgreSQL 17; Zod 4 shared
contracts; and TypeScript 5.9. Vitest 4, Supertest and Playwright 1.56 cover the
test layers. The learner editor uses CodeMirror 6 and the browser runner pins
Pyodide 314.0.7. Treat these as repository-version facts, not an instruction to
upgrade dependencies independently.

## Authentication and authorization

Better Auth was selected because its maintained documentation covers Express, Prisma/PostgreSQL, email/password authentication, Google authentication, database-backed sessions, and revocation.

- Authentication routes are mounted under `/api/auth/*` before `express.json()` consumes the request stream.
- Session identifiers remain in `HttpOnly` cookies. Production cookies are `Secure` and use `SameSite=Lax`.
- Better Auth's CSRF/origin protections remain enabled. Trusted origins come from validated environment variables.
- Session cookie caching is disabled so server-side revocation is not delayed by a client cache.
- Initial registration requires the explicit `registrationRole` command, either
  `LEARNER` or `INSTRUCTOR`. The stored `role` remains non-input; later sign-in,
  recovery, association and profile updates cannot change it.
- Auth email ingress trims JavaScript whitespace and lowercases consistently.
  Dots and aliases remain distinct. The existing unique email constraint arbitrates
  competing registrations; credentials and roles are never overwritten to resolve a duplicate.
- Google sign-in disallows implicit new-user creation. Explicit Google registration
  binds the selected role to a signed browser cookie and expiring database intent.
  A conditional root-client claim is consumed independently of provisioning.
  Verified same-email association requires both local and incoming ownership;
  direct link/unlink bypasses are disabled.
- Frontend route guards improve navigation, but Express authorization middleware is the security boundary.

Verification and reset email delivery use Nodemailer over authenticated SMTP,
defaulting to a dedicated Gmail mailbox over TLS on port 465. Configuring
`SMTP_USER` and `SMTP_PASSWORD` enables mandatory verification for email/password
accounts; both are required in production. `EMAIL_FROM` defaults to `SMTP_USER`
and must match it when using Gmail. Gmail app-password setup and production
callback URLs remain team-owned configuration. No domain/DNS setup is needed for
the Gmail sender. See
[CredentialsSetup.md](CredentialsSetup.md).

Verification resend and recovery use fixed application callbacks and safe,
non-enumerating acceptance responses. Delivery exceptions are caught without
returning recipient-specific failures or promising delivery. Google-first users
can establish a password through recovery. Recovery revokes existing sessions;
verification does not automatically sign in a user. The adapter enables real
transactions for provisioning/reset invariants. Controlled Google and SMTP
acceptance on the deployed runtime remain deployment-owner checks.

The exact compatible `@better-auth/core` dependency is declared in the backend
and at the root: the backend uses its public request-state API, and Netlify's
flattened packaged module must resolve it from the package root. Declaration
builds and extracted-package execution check different compatibility boundaries.

`scripts/normalize-auth-identities.ts` is an owner-operated **local rehearsal**
utility. Its CLI accepts only an explicit loopback `_test` database. Preflight
checks all canonical collisions before any changes; apply requires paused writers
and a protected, new `AUTH_NORMALIZATION_MAP` file outside Git. It preserves IDs,
roles and relationships while revoking sessions and database-backed verification
artifacts in a transaction. Stateless email-verification JWTs are not globally
revoked by deleting database rows. Windows operators must protect the map location
with filesystem permissions; a POSIX file mode alone does not establish Windows ACLs.
Production transition/rollback requires the database owner's separately authorized
target validation and operator procedure; do not point local tests at production.

## Data model

The Prisma model includes authentication records plus versioned exercises, ordered hints, attempts, AI feedback, reviews, AI usage, and authentication audit events.

The initial SQL migration adds checks that Prisma cannot express directly:

- hint and feedback stages remain between 1 and 3;
- final submissions require `finalSubmittedAt`;
- published exercises require `publishedAt`;
- usage counters cannot be negative.

MP4-D2-F02 explicitly permits publication without hints or hint approval.
Developer 1 owns future functional hint integration; F02 does not create hint
rows or impose a future hint lifecycle. A future sibling-row prerequisite would
need a separately approved transaction-level policy rather than a row SQL check.

## Manual grading

The grading service reads immutable `FINAL_SUBMITTED` attempts and stores their
current numeric score in `AttemptGrade`. The additive migration gives each
attempt at most one grade, constrains its integer score to 1–10, and constrains
its revision to a positive 32-bit integer. Existing `Review` rows retain their
decision and comment independently. A final without an `AttemptGrade` is awaiting
grading. Grading preserves the original attempt contents and revision.

`apps/backend/src/exercises/grading.ts` applies the session user's ownership
predicate to each query. Instructors see only finals for questions they authored.
Learners see only their own finals. These paths follow retained version
references after question removal. Canonical publication checks continue to
govern browsing and new attempts.

| Route under `/api/v1`                          | Behavior                                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GET /instructor/submissions`                  | Own final queue. `view=awaiting` is the default, with oldest submissions first. `view=graded` uses latest grade save first. |
| `GET /instructor/submissions/:attemptId`       | Exact submitted answer, question context, learner display name and current grade.                                           |
| `GET /instructor/submissions/:attemptId/grade` | Current score, revision and save time for reconciliation.                                                                   |
| `PUT /instructor/submissions/:attemptId/grade` | Strict JSON `{ score, expectedRevision }`. A first save uses `null`, corrections use the last reviewed revision.            |
| `GET /learner/submissions`                     | Own finals newest first, with grading status.                                                                               |
| `GET /learner/submissions/:attemptId`          | Private final answer and score, including an archived question.                                                             |
| `GET /learner/submissions/:attemptId/grade`    | Compact `{ grade: null \| { score } }` projection for automatic refresh.                                                    |

Lists use 50-item keyset pages with timestamp and attempt-ID tie breakers.
The service locks the ownership-qualified attempt in a transaction before
comparing grade revisions. Stale revisions produce `409` and `NOT_APPLIED`.
A matching-revision same-score save preserves its revision and timestamp.
Changed scores increment the revision. An uncertain commit produces `UNKNOWN`.
The browser reconciles through GET before another deliberate save. Its client
also checks that a successful reply agrees with the submitted score and a
permitted revision transition.

Grading response schemas and types live in `packages/contracts/src/grading.ts`.
The server and Netlify compositions inject the same Prisma grading service.
The opt-in browser backend additionally injects that service and the learner
dashboard service. The HTTP module applies private/no-store headers, generated
request IDs, route-template logs, cookie/role/actor checks, and origin and JSON
checks for writes. Allowed-origin responses expose `Retry-After`. Compact learner
reads use in-process limits of 600/minute per IP and 120/minute per verified learner.
Rejected compact requests also count against the ordinary IP allowance.

The frontend has `/instructor/submissions[/:attemptId]` and
`/learner/submissions[/:attemptId]`. `GradingAdmission` scopes private state to the
verified actor, route and session epoch. Indeterminate session reads preserve
same-account state with writes paused. Grading revalidation has a four-second
deadline. Peer-session changes clear the grading view before revalidation, and
restoration handlers hide old content until fresh admission. The shared learner
grade panel polls visible results every five seconds with a four-second read
deadline, coalesces event-driven reads, and honors rate backoff. It also mounts
on the existing question page after final submission.

The local acceptance lanes cover real PostgreSQL races, denied access, paging,
legacy finals, archive access, normal-limit shared-IP isolation, and lost BEGIN
and COMMIT acknowledgements. Browser lanes distinguish intercepted recovery from
real-cookie composed journeys. `grading-session-privacy.spec.ts` includes
synthetic persisted-page lifecycle events. Actual BFCache restoration, manual
screen-reader behavior, remote CI and deployed load require their own evidence.

## AI adapter

`AiProvider` isolates product code from provider-specific transport. Local
development, deploy previews and tests use `FakeAiProvider`, which is
deterministic and offline.
`SocLlmProvider` implements the official SoCLaaS bearer-authenticated chat API,
validates structured message content, owns the response stage/request identity,
and uses an overall deadline with bounded transient retries. Tests inject an
offline transport; a live key and chat model are still required for acceptance.

All AI requests originate from the backend. Input and structured output use Zod
contracts, errors are mapped to non-secret responses, and request logging redacts
learner code and reasoning. Question generation records minimal usage events;
learner assistant generation allows 100 logical MESSAGE and NEXT_HINT requests
per authenticated learner in a rolling ten-minute window across exercises. The
oldest request in that window determines Retry-After; reads and request replay
do not consume another slot. Historical quota fields remain for compatibility,
while the request ledger is authoritative for the rolling limit.

Instructor draft preparation is owned by
`apps/backend/src/exercises/instructor-drafts.ts`. It exposes generate, Save,
list and get operations behind the instructor HTTP boundary. Generation records
usage metadata without creating an exercise. Explicit Save creates a private
`DRAFT` Exercise and Python version 1 in one transaction, retaining the topic,
six editable fields and server-snapshotted provenance. The association is
instructor-reported; the generation ID does not attest to edited content.
The additive migration adds four nullable version fields without backfilling
legacy records. Incomplete legacy records are excluded from this draft surface.

`soc-question-v3` sends exactly fixed system instructions and one topic JSON
message. Structured output, two streaming byte caps (65,536-byte envelope and
32,768-byte selected content), one overall deadline and bounded transient retries
protect the boundary. String limits explicitly use JavaScript UTF-16 length.
Provider token counts outside PostgreSQL's nonnegative Int32 range become null.
No topic, code or provider content enters usage records or feature error logs.
The fake adapter is explicitly configured and never an automatic fallback.
Instructor-generated, edited and saved question content remains unverified;
instructor authoring never executes Python. Learner code runs locally in the
browser IDE described below and its results are not official grading.

## Environment separation

| Environment       | Database                                 | AI                         | Credentials                                  |
| ----------------- | ---------------------------------------- | -------------------------- | -------------------------------------------- |
| Local development | Docker PostgreSQL                        | Fake provider              | Local `.env`, never committed                |
| Tests             | Isolated test database or injected fakes | Fake provider              | Test-only values                             |
| Deploy preview    | Dedicated preview database               | Fake provider by default   | Protected GitHub/Netlify preview environment |
| Production        | Managed pooled PostgreSQL                | SoC LLM after verification | Protected production environment             |

`DATABASE_URL` is the direct connection used by Prisma migrations. `DATABASE_URL_POOLED` is preferred by application traffic in Netlify Functions. A preview environment must never reuse either production URL.

Only offline Prisma generation, formatting, and validation may use a placeholder
URL when `.env` is absent. Migrations, seeding, and other database commands require
an explicit `DATABASE_URL`; there is no implicit database write target.

## API conventions

- `/api/health` proves the process is running.
- `/api/ready` additionally checks PostgreSQL connectivity.
- `/api/v1/me` restores the authenticated user.
- `/api/v1/profile` accepts only a strict name update; attempts to send `role` fail validation.
- `/api/v1/instructor/ping` demonstrates server-enforced instructor authorization.
- `/api/v1/ai/hint-preview` demonstrates authenticated, learner-only AI validation and safe failure mapping.
- `POST /api/v1/instructor/questions/generate` produces one unsaved six-field
  preview and generation metadata.
- `POST /api/v1/instructor/drafts` explicitly saves edited fields, retained topic
  and a successful generation ID belonging to the current instructor.
- `GET /api/v1/instructor/drafts` lists the owner's complete drafts in descending
  creation-time/ID order, 50 at a time, with a bounded optional offset.
- `GET /api/v1/instructor/drafts/:id` returns an owner-only draft DTO.
  Missing, foreign, non-DRAFT and incomplete records share the same safe 404.

Both instructor POSTs require an exact configured Origin and JSON content type
after server session/role checks. Save performs no publication or verification.

### Reviewed publication and withdrawal

`InstructorQuestions` is the server boundary for owner list/get, same-draft Save,
Publish, Remove and learner list/get. Both the long-running server and Netlify
function compose the real Prisma implementation. Missing composition returns503.
F01 draft contracts retain their literal DRAFT status and fresh-per-Save creation.

| HTTP boundary                                                        | Contract                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/v1/instructor/questions?status=DRAFT\|PUBLISHED\|ARCHIVED` | Own state list, max50 plus bounded offset/nextOffset                                        |
| `GET/PATCH /api/v1/instructor/questions/:id`                         | Full owner record; PATCH updates current DRAFT using expectedRevision                       |
| `POST /api/v1/instructor/questions/publish`                          | Confirmed saved or preview discriminated request; published/existing authoritative response |
| `POST /api/v1/instructor/questions/:id/remove`                       | Confirmed archive; repeated Remove returns retained archive                                 |
| `GET /api/v1/learner/questions[/:id]`                                | LEARNER-only currently published explicit public projection                                 |
| `GET /api/v1/learner/questions?offset=&q=`                           | Optional case-insensitive title/topic search before 50-item pagination                      |
| `GET /api/v1/learner/dashboard`                                      | Authenticated learner's distinct exercise counts and up to five accessible current drafts   |
| `GET /api/v1/learner/questions/:id/attempt`                          | LEARNER-only current learner's attempt for the published version                            |
| `PUT /api/v1/learner/questions/:id/attempt`                          | Save own draft using expected revision                                                      |
| `POST /api/v1/learner/questions/:id/attempt/submit`                  | Finalize own attempt; identical retry returns the immutable final                           |

All mutation guards enforce real session, role, configured Origin, JSON, strict
schemas, ownership and current state. Parent-first conditional updates and version
writes run in one short READ COMMITTED transaction. Save and initial saved Publish
increment the bounded revision once. Database time supplies first publication and
archive timestamps. Published/archived content is immutable; archive retains IDs,
version references, provenance, timestamps and preview key.

One lowercase UUID per preview workflow is retained in an owner-scoped unique
publication key. Same-key replay returns existing authority before new association
lookup, including an archived result. Only that named uniqueness collision permits
one authoritative reread after transaction abort. Ambiguous commit acknowledgment
is UNKNOWN, never inferred rollback. The client freezes an uncertain publication's
captured normalized payload/key/revision and retries that exact attempt.

New generation events store a server-private normalized-topic SHA256 digest.
Bound previews must match it; old unbound previews use Save/open/Publish or
regeneration. Existing saved drafts use their persisted fixed topic. This binds
topic association, not the correctness or original generation of edited content.
Shared validation rejects NUL/unpaired surrogates before hashing or persistence,
retains UTF16 maxima, trims prose and preserves code verbatim.

Learner selection and DTOs expose identity/title/topic/instructor display name/
publication time plus version ID/problem/buggy code/expected behavior in detail.
Solutions, explanations, generation metadata, author email, hints and attempts
are absent. A separate public renderer displays literal text. The learner
assistant receives the private canonical fields only on the backend; those fields
are not added to the learner question DTO.

The learner list/detail reuses the published-question routes, DTOs and canonical
publication validation introduced for PR #9; it does not add a competing exercise
read API or select versions by timestamp. Search is an optional `q` query,
matched case-insensitively against title/topic before deterministic 50-row
pagination. Attempt storage is keyed to the canonical published `versionId` and
authenticated learner. The frontend requires nonblank Python code and explanation
and preserves indentation. Writes carry an expected revision; the service locks
the parent Exercise row, rechecks canonical publication eligibility while holding
that lock, then creates or advances the attempt in one transaction. Finalization
stores the submitted snapshot atomically and makes it immutable; identical retry
is safe while a different payload conflicts. The additive attempt migration
checks for duplicate learner/version rows before creating its uniqueness support;
it stops on duplicates and never deletes data automatically.

Learner mutations require the learner role, authenticated session, allowed
same-origin Origin, JSON content type, strict body schema and ownership. Browser
async responses are guarded by component lifecycle, learner identity revision and
session epoch so disposed pages cannot replace current state or clear another
page's unsaved-work guard. Both `apps/backend/src/server.ts` and
`netlify/functions/api.ts` compose the real attempt service; missing composition
fails closed.

### Learner assistant

The question page composes `LearnerAssistantPanel` with four authenticated,
learner-only boundaries: read conversation state, send a MESSAGE or NEXT_HINT,
clear the private conversation, and reconcile an uncertain request by request
ID. Conversations are scoped to the learner and canonical published version;
foreign, removed and noncanonical records are not exposed. A final submission
makes new coaching read-only, although the learner may still clear the chat.

Each request chooses whether to share current editor code, reasoning and local
run output. Scratch tests and standard input are never included. The provider
context combines the exercise's server-private canonical fields, only the
selected current fields, and a bounded compatible history. Changing sharing
categories does not silently retain a withdrawn category in later provider
context. Replies render as inert text and cannot execute tools, edit code, run
Python, fetch URLs or read browser storage.

Coaching starts at level 1. A successful reply enables **Next hint**, which can
advance through levels 2 and 3; a provider or policy failure does not unlock the
next level. The service uses request IDs, conversation revisions, generation
numbers and expiring pending leases so retries and late results do not create
duplicate logical requests or overwrite newer state. When delivery is
uncertain, the client offers **Check status** instead of automatically sending
another mutation.

The persisted request ledger enforces 100 MESSAGE or NEXT_HINT requests per
learner across exercises in a rolling ten-minute window. Reads, status checks
and idempotent replay do not consume an additional slot. Up to 50 messages are
returned. Successful activity extends content expiry by 30 days; the scheduled
cleanup Function runs every 30 minutes and clears expired content. **Clear
chat** deletes stored messages and snapshots but preserves the progression level
and rate-limit ledger.

`FakeAiProvider` validates deterministic mechanics but says nothing about live
coaching quality. The final authorized live evaluation of the free-text design
remained blocked: finite local policy checks passed, but one encoded complete
solution was delivered and benign coaching was also rejected. Therefore the
known output policy is a limited mitigation, not a universal security boundary
or evidence that live coaching is production-ready. The subsequently approved
constrained-coaching redesign remained planning-only and is not documented here
as delivered behavior.

### Browser Python IDE

The learner workspace uses CodeMirror 6 with Python syntax highlighting, line
numbers, indentation, bracket matching, undo/redo and keyboard editing. New
attempts start from the published buggy code; saved drafts and final attempts
remain authoritative. Source is limited to 20,000 UTF-16 code units. Learners
can Run Python or Test it with their own scratch assertions and optional
standard input. Test requires nonblank scratch-test code. The page displays actual
stdout, stderr, errors and run state; results are local feedback, not grading or
submission. Scratch tests (10,000 code units) and stdin (8,000 code units) are
temporary and never enter attempt API payloads. Editing code, tests or stdin
marks the previous output stale. Run results do not change saved or final state.

Each run creates a fresh `sandbox="allow-scripts"` opaque-origin iframe and
dedicated classic worker. There is no same-origin fallback. The exercised
browser boundary denies application storage, cookies, API/external network,
parent DOM and host-file access. The parent fetches only fixed same-origin
runtime assets with credentials omitted; no CDN, server-side Python execution
or provider call is involved. The pinned `pyodide@314.0.7` runtime executed
CPython 3.14.2 in the tested browsers. Combined output is capped at 64 KiB of
UTF-8 with Unicode-scalar-safe truncation; error text is separately bounded at
8,000 bytes. Stop tears down the run, execution has a five-second limit after
the Running state, and initialization uses a separate 30-second phase timer.
Loading messages may restart that timer, so it is not a strict total wall-clock
bound. Browser memory/process quotas, IPC-flood resistance, physical-touch
behavior and screen-reader certification were not established by these tests.

`npm run build:python-runtime` bundles the worker and copies the pinned runtime
assets, standard library and license notice into the ignored generated
`apps/frontend/public/pyodide-runtime/` directory. The frontend workspace's
`predev` and `prebuild` scripts run this generator before Vite development or
production builds. The worker uses Pyodide's experimental `createPyodideModule`
factory hook; the version remains pinned, and upgrades require renewed real
execution and isolation checks. Build success does not mean a deployment has
occurred.

UI routes are `/`, `/instructor/questions?status=...`, `/instructor/questions/:id`,
`/instructor/questions/new`, `/learner`, `/learner/question`, and
`/learner/questions/:id`. The legacy learner list `/learner/questions` redirects
to `/learner/question`, preserving its query. Learner **Home** opens `/learner`,
instructor **Home** opens `/instructor`, and signed-in branding is inert; the
dirty-work guard still confirms role navigation away from an edited attempt.
Legacy `/instructor/drafts[/:id]` URLs remain supported. The data-router discard
boundary covers Link/POP/New/reload/sign-out; beforeunload uses the browser warning.
An admitted editor stays mounted with mutations disabled after expiry. Identity
keys dispose prior editor memory before another identity receives an authorized
fresh read. No autosave or cross-reload recovery is implemented.

Window focus checks the session in the background so an unchanged identity keeps
mounted pages, loaded list items and pagination offsets. Initial authentication
and explicit refresh still use blocking loading. A confirmed identity change
remounts the protected page by user ID; a confirmed expired session removes
ordinary protected pages while retaining the admitted disabled editor behavior.

Learner attempt writes with an unknown outcome or HTTP 409 trigger a read-only
GET of the current attempt; the client never retries the mutation automatically.
A confirmed draft updates the expected revision. Matching local text is marked
saved; differing local text remains visible and dirty for a later learner-
initiated Save. If no attempt exists, local text remains and the next Save uses a
null expected revision. If the read also fails, code and reasoning remain intact,
Save/Submit stay disabled, and **Retry attempt check** performs another GET only.
A confirmed final submission is authoritative and read-only; when it differs
from unsent local edits, the submitted snapshot is shown separately from the
retained local code/reasoning. The reasoning field accepts up to 5,000 UTF-16
code units, shows at most four rows at once and scrolls longer text internally.

Apply the additive F02 migration before new code rollout; migration/function
deployment is not atomic. Its archive preflight stops existing undated archived
rows for owner reconciliation rather than inventing dates. Rollback disables new
routes while retaining additive fields and committed outcomes. Structural
old-schema/FK rehearsal is separate from public behavior integration tests.

Every response carries an `x-request-id`. Error bodies contain a stable code, recoverable message, request ID, and optional validation details. Internal stack traces, Prisma errors, provider responses, cookies, and credentials are not returned.

## Testing strategy

F02 and learner checks include contracts, focused HTTP policy doubles, real-cookie/PG public
behavior, CAS races and real SQL rollback faults, PG wire faults for unavailable
replay reads/lost COMMIT acknowledgments, intercepted desktop/mobile UI, composed
browser cookies/PG/fake AI, and extracted Netlify publication/read/archive smoke.
The opt-in browser runtime's owned loopback transport proxy can drain one committed
publication success then drop the downstream response via a private marker; this
fault is outside production composition. See the F02 implementation handoff for
actual commands/results and remaining manual/CI limitations.

Earlier learner-workspace verification passed 516 deterministic tests, 198
PostgreSQL integration cases, 144 normal browser passes with 20 expected opt-in
skips, 16 focused learner browser cases, built-frontend route/viewport loads and
two extracted Netlify smoke flows. Those database/Netlify results are prior
evidence; PR10 did not rerun business-logic integration or package smoke.

PR10 independently verified 531 deterministic tests (including 15 isolated
opt-in database-guard cases), 24 focused recovery/layout browser cases, and 168
normal browser passes with 20 expected opt-in skips. The normal collection and
suite passed with all four database URL variables and both auth opt-ins unset;
ordinary browser runs need no database URL. The eight opt-in composed journeys
use real local cookies/PostgreSQL, captured SMTP and fake AI without browser
interception or live providers. Lint, typecheck, formatting, production build
and 16 synthetic built-frontend loads passed. Focused recovery browsers use HTTP
test doubles. These layers overlap and are not one aggregate test count.
The PR10 checks were local and do not establish remote CI/deployment or
live-provider behavior. No Python runner was provided at that earlier checkpoint;
the later ZH-LWS-02 section documents browser-local execution. Manual
screen-reader/contrast checks remain unverified. See the [PR10 independent
report](../workflow/evaluations/zhenghao/ZH-LWS-01/pr10-testing.md) for its
revision-specific commands and boundaries.

The independent ZH-LWS-02 review passed within the approved tested scope at
`2470a3b`. On that final product revision, the affected browser matrix passed
26/26 and production-built Python integration passed 6/6; collection found 226
cases in 16 files. The earlier full normal browser run remains 199 pass / 20
expected skips / 3 harness failures; its corrected affected subset passed 4/4.
No complete 226-case green local run is claimed. Round-one root 531/531, production
runner/isolation 20/20, composed 8/8 and 16 built-route loads refer to earlier
source `36df16b`; round two changed only viewport-range state and reverified the
affected and built matrices. These local checks do not establish remote CI,
deployment or live-provider behavior. Separately, remote CI for code/test
checkpoint `929d0ec` passed both verification and browser jobs (206 passed, 20
expected skips). That run does not verify this documentation commit; see the
[workflow run](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/actions/runs/42240818024)
and [ZH-LWS-02 independent report](../workflow/evaluations/zhenghao/ZH-LWS-02/testing.md)
for revision-specific evidence and limits.

PR11's first browser job failed after the assistant's new initial GET reached an
unmocked real backend in intercepted learner journeys. The schema-valid fixture
repair was followed by a full local browser pass (208 passed, 20 expected
skips), then green remote `verify` and `browser` jobs. This proves the repaired
fixture and covered workflows, not live-provider safety. The assistant's final
independent live-security verdict remained blocked as described above.

When defaults are occupied, set `E2E_APP_ORIGIN=http://127.0.0.1:5273` and
`E2E_BACKEND_PORT=3101`; the test origin validator allows only a bare HTTP loopback
origin. The harness forwards that backend port to Vite's test proxy. Defaults stay
5173/3001. Preserve unrelated listeners and always use a verified owned `_test`
database with matching direct/pooled/test/E2E URLs for composed checks.

- Contract tests cover accepted and rejected shared schemas.
- Vitest covers configuration parsing and AI response validation.
- Supertest covers probes, safe errors, unauthenticated access, revoked sessions, role checks, role-escalation rejection, deterministic AI output, and provider failures.
- Playwright covers the public page, authentication entry points, responsive rendering, and unauthenticated role-route behavior. Its opt-in `auth-real.spec.ts` additionally checks real local PostgreSQL password registration, session restoration, denied login, retry, and logout on desktop/mobile without response interception. Set `E2E_REAL_AUTH=1` and an owned migrated loopback `_test` target through `E2E_TEST_DATABASE_URL`; the default target is port 5433. Both browser/auth origins are 5173, and the harness awaits backend and proxied API health. SMTP/Google are disabled in this synthetic runtime; live-provider and production acceptance remain separate.
- The ordinary `npm run test:e2e` suite uses a synthetic runtime and does not need a database URL. For no-database collection and suite checks, unset `DATABASE_URL`, `DATABASE_URL_POOLED`, `TEST_DATABASE_URL`, `E2E_TEST_DATABASE_URL`, `E2E_AUTH_COMPLETION`, and `E2E_REAL_AUTH`.
- CI runs PostgreSQL 17, applies committed migrations, seeds fixtures, and performs all deterministic checks before deployment.

Tests must not call Google, the NUS SoC LLM, Netlify, or production services.

`E2E_AUTH_COMPLETION=1` selects the private captured-outbox browser runtime.
For opt-in composed browser journeys, set all four database URL variables
(`DATABASE_URL`, `DATABASE_URL_POOLED`, `TEST_DATABASE_URL`, and
`E2E_TEST_DATABASE_URL`) to the same explicit owned, safe loopback PostgreSQL
URL ending in `_test`. The test hook validates the matching targets before
constructing Prisma; module loading alone does not create a client. Then run
`npm run test:e2e -- tests/e2e/auth-completion.spec.ts --workers=1`; leave the
separate no-SMTP `E2E_REAL_AUTH` flag unset. Both role journeys use real local
HTTP, cookies and PostgreSQL without browser interception. Google authorization
is substituted by the test controller, with typed server exchange/profile
doubles; it is not live Google or successful UI initiation evidence. The
six-action feedback suite deliberately intercepts error/pending responses.

After a build, `node --import tsx scripts/verify-built-frontend.ts` checks the
emitted frontend on desktop/mobile using an owned ephemeral local preview with
only a synthetic anonymous API. It rejects page errors, external assets and
horizontal clipping across public auth routes. Hand-selected vendor chunks once
produced a circular initialization failure despite passing dev-server journeys;
Rollup now chooses the chunk graph. A bundle size warning is not suppressed.

Local packaging checks use the pinned CLI's real packager without site linkage or
deployment. After a local build, install/locate Netlify CLI 27.16.1, then run
`node scripts/package-netlify-artifact.mjs <absolute-netlify-cli-package.json>`.
The helper reads `netlify.toml`, retains included/external file settings, and emits
a ZIP and manifest under a fresh ignored `.netlify/node_modules/auth-smoke-*` directory. Extract
the ZIP and pass its `netlify/functions/api.mjs` to
`node --import tsx scripts/verify-netlify-artifact.ts <absolute-extracted-api.mjs>`.
Set explicit identical `TEST_DATABASE_URL`, `DATABASE_URL` and
`DATABASE_URL_POOLED` to an owned, migrated loopback `_test` database first. The
runner disables external credentials, creates/deletes only its synthetic user,
and checks readiness, both allowed/denied role access, cookies and revocation.
This executes the packaged application Web handler; it does not exercise AWS's
bootstrap or establish deployed-platform, live Google or SMTP correctness.

## Deployment

Netlify publishes `apps/frontend/dist` and packages `netlify/functions/api.ts`.
The default Web handler selects the modern ESM runtime for Prisma's
`import.meta.url`; a tested adapter preserves Express requests and auth cookies.
`/api/*` is rewritten to the Express function;
other paths fall back to `index.html`.

The contracts workspace builds first and exports JavaScript in production;
development conditions retain live TypeScript source. `npm ci` prepares its
compiled export before tests, so the Function never depends on an external
workspace TypeScript file being executable in the deployed artifact.

GitHub Actions provides:

- CI for formatting, linting, type-checking, Prisma validation/migrations/seed, tests, and builds;
- a production workflow restricted to `master` and the protected production environment.

Native Netlify owns trusted-team PR previews on the development site; there is no
duplicate GitHub preview deployment job. The dependency-free ignore command allows
that site's `deploy-preview` context and production-context builds from `master`.
It skips branch deploys and all production-site native builds before the build
command runs. Its `npm run build:netlify` validates
the development Supabase target, applies migrations, and builds before publishing.
Build metadata bundles each preview's exact origin with its Function. It contains
no secrets, and simultaneous PRs do not overwrite shared origin variables.

Google login uses Better Auth's dev-only OAuth proxy through the stable dev
callback. Configure the same dedicated proxy secret on stable dev and trusted
previews, and deploy stable dev first. Actual production cannot enable this proxy.
The stable dev callback updates automatically after merges to `master`, along
with the development frontend and API. It remains required for Google preview
login; PR builds publish their own preview URLs without replacing stable dev.
See [credential setup](CredentialsSetup.md#automatic-preview-origins-and-a-fixed-google-callback)
for the required one-time dashboard configuration and trust boundaries.

The production workflow installs dev build tools explicitly, applies migrations,
and deploys the immutable build with `--no-build`. Keep native production Git
builds disabled so they cannot bypass the protected GitHub environment. A
migration failure stops publication. Schema changes must remain backward-compatible
with running deployments because migration and function deployment are not atomic;
all development previews still share one development database.

The production CLI command explicitly selects `@debugclinic/frontend` using
`--filter`; otherwise a noninteractive runner stops at workspace selection.
It passes absolute publish and Functions paths because selecting a
workspace changes the CLI working directory for relative Functions arguments.
Netlify CLI 27.16.1 rejects `--context` together with `--no-build`. The job sets
`CONTEXT=production` in its environment and uses `--no-build --prod` to upload
the existing artifact without invoking another build.

If `debugclinic-prod` reports "Production must use the protected GitHub workflow,
not a native Netlify build", its native builds are still active. On that site,
open **Project configuration → Developer settings → Continuous deployment → Build
settings → Configure**, then set **Build status → Stopped builds**. This still
allows GitHub's CLI deployment. Keep native builds active on `debugclinic-dev`.
Do not remove the production guard or confuse this setting with stopping auto
publishing. After the corrected workflow reaches `master`, run **Deploy production**
from GitHub Actions on `master`; retrying an old failed job uses its old workflow.

References: [Netlify deploy flags](https://cli.netlify.com/commands/deploy/),
[stopping native builds while allowing CLI deploys](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/).

## Security notes

- Learner Python executes only in the browser-local sandbox described above; the backend does not execute it and output is not official grading. The exercised isolation checks do not establish hard browser memory/process quotas or IPC-flood resistance.
- Some legacy endpoint throttles are process-local; the learner assistant's
  rolling quota is database-backed and works across function instances.
- Authentication audit tables exist, but Better Auth event hooks still need to be wired after email and OAuth flows are verified.
- Instructor generation and learner coaching persist bounded provider usage when
  the provider reports it. Missing usage remains unknown rather than zero.
- The learner assistant's local output checks cannot guarantee semantic safety;
  the final authorized live evaluation delivered an encoded complete solution
  and rejected benign coaching. Use the fake provider for deterministic
  development and treat live-provider enablement as a separate unresolved
  product and security decision.
- Numeric grading uses `AttemptGrade` and its role-scoped routes. Legacy
  `Review` decision and comment data remain separate from this workflow.
- Account-linking behavior must be tested against the final Google configuration before production launch.

## Acknowledgements

- [Better Auth documentation](https://better-auth.com/docs/) informed the Express, Prisma, cookie, session, and Google authentication foundation.
- [Netlify Express documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/) informed the `serverless-http` function adapter and rewrite.
- [Prisma Netlify deployment documentation](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-netlify) informed the pooled application connection requirement.
- React, MUI, Express, Prisma, Zod, Vitest, Supertest, and Playwright are used under their respective licenses.
