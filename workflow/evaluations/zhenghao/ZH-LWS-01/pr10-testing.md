# PR10 independent repair acceptance and testing

## Frozen interpretation before source diff

6 November 2026 (Asia/Singapore). Branch `zh/learner-workspace`; original base
`89f852cb7cc4c3cc64dc40639c1c4a529e87c8b0`; repair review head
`b5837fe7e3aeb6fdf7415730ba15ae6222719577`. Inputs: coordinator's PR10 assignment,
`pr10-coordination.md`, `pr10-repair.md`, existing project workflow/skills and
CodingStandards. No repair source diff has been collected yet. Requested model
remains gpt-6.1-sol/high, single reused independent testing chat, no subagents.
Only independently added tests and this evidence file may be committed here;
coordinator alone owns pushing. Developer2 SDD is excluded before searches/diffs.

Acceptance cases derive from user outcomes, not the implementation:

1. **Uncertain save:** lose a committed PUT reply for both absent and existing
   drafts. Before any further write, GET the authoritative attempt/revision.
   Keep local code/reasoning and dirty/navigation protection. Never automatically
   retry a mutation. The next deliberate Save uses the recovered revision.
2. **Conflict:** HTTP409 triggers the same read-only recovery. A newer draft may
   change code and reasoning; local unsent text remains intact and guarded.
   A null authoritative attempt is legitimate and restores null expectedRevision.
3. **Recovery failure:** a failed GET leaves mutation controls gated and offers
   explicit read retry. No Save/Submit is sent until a successful retry. Preserve
   edits on every failure and keep status/error feedback actionable.
4. **Final outcomes:** lost final reply reconciles the saved immutable final;
   an already-final different snapshot cannot be overwritten. Preserve unsent
   text distinctly and never label that text as the authoritative submission.
5. **Disposal:** delayed recovery results after expiry/account change/navigation
   cannot overwrite current-identity content or clear its unsaved guard.
6. **Long reasoning:** valid multiline reasoning under 5,000 UTF-16 units must
   leave Save and Submit reachable through scroll/clipping ancestors at minimum
   editor height 320, short desktop and 320px mobile. Locator visibility alone
   is insufficient; real pointer activation must reach the actions.
7. **CI collection:** with all four database URL variables and
   E2E_AUTH_COMPLETION unset, full normal desktop/mobile collection and suite
   must work. Opt-in suites must skip without constructing/cleaning a database
   client. Opt-in missing, mismatched and unsafe targets fail closed; an explicit
   matching coordinator-owned loopback `_test` target supports real composed
   cookies/PG/fake-AI journeys. Existing auth/privacy assertions remain intact.

Required checks: independent recovery/layout browser regressions, original
learner/session/instructor cases, full normal browser suite without DB variables,
opt-in composed checks, unit/static/scoped-format/production checks. Demonstrate
new behavioral tests fail against original source using an isolated temporary
source setup if feasible, restoring repaired source exactly. CI failure already
has independently reproduced original evidence. Database/schema/business logic
and adapters are unchanged, so broader DB/adapter reruns need an actual finding.

Runtime: standalone Node24.22.2 at
`/Users/zhenghaofang/.npm/_npx/387698761821791d/node_modules/node/bin`.
Connected commands use all four URL variables identically:
`postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test`.
Coordinator owns container `51be9c17d03c84ff8a99c5a52b2f6f3c707b7f51809b42d986cd5130f9ef48dc`
and cleanup. No external providers/deployments/remote comments or pushes here.

## Execution and verdicts

Pending independent review. Frozen outcomes above remain unchanged on repair.
