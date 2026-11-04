# Independent review — frozen candidate e538db4

Base `98f0f8de62edbd3a54f0f50f011c7dd6b571ef71`; candidate
`e538db44081071f2c2c7c9d0a0169d207bc69d6d`. Three fresh generic collaboration
agents used `fork_turns=none`, authored no reviewed source/tests and made no
repairs. Their own session metadata/turn contexts were independently mapped as
`gpt-6.1-sol` / `high`. Review roles are instructions, not runtime selectors.
The coordinator records returned reports separately below; no cross-axis
reranking or quality/resource comparison is inferred.

## Standards

Reviewer `/root/f01_standards_review`, session
`01a1a82f-74fd-7ff3-b981-af885eb2a860`, actual span
`2026-11-04T20:10:44.862Z`–`20:16:53.452Z` from own session/final-answer metadata.
**PASS; zero blocking documented-standard violations.**

The implementation preserves approved boundaries: frontend API isolation;
Express session/origin policy; typed provider/usage/transactional draft module;
additive contracts; thin runtimes. No consequential SRP/DRY violation or
unjustified service/repository proliferation was observed.

Optional **P3**, `tests/e2e/f01-instructor.spec.ts:360` in the frozen candidate:
hard `page.goto` after releasing the delayed response weakens proof of the SPA
unmount/return invariant. Under CodingStandards “Test observable contracts and
business invariants” and TDD §5, leave/return with SPA controls, keep the old
response pending until the new component mounts, then release and assert empty
state. No corresponding product defect was observed. Coordinator authorized the
original independent author to strengthen this case in correction round 1.

Complete approved PRD/TDD/RTT/PackageApproval, changed source/tests/configs/guides,
verification manifest and authorized raw log tails were inspected. No tests,
services, edits or commits by reviewer. Functional judgment is assigned separately.

## Spec

Reviewer `/root/f01_functional_review`, session
`01a1a82f-0e64-7470-8d0c-9ffb47c0f058`, actual span
`2026-11-04T20:10:18.597Z`–`20:16:44.432Z`.
**CHANGES REQUIRED: two P2 transport findings.**

1. **P2 B08:** `apps/backend/src/ai/provider.ts:138` consumes the complete envelope
   before the selected-content byte check; line 141 cancels an already-consumed
   body. RTT line 84 requires “above either cap cancels reading.” A selected
   string above 32,768 bytes followed by withheld EOF waits for the deadline.
   Existing selected-content tests checked 503, not early cancellation. Enforce
   the cap during streaming and independently assert cancellation before EOF/
   deadline, safe failure and no retry.
2. **P2 B09:** the same body read lies outside the per-attempt network TypeError
   retry handler. RTT line 85 requires “retry network TypeError/429/5xx.” A
   transient body-read network error fails immediately rather than recovering.
   Include body interruptions within the shared attempt/deadline budget; malformed
   decoding/JSON/output and refusal remain non-retryable.

The coordinator confirmed both with injected streams and no remote calls:
33,311 selected UTF-8 bytes / 33,388 partial envelope bytes cancelled only after
deadline; a first-body TypeError used one attempt and did not recover with one
retry configured. Exact red command/result is retained in private
`checks/review-transport-red.log`. Original implementer owns repairs and focused
unit cases; independent acceptance author owns additional regressions. No approved
requirement, numeric policy, prompt or public interface change is authorized.

All 13 PRD IDs/28 RTT groups, approved package, frozen interpretation, changed
source/tests/scoped diff and raw result evidence were reviewed. Seven approved
hashes matched. Wording/locator corrections preserve acceptance meaning. No other
functional defect or optional rewrite was identified. No reviewer code/runtime
service calls. Standards are outside this axis.

## Security

Reviewer `/root/f01_security_review`, session
`01a1a82f-c805-7f83-88c5-b39bfad54ccb`, actual span
`2026-11-04T20:11:06.118Z`–`20:15:30.546Z`.
**PASS for e538db4; zero concrete security blockers or optional corrections.**

