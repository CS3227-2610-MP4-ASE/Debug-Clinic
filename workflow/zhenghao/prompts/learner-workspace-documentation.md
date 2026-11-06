# ZH-LWS-01 documentation prompt

Requested model gpt-6-luna / medium; one documentation conversation, no new chats
or subagents. Human authorized completion after approved learner scope/PR9
compatibility; independent round1 is now green, evidence commit 1d8cd27.

Work in the existing DebugClinic local project on zh/learner-workspace. You are
not alone. Coordinator owns delivery.md, telemetry and final integration.
Preserve user .gitignore changes and untracked docs/Reflections-ZhengHao.md.
Never edit that plural-named file or docs/Reflections.md. Exclude Developer2 SDD
docs/features/**, docs/mission-brief/** and sibling SDD trees from all reads and
diffs. No product code, test, dependency, migration or deployment edits.

Own only docs/DeveloperGuide.md, docs/UserGuide.md,
docs/Reflection-ZhengHao.md (singular Reflection), workflow/agents/FEATURE_MAP.md
and workflow/evaluations/zhenghao/ZH-LWS-01/documentation.md handoff.
Read current contents, applicable AGENTS.md/skills, and the actual source as
needed. Use skills when relevant, not a new skill/conversation per guide.

Sources: requirements workflow/zhenghao/specs/002-learner-workspace.md;
PR9 compatibility workflow/zhenghao/verification/005-pr9-compatibility.md;
builder implementation.md and independent testing.md in the same evaluation
directory; current product source. Last source repair a13af3e, builder evidence
a16324d, independently green at a16324d with report1d8cd27. Do not repeat initial
red findings as current unresolved problems; preserve their historical lessons.

DG: describe actual learner routes/APIs, existing PR9 DTO reuse, optional q search
before 50-item pagination, own-attempt revision protocol, required code/explanation,
parent-row lock and canonical publication validation, immutable final retry,
separate additive migration with duplicate preflight (no automatic deletion),
same-origin/JSON/role boundaries, all runtime composition points including Netlify,
session/disposed-response protection, tests and exact mock/real boundaries.
Preserve existing instructor/auth/deployment documentation and limitations.

UG: concise real steps to find/search a published question, edit Python3 and
explanation, Save draft/reload, confirm final submission/read-only state, back
navigation/discard, desktop output resize and mobile stacking. Run and Get Hint
remain disabled/no execution or coaching delivered. Do not claim an instructor
submission-review UI or live deployment exists; final attempts are persisted.
Avoid backend/internal implementation detail in learner-facing steps.

Feature map: learner browsing/workspace/attempt APIs, source boundaries and exact
test routes; keep instructor/auth entries and actual runtime prerequisites.
Node24 requirement remains; standalone24.22.2 was used for this verification.

Reflections: first read docs/reflection-requirement.md as requirements source.
Create docs/Reflection-ZhengHao.md beside it, preserving existing locations.
Write a short incremental checkpoint answering only relevant questions supported
by this feature's evidence. Do not answer all questions, add generic placeholders,
invent conversations, claim cost savings, or copy the requirements as answers.
Useful evidence: four-stage context/ownership handoffs; independent adversarial
tests found three response races and weaker publication eligibility despite
earlier green suites; one repair round resolved them; exact model routing and
measured usage/coverage. Use tests/revision/report links, not raw transcripts.

For token observations read generated monitoring/reflection.json or use jq to
select only necessary fields from monitoring/report.json (avoid loading the
entire long report). Record the checkpoint generated_at. Input already includes
cached input; output includes reasoning. Show reasoning/output and reasoning/total
denominators explicitly for a named stage. Stage planning includes ALL coordinator
approval, environment/integration/wait-orchestration overhead, not pure initial
design. Its high cumulative usage is a real overhead limitation. Luna selection
does not prove fewer tokens or a measured cost reduction. There is no controlled
before/after baseline or verified persisted-reasoning setting. High cache ratio
does not mean fewer raw input tokens. Preserve diagnostics/unsupported schemas
and missing stage measurements as unavailable. Documentation usage may still be
partial at your checkpoint; no fabricated final values. Coordinator will refresh
the final report after you finish. Do not rewrite token-monitor scripts, schemas,
Royden output paths, or frozen evidence to make results look better.

Verified scope: 516 deterministic tests; 5 renderer cases; 198 PostgreSQL cases;
144 normal browser passes with20opt-in skips;16focused browser cases (subset of
normal),8separate composed real-cookie PG/captured-SMTP/fake-AI cases; build,
declarations,16public builtfrontend loads and2extracted Netlify smoke flows pass.
Do not add overlapping subset counts into a fakegrandtotal. No remoteCI/deploy,
liveGoogle/SMTP/SoC/realPython runner or manualscreenreader/contrast proof.

Use apply_patch for docs. Run scoped Prettier/link checks on owned files; no
need to rerun app suites for prose-only changes. Initial soft budget250k tokens/
30min; report overrun and keep reads concise rather than filling every question.
Coordinator maps actual session usage. Review diff for accidental unrelated/
private content, commit only owned docs explicitly with stagedname/whitespace
checks, no push/PR/merge/deploy. Write documentation.md handoff with changedfiles,
verifiedsources, applicable reflection questions, checks and limitations, then
finish. Completion returns to original coordinator, no separate completion chat.
