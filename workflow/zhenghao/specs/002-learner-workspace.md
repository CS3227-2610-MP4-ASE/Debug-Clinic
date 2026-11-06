# ZH-LWS-01 — Learner workspace requirements and delivery plan

Date: 6 November 2026 (Asia/Singapore).
Contributor: Zhenghao. Branch: `zh/learner-workspace`.
Inspected base: `69d3a30ec8e581739d52a1491111736dbcd2e34d`.

## Status and authority

Human scope approval: this chat's structured replies approve browsing/search,
the split workspace, saved/final attempts, and unavailable Run until a secure
runner is approved. The same replies approve selecting the newest version
created by the publication timestamp, requiring code and explanation, and
immutable final submission with confirmation and no Run prerequisite.

Following the requirements draft and PR #9 compatibility review, the human gave
the explicit green pass: "continue and work on the necessary tasks" and requested
a completion summary. This authorizes the described scope, compatible local
dependency integration, implementation, verification, routine repairs and docs.
The latest human instruction consolidates the intermediate approval prompts;
independent testing/review still occurs in the single testing conversation.
No independent pre-implementation package review is claimed. Current gate:
authorized implementation. Integrated PR #9 head: 7ac19d5; local base: ae0097c.

The Developer 2 workflow is read as required by AGENTS.md; this Zhenghao plan
does not claim access to or approval of Developer 2 SDD. Its excluded paths were
not searched. Existing `.gitignore` changes and `docs/Reflections-ZhengHao.md`
are user-owned and remain untouched.

## Verified starting point

- `/learner` is a placeholder in `apps/frontend/src/pages/LearnerDashboardPage.tsx`.
- `apps/frontend/src/App.tsx` has no learner question-detail route.
- The shell uses a large, padded content container unsuitable for an editor.
- Backend APIs support authentication and instructor drafts, but not learner
  browsing, attempts, submission, publication, or Python execution.
- Prisma has Exercise, ExerciseVersion, HintStage and Attempt models. No
  published-version pointer or attempt revision field exists.
- These observations describe only the local base above. Open PR #9 supplies
  published-question list/detail APIs, pages and instructor publication/removal.
  Its compatibility baseline supersedes assumptions based only on this checkout;
  see `../verification/005-pr9-compatibility.md`. Screenshots 3 and 4 supply layout
  only. The instructor role is INSTRUCTOR, not a new ADMIN role.

## Requirements

| ID     | Requirement and measurable acceptance                                                                                                                                                                                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LWS-01 | `/learner` shows a compact list of published questions with a labelled `Search questions` field. Case-insensitive title/topic search, keyboard-operable question links, published metadata, paging, loading, error/retry, empty-list and no-results states work. Search survives opening a question and returning. No invented difficulty, statistics, locks or solved counts.     |
| LWS-02 | `/learner/questions/:exerciseId` has title/topic/problem/expected behavior on the left and a Python 3 editor above output on the right. Existing light MUI tokens and branding remain. The page uses viewport space without changing instructor/public layout. Mobile stacks all regions, including actions, without page overflow at 320px.                                       |
| LWS-03 | A horizontal separator resizes editor/output on desktop with pointer capture and keyboard arrows; minimum editor/output heights, an accessible name, orientation, current/min/max values and focus styling are present. Resize preserves edits; mobile uses a stable stacked layout. Output is escaped text and preserves whitespace.                                              |
| LWS-04 | The server exposes only published, learner-visible data and the authoritative eligible Python version. Unauthenticated and wrong-role requests are denied. Drafts, private solutions/explanations/provenance, hints and other learners' attempts never enter learner DTOs. Invalid/unavailable questions return safe errors.                                                       |
| LWS-05 | Learners explicitly save bounded code/explanation drafts, reload their own saved attempt, and confirm final submission. Finalization atomically saves current code/explanation and makes that attempt immutable. No Run prerequisite. Duplicate finalization is safe; stale/concurrent saves and finalize-vs-save races cannot replace final content. Errors preserve local edits. |
| LWS-06 | Python 3 is fixed; Run is visibly disabled with a useful availability explanation. Production performs no execution or fabricated output. Typed runner/result states are exercised only through injected test doubles. No AI calls, execution-service setup or deployment changes are introduced.                                                                                  |

