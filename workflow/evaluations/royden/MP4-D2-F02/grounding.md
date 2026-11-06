# F02 source grounding — 2026-11-06

Assignment F02-GROUND-01, fresh read-only generic agent `/root/f02_grounding`.
Baseline `982b0641cd45bf8184bca8e623c36b611af9d898`, branch
`royden/mp4-d2-f02-publish-question`. Coordinator received the investigator's
complete report; the following is a concise source-evidence checkpoint.
No tests, services, database/provider calls, commits or application edits occurred.

## Current behavior and F02 gaps

- `apps/frontend/src/pages/GenerateQuestionPage.tsx:44–118,163–208` generates
  an unsaved editable preview, then explicitly saves and opens private detail.
  The topic becomes read-only after generation; leaving/reloading loses the
  preview (`docs/UserGuide.md:82–85`).
- `InstructorDraftsPage.tsx:50–130` lists own saved drafts; detail at
  `InstructorDraftPage.tsx:16–86` is read-only. Existing F01 browser tests
  expressly assert absence of publish/delete/edit controls. F02 must update
  affected expectations once implementation is authorized.
- Actual six fields in `packages/contracts/src/index.ts:75–109` are `title`,
  `problemStatement`, `buggyCode`, `expectedBehavior`, `bugExplanation`, and
  `correctedSolution`; topic is separate. The last two fields are explicitly
  instructor-only in `InstructorDraftFields.tsx:42–44`. A learner response needs
  its own deliberately limited contract.
- `apps/backend/src/app.ts:318–391` implements protected instructor generation,
  save, list and get. POSTs require configured Origin and JSON. No saved update,
  publication, removal/deletion or learner publication retrieval is implemented.
- `apps/backend/src/exercises/instructor-drafts.ts:197–261` checks own successful
  generation metadata, then transactionally creates a fresh DRAFT Exercise and
  Python version 1. Repeated saves can create distinct drafts; it is not update.
  List/get select own complete DRAFT/Python-version-1 records (`:270–335`).
  Foreign/missing/non-DRAFT details share safe 404. Generation provenance is
  instructor-reported and does not attest edited content.
- `apps/frontend/src/pages/LearnerDashboardPage.tsx:5–12` is a placeholder;
  `App.tsx:46–60` has no learner published-list/detail journey. Existing learner
  hint preview is not publication retrieval.

## Inherited publication and persistence constraints

- `PRODUCT.md:28,33,49–51` requires instructor preparation/human verification,
  exactly three approved ordered hints before publication, progressive coaching
  and API-enforced authorization. No arbitrary Python execution is permitted
  without a separately reviewed sandbox. F02 need not add AI calls.
- `prisma/schema.prisma:16–21,120–169` already models DRAFT, VERIFIED, PUBLISHED
  and ARCHIVED, Exercise versions, and HintStage stage/title/content/approvedAt.
  F01 creates no hints. There is no current/published-version pointer.
- Initial SQL `prisma/migrations/20261101000000_initial/migration.sql:321–334`
  constrains hint stages to 1–3 and requires publication time for PUBLISHED;
  it does not enforce published immutability or exactly three approved hints.
  `docs/DeveloperGuide.md:84` assigns the latter to transaction-level service checks.
- Exercise deletion cascades versions and hints; attempts restrict deletion of
  referenced versions (`prisma/schema.prisma:147,163,179`). Removal/deletion
  policy must reconcile retained learner records if relevant; no existing
  archive/delete operation settles that product decision.

## Decisions reserved for owner clarification

Scope proposal must cover saved-draft editing, both publication entry points,
published immutability, required hint preparation/review/approval, own published
management and a minimum learner verification view. Removal versus deletion,
republishing, review meaning, hint input source, learner-visible fields/audience,
and preview persistence/publication behavior remain product decisions.

## Evidence and monitoring limits

These are source/schema/test-definition findings, not fresh runtime acceptance.
F01 test tiers are documented in `workflow/agents/FEATURE_MAP.md:20–23`; fake AI,
HTTP doubles, real PostgreSQL, human accessibility and live semantic proof remain
distinct. No F01 SDD, secrets or unrelated artifacts were inspected by the investigator.
Coordinator corroborated the child's own session metadata and parent mapping.
At the first collection, observed grounding response tokens were 383,552 versus
120,000 soft estimate; coordinator 891,090 versus 350,000. Overall 1,274,642
includes cached input (1,121,408); it is not billing or account quota usage.
Those are an early partial snapshot, not final totals. Initial feature estimate
was 600,000. Overrun prompted ending broad grounding and using the completed
facts for a concise Mission Brief; acceptance/gates remain unchanged.
