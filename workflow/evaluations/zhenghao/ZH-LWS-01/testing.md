# ZH-LWS-01 independent acceptance and review

## Frozen acceptance interpretation — before implementation inspection

Frozen 6 November 2026 (Asia/Singapore), on branch `zh/learner-workspace`,
HEAD `4eb344781aa87ace57daba100b7764194958b8e0`; comparison base
`2fa9dfe4650f481e867e75bdacdce71c498db031`. This single independently dispatched
testing chat uses requested gpt-6.1-sol/high. No subagents. Inputs read before
implementation diff: testing assignment, approved Zhenghao requirements
`workflow/zhenghao/specs/002-learner-workspace.md`, PR9 compatibility review,
AGENTS, project skills/runbook, feature map and CodingStandards. Human green pass
and narrowed test/evidence ownership are recorded in the assignment. Developer2
SDD paths are excluded from every search/diff. Coordinator owns telemetry.

Acceptance derives from requirements, not implementation tests:

- LWS-01: labelled title/topic search is case insensitive and applied before
  50-item deterministic pagination. List/detail/back retains search. Loading,
  retry, empty/no-results and keyboard links work; no fabricated metadata.
- LWS-02/03: learner-only viewport workspace shows problem/expected behavior,
  Python editor/reasoning and escaped whitespace-preserving output. At desktop,
  pointer and keyboard resizing preserve edits with accessible bounds/focus.
  At 320px all regions/actions stack without horizontal page overflow.
- LWS-04: only LEARNER can read/mutate learner endpoints. Published canonical
  PR9 version is authoritative, even without hints. No solutions, private
  reasoning/provenance, hint content or other accounts' attempts leak. Unknown,
  draft and archived questions fail safely.
- LWS-05: code/reasoning must be nonblank and bounded at 20,000/5,000 UTF-16
  units (search 200). Code indentation is preserved. Own drafts reload; code
  edited during load/save and failures survives. Save uses exact revisions;
  final confirmation atomically saves current content, freezes it, and has no
  Run prerequisite. Same final retry is safe; changed retry conflicts. Duplicate
  creation, save/save, save/finalize and remove/mutation races retain invariants.
  Existing duplicate attempts cause migration refusal without automatic deletion.
- LWS-06: production Run is disabled/explained with no execution, AI request or
  fabricated result. Injected result fixtures are test-only.
- Compatibility/security: preserve PR9 publish/remove/key idempotency, retained
  identities/references, F01/F02 privacy and session refresh. Pending reads and
  cross-account responses cannot overwrite/expose edits; in-app navigation and
  sign-out prompt for unsaved work. Origin/body/role/ownership validation and
  safe error/log boundaries apply server-side; adapter composition injects the
  real attempt service. No deployment/external-service actions.

Required evidence: static checks, all deterministic tests, full real disposable
PostgreSQL integration, normal Playwright plus opt-in real-cookie/captured-email
journeys using fake AI, production/declaration build, built frontend and extracted
Netlify package smoke. Add missing independent tests including composed publish
→ learner save/finalize → remove → denial with retained references. Separate
functional, standards and security verdicts. Unrun or mocked behavior is labelled.

Database for every connected command (all four URL variables identical):
`postgresql://debugclinic:debugclinic@127.0.0.1:51817/debugclinic_lws_test`.
Owned container: `debugclinic-zh-lws-01a1af89`; coordinator owns cleanup.
Node path: `/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin`.
No `.env` targets. Preserve all pre-existing dirty files; commits contain only
this report and independent tests. Source findings return to existing builder.

## Execution and verdicts

Pending. Frozen interpretation above will remain visible if later clarified.
