# MP4-D2-F01 requirements decision ledger

Date: 2026-11-05, Asia/Singapore. Status: interview complete; shared understanding confirmed; not an approved PRD.

Scope approval: SCOPE-APPROVAL-01 in `ApprovalRecord.md` binds Mission Brief v1. Use `$grill-me` through `grilling`. Recommendations remain proposals until answered. No application implementation authorized.

## Confirmed constraints

- Actor is authenticated INSTRUCTOR; no new ADMIN role.
- Python programming language only; one topic generates one draft for instructor review.
- No automatic publication or generated-code execution.
- Human verification precedes learner access. Published exercises need exactly three approved ordered hints; that does not determine F01 draft composition.
- Baseline is `Debug-Clinic-auth-completion`, `royden/auth-completion`, SHA `b8612d9dd655ae200607c4ff887703132eb0f61f`.

## Round 1 — accepted

Provenance: owner replied “accept all recommendations” directly to Q1–Q4 in this chat on 2026-11-05. These product decisions are confirmed, not PRD/package approval or implementation authorization.

| Decision | Accepted requirement | Dependent decisions | State |
| --- | --- | --- | --- |
| Q1 Draft composition | Title, problem statement, buggy Python code, expected behavior, instructor-only bug explanation and corrected solution; hints handled later | Field acceptance, quality rubric, instructor-only data separation, output validation | Accepted |
| Q2 Successful draft lifecycle | Preview first; explicit Save creates an instructor-owned private DRAFT; no save/publish before confirmation | Editing/regeneration, navigation/reload, retrieval, duplicate/failure/concurrency semantics | Accepted |
| Q3 Topic entry policy | Free-text Python topic; reject blank/non-Python requests; avoid fixed topic catalogue | Input bounds, ambiguous/unsuitable topics, invalid-output recovery | Accepted |
| Q4 Learner level | Fixed beginner undergraduate Python level; no difficulty control in F01 | Allowed concepts/libraries, problem complexity, quality acceptance | Accepted |

## Round 2 — accepted

Provenance: owner replied “Accept all recommendations. NOTE: Keep the feature to a minimal. no need for over engineering and contingencies” directly to Q5–Q10 in this chat on 2026-11-05. Q5–Q10 are accepted. The additional instruction makes minimal delivery an explicit constraint: keep the agreed preview/edit/save/own-list/read-only-open flow; do not add speculative infrastructure or contingency workflows. Ordinary validation, authorization, safe failure feedback and mandated planning/review evidence remain necessary to the accepted behavior.

| Decision | Accepted requirement | Dependencies now settled | State |
| --- | --- | --- | --- |
| Q5 Preview actions | All six generated fields editable before Save; editing is local; saving does not verify/publish | Q1, Q2 | Accepted |
| Q6 Saved-draft recovery/access | Minimal own-drafts list and read-only reopen of saved drafts; other instructors and learners have no access; no saved-draft edit/delete in F01 | Q2 | Accepted |
| Q7 Topic boundaries | Accept relevant free-text Python topics, including multiple related beginner concepts; ask for a clearer topic when vague; reject other languages, advanced/out-of-level and unrelated requests without silently substituting a topic | Q3, Q4 | Accepted |
| Q8 Exercise quality | Small self-contained deterministic exercise with one intentional conceptual bug, ordinary Python/built-ins, no third-party packages or file/network/process operations; explanation and correction agree with expected behavior | Q1, Q4 | Accepted |
| Q9 Generation failure | Malformed, incomplete, non-Python or unsuitable output is a failed generation; safe actionable message and explicit Retry; preserve topic and any earlier preview; no partial save or silent fake fallback | Q1–Q4 | Accepted |
| Q10 Provider context and retention | Send only topic plus fixed generation instructions/level; no identity, history or other exercises; Save retains topic, six fields and minimal generation provenance; logs exclude raw topic/code/model content | Q1–Q4 | Accepted |

## Round 3 — accepted; shared understanding confirmed

Provenance: owner replied “accept both. Shared understanding confirmed” directly to Q11–Q12 and the shared-understanding request in this chat on 2026-11-05. All twelve decisions are settled. This completes requirements grilling and authorizes PRD drafting, not PRD approval or implementation.

| Decision | Accepted requirement | Dependencies now settled | State |
| --- | --- | --- | --- |
| Q11 Start over / unsaved work | No separate regeneration feature. New question clears the topic and unsaved preview and starts again; leaving/reloading loses unsaved work; no autosave, restoration or extra discard dialog | Q2, Q5, Q6, minimality instruction | Accepted |
| Q12 Basic request/save behavior | Show loading and prevent repeated clicks during generation or Save; no Cancel flow. Failed generation follows Q9; failed Save keeps editable preview for manual retry. Successful Save opens the saved draft read-only | Q2, Q5, Q6, Q9, minimality instruction | Accepted |

Keep implementation internals for TDD: choose the smallest compatible changes to existing API/provider/persistence boundaries, existing bounded request controls and minimal usage records. No speculative queue, cache, quota subsystem, distributed concurrency/recovery workflow or semantic Python execution checker. Numeric bounds must be documented and justified in the reviewed package without treating existing settings as verified provider capacity. Ordinary validation and safe UI feedback are sufficient unless repository evidence establishes a concrete additional need.

Later hint authoring, saved-draft editing/deletion, instructor verification and publication remain separate feature obligations; coordinator/owner holds assignment of those workstreams. F01 preserves DRAFT/private state and exposes no verification/publication action. Live-provider evidence stays separate from doubles and is not implied by configuration. No fabricated SLA, semantic-correctness proof or current provider-capacity claim.

Decision frontier: empty for this deliberately minimal feature. Owner explicitly confirmed shared understanding. Technical choices, justified numeric bounds and planned acceptance evidence belong to the reviewed design package; they do not justify silently changing accepted behavior. Any material product change returns to the owner. Next gate: complete PRD draft for explicit approval.