Bounds proposed for review: search at most 200 UTF-16 code units, preserve PR #9's
50-item pagination and nextOffset behavior, code at most 20,000 and explanation at most 5,000 UTF-16 code
units. Save/final submission require nonblank code and explanation; code bytes
and indentation are preserved. Validate boundaries with surrogate-pair cases.

## Design brief

Mode: Operate. A learner scans a short question list, opens a case, edits Python,
explains the change, saves it and makes an explicit final handoff to the
instructor. Keep the existing Manrope, warm canvas, white surfaces and blue
actions. Use compact rows rather than the screenshots' oversized headings and
large spacing. No visual-world replacement or decorative assets are needed.

Desktop: compact question header, approximately 40/60 description/work area
split, independent description scrolling, labelled Python editor and reasoning
field, then a resizable output region. Save draft and Submit are explicit;
Run remains unavailable. Submitted attempts show a read-only state. Mobile:
description, code, reasoning, actions and output in reading order. Keep controls
at least 44px high. Use an accessible multiline code field; no new editor library.

## Technical boundaries for the authorized implementation

1. Reuse PR #9's PublishedQuestionSummary/PublishedQuestion DTOs and public
   response schemas. Add a separate attempt contracts module with named exports.
   Preserve the existing CONFLICT code and optional mutationOutcome field; do
   not redefine shared schemas or generalize instructor mutations.
2. Extend only `listPublished` with optional validated `q`, keeping the no-q
   behavior, 50-item pages, nextOffset and deterministic ordering. Apply search
   before pagination; filtering the currently loaded page alone is insufficient.
   Keep all owner mutation methods unchanged. Add an injected learner attempt
   service; do not duplicate the publication service or GET detail endpoint.
3. Preserve GET `/api/v1/learner/questions[/:id]` and frontend
   `/learner/questions[/:id]`. `/learner` may link or redirect to the canonical
   list; keep existing deep links. Add attempt routes beneath
   `/api/v1/learner/questions/:id/attempt` (GET/PUT) and `/attempt/submit` (POST).
   Validate LEARNER before service invocation. Clients send code, reasoning and
   expected attempt revision, not learner IDs, statuses or version authority.
4. Pin attempts to the canonical published `versionId` returned by PR #9; its
   current publication model uses an immutable version 1. Do not introduce a
   competing timestamp selector or require hint rows for learner access. The
   earlier timestamp proposal is superseded by this compatibility constraint;
   any future multiversion selection requires a coordinated publication contract.
   Do not expose hint content or add hint generation/delivery in this feature.
5. Add an additive attempt revision and uniqueness policy in Prisma if required
   by review. Proposed invariant is one attempt per learner/version. Initial
   save or submission starts at revision 0; later operations require the exact
   persisted revision. Compare-and-swap finalization from DRAFT makes code,
   explanation, status and submitted timestamp atomic. Identical final retries
   return the final attempt; different payloads conflict. Scope attempt queries
   to the authenticated learner and canonical published version. Serialize the
   publication-state check with attempt mutations so Remove racing with save or
   finalization cannot create work after archival. Preserve archived questions,
   versions and existing attempt/review references; never cascade-delete them.
6. Existing databases may contain multiple attempts per learner/version. Inspect
   a safe local fixture before choosing a migration; never delete or merge user
   data automatically. If uniqueness cannot be added safely, return this design
   issue for review rather than weakening concurrency guarantees.
7. Extend PublishedQuestionsPage and PublishedQuestionPage rather than create
   parallel list/detail pages. Reuse the question client/error mapping and
   UnsavedWorkProvider; isolate learner search state from instructor pagination.
   Add editor/result and resizer modules. AppShell's learner-detail-only layout
   must retain the existing confirmDiscard sign-out protection. Preserve focus
   refresh, sessionEpoch and account-identity disposal. Any learner editor
   retention adjustment in RoleRoute is additive and regression-tested against
   existing instructor editor behavior. No localStorage of code or explanation.
8. Draft loading must never overwrite edits made while a request was in flight.
   Cancel obsolete reads, reject stale responses, mark unsaved edits and warn
   before in-app navigation loses them. Saving displays server-confirmed state.
9. Integrate against the reviewed PR #9 implementation or its eventual merge
   commit before product-code edits, recording the exact base and permission.
   Do not merge, cherry-pick or rewrite Royden's branch without authorization.
   Recheck the live PR head at dispatch; a changed SHA requires a focused review.
   Apply its existing publication migration unchanged before a separately named
   attempt migration. No production seed or publication implementation is added.
   Missing prerequisite code is a dependency, not permission to recreate it.

