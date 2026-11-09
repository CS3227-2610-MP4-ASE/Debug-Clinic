# Learner dashboard, navigation, quota, and focus hotfixes — 9 November 2026

## Request and workflow

The owner directly authorized an expedited six-item hotfix and waived the earlier full feature-stage workflow. The scope was: a rolling assistant quota, real learner dashboard counts/resume links, corrected learner routes, search focus styling, loading/error/retry states, and static authenticated branding. It did not authorize the constrained-coaching redesign, live AI calls, deployment, or production changes.

The coordinator used verified GPT-6.1 Sol/high. One new implementation conversation, `01a1beda-5226-7ba1-a257-c50b980b8035` (“Learner dashboard and UI hotfixes”), used verified GPT-6 Luna/high. Independent expectations were frozen before diff review. This smaller topology reflected the owner’s view that a bounded hotfix does not need the full multi-stage arrangement used for the workspace and assistant.

## Work and findings

- `MESSAGE` and `NEXT_HINT` share a 100-request rolling ten-minute limit across a learner's exercises. The daily cap was removed; reads do not consume quota.
- The learner dashboard derives identity from the authenticated session, counts distinct exercises, gives final submissions precedence, and links only eligible current public drafts.
- `/learner/question` is the canonical list route. The legacy plural list redirects with query/hash retained, while detail/API routes remain plural.
- Search keeps local visible keyboard focus without the duplicate outer field outline. Learner list/detail/dashboard states expose loading, empty, failure, and retry behavior.
- Signed-in branding is static content; anonymous branding remains a Home link.

Independent review found that dashboard deduplication occurred before eligibility filtering and could hide a valid current draft. The implementer moved deduplication after eligibility and added a regression test. This was an ordinary defect finding, not an agent disagreement.

## Verification and repair history

Writer evidence included 540 backend/contract tests, 11 frontend tests, 206 disposable-PostgreSQL integration tests, eight focused browser cases, typecheck, and production/declaration builds. The first unprivileged local-network run failed with `EPERM`; the equivalent check passed with scoped permission. Packaging probes initially failed because a private TypeScript probe was interpreted as CommonJS and because compiled contract exports were stale; those harness issues did not establish product bugs.

The first full independent browser run finished with 209 passes, 20 expected skips, and five failures. Targeted repairs addressed two stale dashboard headings, two request-wave races, and one hidden mobile Home locator. A later three-spec run passed 51/52; the remaining modal/menu timing case was repaired and the final two-case desktop/mobile rerun passed 2/2. The whole suite was not rerun locally, so the result is not reported as one clean 214-pass command.

CI then exposed a screenshot portability defect: six hotfix cases tried to write to macOS-only `/private/tmp`. Commit `fd541b64` switched them to Playwright-owned output paths. Commit `ff3754ad` removed duplicate IDE focus outlines. The final PR #12 remote `verify` and `browser` jobs both passed.

## Measurements and outcome

The fixed checkpoint generated 9 November 2026 06:36:26 UTC contains 352 observed responses and 55,524,880 total Codex tokens: implementation 28,843,177 and verification/coordination 26,681,703. Both token estimates and the implementation elapsed estimate were exceeded. The aggregate cache-hit ratio was 99.09%, but no comparable baseline or pricing evidence establishes time, token, or cost savings from using Luna. The implementation thread used Luna/high as requested; this is a verified setting, not evidence that the model choice caused the outcome.

PR [#12](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/12) merged into `master` as `5d4155b2` on 9 November 2026 at 15:51 SGT. Current master source remains authoritative.

## Primary references

- [Frozen acceptance](../../workflow/evaluations/zhenghao/ZH-LHF-01/acceptance.md)
- [Implementation handoff](../../workflow/evaluations/zhenghao/ZH-LHF-01/implementation.md)
- [Independent verification](../../workflow/evaluations/zhenghao/ZH-LHF-01/verification.md)
- [Telemetry](../../workflow/evaluations/zhenghao/ZH-LHF-01/monitoring/report.json)
