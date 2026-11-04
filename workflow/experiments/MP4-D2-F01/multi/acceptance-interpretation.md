# MP4-D2-F01 independent acceptance interpretation

Frozen interpretation prepared 2026-11-04 UTC before implementation exposure,
dependency installation, or executable test authoring. Actor: Developer 2
acceptance_test_author, generic collaboration agent `/root/f01_acceptance`,
fork_turns=none with inherited defaults. Own session metadata confirms session
`01a1a801-8f55-7b40-9c40-ed8b421ec96a`, start
`2026-11-04T19:20:36.950Z`, model `gpt-6.1-sol`, effort `high`.
Raw session remains outside Git; no transcript or private reasoning is retained.

Worktree: `Debug-Clinic-f01-multi-acceptance`; branch
`royden/f01-multi-acceptance`; exact base
`98f0f8de62edbd3a54f0f50f011c7dd6b571ef71`.
Authority: assigned owner-authorized local work on `agent-eval-reviewed-v1`,
approved snapshot `597ecf887319e942ad46171bae7349404fbd1d36` and its
`PackageApproval.md`. Historical draft labels are superseded. Complete approved
PRD, TDD, RTT and PackageApproval were read, alongside role/workflow/standards,
baseline contracts, createApp, provider and representative test infrastructure.
No implementer branch, diff, result, or conversation has been consulted.

## Observable interpretation and independent fixtures

The accepted flow is instructor topic -> exactly one unsaved six-field preview
-> local edits -> explicit private Save -> own list and read-only reopening.
PC-01 locks the original topic after preview; only New question clears/unlocks it.
No generation session, signed content association, deduplication, Python execution,
semantic classifier, saved edits, publication or extra workflow is implied.

Literal accounts are `f01-owner`, `f01-other`, `f01-learner` and no session;
database accounts may use unique run suffixes for safe cleanup. Literal topic A is
`Python lists and for loops`; ordinary alternate `Python dictionaries`;
multi-concept `Python lists, loops and conditionals`. Refusal representatives:
`stuff`, `Java interfaces`, `Python metaclasses and custom descriptors`,
`Plan a holiday`, and a declared unsuitable output. Blank input fails before work.
Injection and delimiter topics remain one user JSON string and confer no powers.

Draft A is independently hard-coded as:

```json
{
  "title": "Sum every list element",
  "problemStatement": "The function should sum all numbers in a list. Find and fix the conceptual bug.",
  "buggyCode": "def total(numbers):\n    result = 0\n    for number in numbers[:-1]:\n        result += number\n    return result",
  "expectedBehavior": "total([2, 4, 6]) returns 12; total([]) returns 0.",
  "bugExplanation": "The slice excludes the last element, so the loop omits one number.",
  "correctedSolution": "def total(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result"
}
```

Envelope tags are literally `f01-question-v1`, `draft`, `python`,
`beginner-undergraduate`; refusal union uses `rejected` and one of the five fixed
reasons. Metadata fixture: fake/null/fake-question-v1,
`2026-11-05T01:00:00.000Z`, bounded opaque ID. Expected values are never generated
from production schemas/helpers. Edit every field to a distinct literal, retain
code indentation/newlines, trim prose/title, and assert saved round-trip values.
Use script/img payloads as inert literal content in every field and list title.
Use independently seeded legacy-null, foreign, non-DRAFT, incomplete, malformed
provenance and missing records for indistinguishable 404 tests.

## Public seams and evidence limits

- H: literal HTTP via createApp with approved session/module/provider injection;
  safe error envelope, no private helper assertions. Doubles prove routing policy.
- T: SocLlmProvider injected fetch, synthetic response streams and controlled
  deadline scheduling; inspect exact outgoing two-message prompt and body.
- P: same HTTP routes, real isolated PostgreSQL only at
  `127.0.0.1:55441/debugclinic_f01_test`, synthetic accounts and narrowly scoped
  fixtures. Inspect DB only for usage/provenance/migration/atomicity integrity;
  retrieve draft content through HTTP. Coordinator alone executes this tier.
- B: Playwright desktop/mobile, semantic roles/names/state, composed app/backend;
  controlled HTTP responses for pending/failure lifecycle where necessary.
  Browser interception does not prove persistence or real provider behavior.
- C: actual configured Node24 build/typecheck/lint/format/regression/package/CI
  checks, each separately recorded. Coordinator owns integration execution.
- L: no live provider calls or sample judging authorized here. Required held-label
  calibration and fixed 11-sample evaluation remain pending, never inferred green.

Routes: POST `/api/v1/instructor/questions/generate` with `{topic}`;
POST `/api/v1/instructor/drafts` with `{topic,draft,generationId}`;
GET `/api/v1/instructor/drafts?offset=...`; GET detail by bounded ID.
Generate returns topic/draft/generation; Save returns `{draft}` with DRAFT status,
topic, all fields, createdAt and provenance association `instructor-reported`.
List projection is exactly id/title/topic/createdAt, at most 50, nextOffset/null.
UI routes are `/instructor/questions/new`, `/instructor/drafts`, detail by ID.
Constructor/export spelling not fixed by TDD will be a contract clarification,
not a reason to infer internals or weaken expectations.