## Four-conversation delivery

| Stage          | Model / effort                          | Scope and handoff                                                                                                | Initial soft estimate / ceiling |
| -------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| planning       | Actual telemetry: gpt-6.1-sol / high    | Current chat; approved decisions, plan and implementation prompt; later orchestration remains here               | 750,000 tokens / 30 minutes     |
| implementation | Requested available gpt-6-luna / medium | One fresh local project chat, whole approved feature and focused unit tests; reuse for repairs                   | 1,500,000 tokens / 2 hours      |
| testing        | gpt-6.1-sol / high                      | One independent chat: acceptance tests, functional/standards/security reports and integrated verification; reuse | 1,000,000 tokens / 2 hours      |
| documentation  | gpt-6-luna / medium                     | One chat: DG, UG, feature map and relevant incremental reflection                                                | 250,000 tokens / 30 minutes     |

These numbers estimate cumulative response usage including repeated context,
not unique text, billing or calibrated task costs. Budget crossings cause a
checkpoint and narrower context; implementation is already routed to Luna.
Planning/testing keep Sol high. No automatic budget increase or weaker checks.

At planning approval only the planning chat existed. Tool discovery verified
support for create_thread and the requested models, not actual future dispatch.
Generate testing and documentation prompts after their input evidence exists.
Create no per-component, per-failure, or completion chat.

## Verification plan

- Contracts: strict public DTOs, UTF-16/nonblank bounds, search/paging validation.
- HTTP: absent/wrong role, unavailable service, not found, malformed requests,
  no private-field leakage and safe conflict responses.
- PostgreSQL: PR #9's authoritative version/visibility policy, ownership, saved
  reload, duplicate creation, concurrent save/finalize and immutable finals.
  Verify no-hint publication remains browsable, archived/draft questions are
  hidden, and remove/save races preserve retained references.
- Playwright: list/search/back, loading/retry/empty, editor/reasoning save,
  confirmation/final state, unavailable Run, stale-read safety, pointer/keyboard
  resize, auth denial, 1440px desktop and 390px/320px mobile without page clipping.
- Run focused checks then format/lint/typecheck, deterministic tests, isolated
  PostgreSQL integration, focused/full Playwright, production/declaration build
  and built-frontend smoke. Node 24 is required; discovered default Node is 26.
  Do not describe prerequisites or unrun checks as passed.
- At most three meaningful repairs per verification failure and two review
  correction rounds. Functional, standards and security verdicts stay separate
  within the single testing chat; any procedure exception must be explicit.
- Preserve PR #9's F01/F02 contract/HTTP/integration/composed tests and focus-refresh
  tests. Update learner-only assertions deliberately when code becomes an editor
  or attempt retrieval is added; retain privacy, escaped-code, disabled/no-call
  hint and unauthorized-access expectations. Add an instructor publishes ->
  learner saves/submits -> instructor archives journey on the integrated base.

## Evidence and documentation

Canonical collector and Zhenghao wrapper remain unchanged. Map only verified
session files; planning's collection lower bound is this feature's current turn,
excluding older prompt-writing work. Raw state is outside Git; sanitized reports
are under `workflow/evaluations/zhenghao/ZH-LWS-01/monitoring/`. A private manifest
is available in this coordinator's tool history, not in committed documentation.

Keep missing stage measurements null. Do not infer model cost savings from token
counts alone or cache improvements from one snapshot. Report overall and stage
usage, both reasoning denominators, diagnostic coverage and coordinator overhead.
The canonical monitor warns when estimates reach budgets as well as actual usage;
check measured counts before describing a warning as an observed overrun.

Read `docs/reflection-requirement.md` during documentation. Add only supported
observations to `docs/Reflection-ZhengHao.md`, creating it beside the requirements
file as requested. Preserve the existing user-owned plural-named file. Do not
answer all reflection questions, write generic placeholders, or change
`docs/Reflections.md`. Reuse the documentation conversation as evidence grows.

Next action: one Luna implementation conversation followed by one Sol-high
testing conversation, repair iterations if necessary, and one documentation
conversation. The PR #9 dependency is integrated locally with human authority;
no remote merge, push, publication or deployment is authorized.
