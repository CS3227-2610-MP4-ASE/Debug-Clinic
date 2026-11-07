# ZH-CHAT-01 feature ledger and handoff

Branch: `zh/learner-chatbot-assistant`.
Parent: local master `2c372c5a9af9fafddf950e446121e475687ab29a`.
Current gate: implementation completed; independent AI-security review active.
Approved planning snapshot: `87520f63844010567c844388bb725b8a8deee10a`.
Implementation head: `56dc4146257bcbb27b36798f1cb3e161dce09d4e`.

## Approved snapshot

| Artifact                                                           | SHA-256                                                          |
| ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| workflow/zhenghao/specs/003-learner-chatbot-assistant-discovery.md | 76c83c0c58e88ca95dbac2060f3de6015933fcfbebf1f168e5f2e59f23a7a3e9 |
| workflow/zhenghao/specs/004-learner-chatbot-assistant-plan.md      | 7df79b587808f25d23af56f2d46cd198d53672c9210e6c843244a2e542b4530c |

The planning snapshot commit is the concern-separated commit containing this
initial ledger, both artifacts, the implementation packet and planning evidence;
its SHA is supplied in the stage dispatch and recorded at the next checkpoint.
A dated exact-byte private backup is verified outside Git before dispatch.
After dispatch, Node 24 Prettier aligned the plan's Markdown tables only. The
original approved content remains immutable in `87520f6` and its backup/hash above.
The formatting-only working-copy hash is
`0db9f242316a35ed0bd43befd3c3dde1dfc8f6c3486e510f80b72ca7623f64b5`.
No requirement, interface, bound or authority changed; this is a routine correction
covered by the verified delegation. Later stage packets may read the formatted
copy while verifying the original approval against the immutable snapshot.
After implementation completed, the coordinator copied and validated private
monitor state and the approved-byte backup in a durable MP4 sibling directory
outside Git. The original temporary copy remains a private historical snapshot;
future stage dispatches supply the active durable path explicitly. Private paths/
session manifests are not published in this ledger.

## Approval and review provenance

- Nine product choices: three structured human-answer rounds in the coordinator.
- Independent review: generic fresh-context subagent, GPT-6.1 Sol/high; initially
  changes required, then pass after one repair/re-review. No app tests run.
- Detailed review: `workflow/evaluations/zhenghao/ZH-CHAT-01/planning-review.md`.
- Delegation verified by reading the human source message in chat
  `01a1b442-630f-7012-b4b8-eef108dad47f`, turn
  `01a1b444-56cb-71f2-a9fd-2b9a5f5c2256`. Delegated scope/package approval and
  separate implementation authority become effective after independent blockers
  are resolved; that condition is satisfied.

## Stage assignments

| Task           | Model/effort               | Dispatch/status                                                                                              |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| planning       | verified GPT-6.1 Sol/high  | Original coordinator; reviewed plan complete                                                                 |
| implementation | verified gpt-6-luna/medium | Completed local chat `01a1b448-99c6-7861-bd1d-3ea7613baff1`; backend ebae9a0, panel d8b9167, handoff 56dc414 |
| ai-security    | verified gpt-6.1-sol/high  | Active local chat `01a1b47c-237f-7b01-8bd1-7ee5b1fbf508`, reviewing integrated 9e9ebf0                       |
| testing        | GPT-6.1 Sol/high           | Not dispatched; follows security corrections                                                                 |
| documentation  | GPT-6.1 Sol/high           | Not dispatched; guides and incremental docs/Reflection-ZhengHao.md                                           |

Internal planning review is counted under planning, not as a sixth user-facing
stage. Reuse conversations for repairs. Serialize stage writes; no simultaneous
source editing. Each receiving repair task records a linked finding before retry.

## Evidence and limitations

Sanitized measurements: `workflow/evaluations/zhenghao/ZH-CHAT-01/monitoring/`.
Initial planning estimate and measured overrun are preserved in the discovery
record. These totals include cached/repeated context and are not account billing.
Observe actual requested models/effort and coverage at dispatch.
The canonical one-task-per-agent mapping attributes later coordinator followups
to `planning` as well. Do not describe that entire bucket as requirements/design
work. For reflection, derive a supplementary split from the coordinator's recorded
planning-completion timestamp and unique timestamped response records: earlier
responses are planning, later responses are coordination overhead. Preserve the
canonical report and label missing timestamps/coverage; do not remap collected
agents or sum cumulative session totals. Repeated compact wait calls also count
as coordinator context use and must not be hidden when comparing stage costs.

At the planning snapshot, SoCLaaS settings were present without values being
printed; DocHub returned login/access denied, and no product code or application
checks had run. Live model calls, independent security acceptance, CI and
deployment verification still remain pending at this implementation handoff.

Implementation handoff now records passing Node 24 typecheck/Prisma/owned-file
lint/format, 535 deterministic/API tests, 199 disposable PG tests, 8 affected
desktop/mobile cases, production build and detector. These are writer-local
results, not independent security/testing or final integrated acceptance. Packaged
Netlify/cleanup smoke, broader browser regression and model-semantic live evidence
remain pending. See implementation-handoff.md for exact boundaries and warnings.
The public API/OpenAPI checkpoint in
`workflow/zhenghao/decisions/004-soclaas-chatbot-contract.md` now confirms the basic
chat envelope; it does not establish configured-model compatibility.

Completion requires independent security, functional and standards verdicts,
integrated checks, verified DG/UG, supported incremental reflection and model/
usage accounting. Final concern-separated commits and feature-branch push for PR
creation were authorized by the initiating owner request. No merge/deployment or
live-call authority is inferred from that request.

## Bounded synthetic live-provider authorization

On 7 November 2026 the owner explicitly answered the coordinator's live-test
question with "Authorize a bounded synthetic live check (Recommended)".
This separately authorizes later AI-security/testing evaluation using configured
SoCLaaS credentials/model and synthetic exercises only. No real learner data,
credential values or raw provider bodies enter ordinary logs/Git reports.

Coordinator operational cap: 12 logical generation requests total across security
and testing, at most one transient retry each (24 transport attempts maximum),
10-minute evaluation window, synthetic application context at most 8,000 UTF-16
code units per request, replies at the approved 2,000-unit limit or stricter
configured bounds. Share the budget between stages rather than restarting it.
Record actual calls/usage/latency and stop on authentication/configuration errors;
do not spend the remaining budget retrying them. No endpoint/model changes or
additional provider capabilities are authorized by this check.

The quickstart remains login-protected. Use the established transport envelope
and preserve that documentation gap; evaluate actual responses separately.

After the first six synthetic calls exposed solution-disclosure failures, the
owner explicitly authorized "the remaining six calls after repairs" on
7 November 2026. They may run in a fresh ten-minute evaluation window after
repairs. The shared total remains twelve logical calls; this extends the window,
not the call allowance. Preserve the first-round failures and the shared private
call ledger. No further calls are authorized after that allowance is exhausted.

## Security correction round 1

The independent reviewer returned **changes required** against `9e9ebf0`.
SEC-01 reproduces expired successful-request replay; SEC-02 observes complete
corrections in real model replies; SEC-03 reproduces missing oldest-history
eviction when the current context fits. See `security.md` for preserved outcomes.
The first six logical calls used six transport attempts and 2,957 provider tokens.
Those application tokens are separate from development telemetry.

The existing implementation conversation was resumed on verified Luna/medium
with all three linked findings, run `security-fix-1`, unchanged ownership and
requirements. It has no live-call authority. The existing security conversation
will independently recheck the repair and own the remaining bounded live calls.
No testing-stage acceptance or live-ready approval has been granted.