## Cases frozen by behavior group

| RTT | Independent cases and expected outcome | Evidence |
| --- | --- | --- |
| B01 | All four routes: absent session 401, learner 403, owner authorized; foreign draft safe404; denied operations invoke no dependency; no learner disclosure. | H/P/B |
| B02 | Both POSTs accept exact allowed Origin+JSON; absent/null/foreign/lookalike Origin safe403; non-JSON cannot mutate. Auth mount and baseline policies preserved. | H/B/C |
| B03 | Ordinary/multiple beginner concepts round-trip unchanged; blank no provider work; all refusal representatives give actionable topic guidance, vague asks clarification; no difficulty selector. | H/B/L |
| B04 | Topic/ID/query/body/rate boundary partitions, malformed raw JSON, wrong types and unknown keys give safe400/413/429 with request ID and no writes; unexpected faults safe500. | H/P/C |
| B05 | Literal complete200 preview and adapter metadata; no Exercise/list entry until Save; fake explicitly identified, no fallback; missing module/provider capability safe503 only F01. | H/P/B/C |
| B06 | All five strict rejection reasons map400 BAD_REQUEST with topic details and fixed scope guidance; no model-authored message/partial preview/draft. | H/T/B |
| B07 | Entire strict output and normalized-result validation: missing/extra keys, tags/types/lengths, markdown/trailing JSON/tool structures fail503; raw invalid token counts normalize null; structurally valid wrong correction is not semantic proof. | H/T/B/L |
| B08 | Independently padded streamed envelope/content below/at caps parses, above cancels and fails; exactly one string-content choice; malformed envelope/JSON rejected; permitted outer metadata cannot bypass inner grammar. | T/H |
| B09 | Transient TypeError/429/5xx retry only, 100/200/400ms delays and retries+1 attempts; other4xx/refusal/malformed output no retry; single deadline includes fetch/stream/backoff/hanging body; safe503, no fallback. | T/H |
| B10 | Exact fixed soc-question-v1 system text+suffix and JSON.stringify({topic}); exactly two messages, no tools/identity/history/exercises/request ID/secrets, including adversarial delimiter/topic. | T/H/L |
| B11 | Success/rejection/failure usage owner/operation/null attempt/status/category/latency; adapter provenance; event ID returned; duplicate inbound request IDs produce distinct server UUIDs; final bounded counts/null, logs omit content/credentials; retry cost unknown. | H/P/T/L |
| B12 | Usage insert failure blocks successful preview503; refused/failed generation preserves original400/503 after exactly one failed recording attempt; log fixed category+operation ID only. | H/P |
| B13 | Generate before preview; original topic read-only afterward, Generate removed, six editable fields and Unverified instructor draft; New question clears; no regen/difficulty. | B |
| B14 | All six edits plus topic persist atomically; prose trims/code preserved; 201 private DRAFT and server provenance snapshot; unverified warning/read-only detail/success. | H/P/B |
| B15 | Save all missing/type/length/unknown/spoofed owner/status/version/language/provenance cases fail400 before writes; missing/unknown/foreign/non-generation/rejected/failed IDs fail; edits retained; association does not sign content. | H/P/B |
| B16 | Fail Exercise write, version write and transaction completion, safe503 and no public partial draft; success stores both rows Python version1, no hints/attempts, null publishedAt; real rollback required. | P/H |
| B17 | Reused successful generation ID creates distinct edited drafts; lost committed response may leave visible draft, no automatic replay/exactly-once assertion; UI suppresses pending clicks. | P/B |
| B18 | Owner-only complete version1 list; exact summary keys; default0/fixed50/descending createdAt+id ties; cardinalities0/1/49/50/51/101; no truncation; unsigned offset/wrap/nextOffset overflow cases. | H/P/B |
| B19 | Reload/reopen all fields/topic/provenance read-only; missing/foreign/non-DRAFT/legacy/malformed provenance uniformly404; dependency safe503; no edit/delete/verify/publish controls/routes. | H/P/B |
| B20 | Migration only four nullable additions, no backfill/destruction; legacy rows remain null and outside F01; old writes/behavior usable; new draft durable across new composition. | P/C |
| B21 | Announced generation progress; topic/actions/feature navigation locked, repeats suppressed; failure retains topic and prior memory, explicit Retry; correction clears error; no invented reachable regeneration. | B/H |
| B22 | Save pending locks Save/New question/feature navigation; failed Save preserves every edit and explicit retry; success read-only; no Cancel/autosave. | B/P |
| B23 | New question clears topic/preview/errors; leave/reload discards unsaved without dialog/restoration; saved remains; late unmounted response cannot repopulate new page, no automatic retry. | B/P |
| B24 | List announced loading, empty+New question, owner list/open; safe retryable list/detail faults; manual retry; Load more appends then vanishes at null; shell navigation remains possible. | B/H/P |
| B25 | Script/img payloads inert text in prose/code/edit/list/detail; tool/unknown keys rejected; injected topic cannot expand context/actions; safe errors/logs; malicious Python never executed. | T/H/B/L |
| B26 | Full desktop/mobile labels, keyboard operation/order, status/error/success announcements, visible focus, theme/contrast and long code usability; human visual/keyboard observation remains required. | B/human |
| B27 | Existing hint/context/retry, auth failures/retry/logout, learner/role redirects, createApp optional compatibility, auth mount/cookies/origin, limiter, declaration build and packaged Netlify ESM/cookies/binary regressions. | H/T/B/C |
| B28 | Separate authorized controlled live tier: blind held-label two-fixture calibration including wrong correction, then all fixed11 captured samples judged by fresh independent agent with f01-quality-v1/f01-test-agent-v1, all criteria, retained FAIL/INCONCLUSIVE, no execution/cherry-pick/semantic-proof claim. | L pending |