Complete approved package/provenance, application/contracts/migration/compositions,
tests and verification manifest inspected; all seven approval hashes and all
30 source hashes independently matched. Server role/origin/ownership/state checks,
client-authority rejection, server provenance, explicit projections, transaction,
pagination, topic-only prompt, untrusted output/text rendering, deadline/usage
normalization and fixed safe errors/logging were observed. Existing auth/hint/
ESM/cookie/binary boundaries were preserved. This is source/evidence review,
not an independently rerun service test or a residual-risk waiver.

The functional transport corrections change provider code after this verdict;
targeted security review of their exact delta is required before reviewed readiness.

## Scope and pending acceptance

All reviewers distinguished recorded 352 unit/API, 162 integration and 100 browser
passes/two opt-in skips from independent reproduction. Local extracted ESM smoke
passed; native hosted build's local-metadata rejection was expected. B28 live
calibration/all eleven samples, semantic adherence, human B26/instructor review,
hosted CI/native platform remain pending. Source tags/mocks prove no semantics.

Root config/Netlify/diff/log reader gaps and one transient receipt-lock collision
were journaled. Direct reads stayed scoped to this arm. The common verification
helper printed other-arm HEAD/hash-count metadata only; no other-arm implementation,
results or conversation was opened. Generic code-review issue-tracker setup is
absent; run `/setup-matt-pocock-skills` for future issue-tracker-based workflows.
This review used the owner's already supplied approved SDD and pinned local base.

Initial summary: Standards 1 optional P3 (SPA evidence); Spec 2 P2 (stream bound
and body retry); Security 0 findings. Targeted correction/re-review round 1 is
in progress; at most two correction rounds, without reviewer-written repairs.

## Targeted correction/re-review round 1 — final

Corrected source: `4e610dd504b42cbb4ea648ee0ebc24282605a8ae`, combining
implementer `190bb8a06aca66d237ebfe52138535b9651c57b7` and independent author
`edc548d` / `1fa7999`. Approved bytes, dependencies, prompts, public contracts,
numeric policies and product scope stayed unchanged.

### Standards

**PASS, zero open findings.** Optional P3 resolved: the old response remains
pending through SPA navigation/fresh mounting; the same-document marker and
empty/no-replay assertions now prove the intended invariant. The private
`question-response.ts` helper has a coherent transport-limit responsibility and
small typed `consume` interface. Final JSON/schema validation remains authoritative.
Regressions cover exact caps, unfinished streams, decoy metadata, escaped keys/
surrogates, split UTF-8, interrupted-body recovery, malformed data and deadlines.
The fixture's 15-second import allowance preserves target-admission assertions
and application deadlines. Reviewer finished about 20:35:28 UTC.

### Spec

**PASS, both P2s resolved; no new blocker.** Selected decoded UTF-8 content is
bounded during streaming and cancelled before EOF/deadline. Classified network
body interruptions retry within the original shared signal/attempt budget;
decoding/JSON/output/limit errors stay non-retryable. Independent regression:
three old-candidate failures/two cap controls became five passes. The offline
probe now records early cancellation and recovery on attempt two, zero remote
calls. Reviewer finished about 20:35:21 UTC.

### Security

**PASS, no blocker or optional security correction.** Exact tracker/decoder and
interruption-classification paths inspected. No prompt/context, credential,
provenance, logging, authorization or execution/tool capability expansion.
Review remains source/evidence inspection, without edits or service calls, and
grants no residual-risk acceptance.

All reviewers observed 365 unit/API passes, five repaired transport cases,
two desktop/mobile SPA passes and static checks. Complete postrepair service/
package reruns were left to the coordinator and subsequently passed: declaration
build, 162 PostgreSQL cases, extracted ESM package smoke and 100 browser cases/
two opt-in skips. No second correction round was needed. Final summary:
Standards 0 open; Spec 0 open; Security 0 findings. B28, human B26/instructor
review and hosted CI/native-platform obligations remain pending.