## Numeric partitions frozen

All dimensions vary independently with otherwise valid inputs; use JavaScript
string length (include surrogate pairs) separately from encoded UTF-8 bytes.

- Trimmed topic: 0/1/2, 299/300/301; whitespace-only rejected.
- Six strings: title120, problem2000, buggyCode4000, expected1500,
  explanation2000, correction4000. Per field 0/1/2, N-1/N/N+1, missing/null/number/
  whitespace; code bytes preserved, prose trimmed.
- IDs: 0/1/2,127/128/129, wrong type/missing; timestamps valid/invalid ISO.
- Raw POST JSON: encoded65,535/65,536/65,537 bytes, including escaped/multibyte
  overhead; accepted raw sizes may still fail field validation400, never413.
- Provider envelope65,535/65,536/65,537 and content32,767/32,768/32,769 bytes,
  independent padding with valid bounded draft fields at accepted values.
- Config timeout99/100/101 and59,999/60,000/60,001ms; retries-1/0/1/2/3/4.
  Controlled deadline D-1/D/D+1; no wall-clock races as correctness assertions.
- Offset absent/-1/0/1,4,294,967,294/295/296/297,9,007,199,254,740,991,
  fractions/NaN-like/duplicate/extra keys. Simulated51st row at offsets
  4,294,967,244/245/246 gives next4,294,967,294/295 or safe400 with exact message
  `The requested draft page exceeds the supported pagination range`.
- Actual production limiter119/120/121 per60s with isolated state/reset.
- Raw token counts null/missing/negative/fractional/nonnumeric,0/positive,
  2,147,483,646/647/648 and9,007,199,254,740,991; only integer0..2,147,483,647
  survives. Invalid larger raw counts become null without failing valid output;
  malformed normalized result still fails. Never clamp or invent zero usage.

## Exact PRD traceability and expected baseline

FR01:B01/B02/B14/B15/B18/B19/B27; FR02:B03/B04/B06/B10/B13/B21/B28;
FR03:B05/B13/B23; FR04:B05/B06/B07/B25/B28;
FR05:B13/B14/B15/B16/B17/B19/B22; FR06:B06/B07/B08/B09/B12/B21;
FR07:B17/B21/B22/B26; FR08:B01/B18/B19/B20/B24;
FR09:B13/B22/B23/B24; NFR01:B10/B11/B12/B14/B15/B25/B28;
NFR02:B02/B04/B06/B07/B08/B09/B12/B15/B16/B25/B27;
NFR03:B05/B09/B11/B12/B28; NFR04:B01/B02/B20/B21/B22/B24/B25/B26/B27.
These abbreviate all nine `F01-FR-01..09` and four `F01-NFR-01..04` IDs exactly.
All28 groups are planned above; planned coverage is not observed passing evidence.

Baseline has no F01 routes, module, generation method, contract fields or UI.
Expected reds are route404 where401/403/400/200/201/503 is required; missing
generateQuestion method/export and missing preview/list/detail controls. New
integration tests may fail compilation until approved additions exist. Preserve
and name those failures; never add skip/fallback behavior to disguise them.

Execution after freeze: locked npm ci through experiment exec, offline
generation only with explicit placeholder; focused H/T tests locally. Write P/B
tests without running shared destructive setup; coordinator executes P/B and
integration builds after combining work. Any infrastructure seam request goes
through coordinator. No existing source/config/test edits are owned here.
Local expected-red commits use explicit paths/staged review/check and retained
command evidence. Config reader allowlist gap was journaled; coordinator allowed
direct scoped config reads. A truncated RTT output was journaled and recovered.

Pending obligations: real PostgreSQL rollback/migration/durability and composed
browser execution; B26 named human desktop/mobile keyboard/visual review;
B28 separately authorized live sampling, calibration and independent evaluation;
CI/packaging evidence; instructor product review; independent functional,
standards and security reviews. None is satisfied by this frozen plan.
