# Learner assistant discovery, implementation, security evaluation, and CI — 7 November 2026

## Discovery and plan

The original request asked for a private, progressive learner assistant in the existing workspace. Discovery and three structured owner-answer rounds resolved context sharing, hint progression, history/clear behavior, quotas, floating-panel interaction, retention, provider limits, and verification. The plan required server authorization, learner/version isolation, per-message consent for code and optional reasoning/output context, exclusion of scratch tests/stdin, persisted snapshots, idempotency, quotas, inert rendering, and fake-provider plus bounded live-provider evidence.

The owner delegated plan approval through the project chat `01a1b442-630f-7012-b4b8-eef108dad47f` after an independent planning review. That review was a fresh generic subagent using GPT-6.1 Sol/high; it first returned changes required and later passed after repair. The approved planning snapshot was `87520f63`.

Actual stage identities were recorded rather than inferred from role files:

- coordinator and planning: GPT-6.1 Sol/high;
- planning reviewer `01a1b443-00c4-7373-b68b-d9b70cf0c91a`: GPT-6.1 Sol/high;
- implementation `01a1b448-99c6-7861-bd1d-3ea7613baff1`: GPT-6 Luna/medium;
- AI-security reviewer `01a1b47c-237f-7b01-8bd1-7ee5b1fbf508`: GPT-6.1 Sol/high.

The workflow serialized source ownership. The reviewer did not edit product code; linked findings returned to the existing implementer, and the same reviewer performed rechecks. The testing and release-documentation stages were not dispatched after the security block.

## Implementation and security evaluation

The implementation added the learner/version-scoped assistant service, panel, strict contracts, server-owned progression, selected-context snapshots, persisted private history, retention/cleanup, idempotency, learner-wide quotas, and provider orchestration. Writer-local evidence included 535 deterministic/API tests, 199 PostgreSQL tests, eight affected desktop/mobile cases, static/build checks, and the structural Impeccable detector. Those checks did not establish semantic coaching safety.

The owner separately authorized a bounded synthetic SoCLaaS evaluation: initially six calls, then the remaining six after repairs, using synthetic exercises only. The first six calls found solution-disclosure failures. Security round one reproduced expired-success replay, complete corrections in real replies, and incomplete history eviction. The first correction fixed replay and eviction, but four of seven actual-service policy objectives still failed. A workspace spend-cap interruption stopped the first re-review before tools or live calls; it was resumed without changing models and was not counted as a source correction.

The second correction made all seven known service-policy objectives pass, but the final six-call live check produced an encoded complete corrected function and did not complete either benign task. The final verdict remained **blocked—changes required** at `b4878ed`. The shared live total was 12 logical calls/12 attempts and 5,070 provider tokens. Those application-provider tokens are separate from Codex development telemetry. The two permitted repair rounds and live allowance were exhausted; no third repair or further live call was authorized.

## Planning-only redesign

The owner chose a constrained-coaching redesign as **planning only**. Proposal 005 and amendment 006 replaced free-form code-generating advice with a reviewed catalogue of constrained coaching moves, stricter response texts, version metadata, legacy-history quarantine, and deletion rules. Independent planning review passed after one correction, and the owner approved the package while explicitly withholding implementation authority. A conditional future six-call evaluation allowance did not start because implementation was not authorized.

This distinction matters: the original free-text assistant implementation and its failed live-security evidence were merged; the constrained redesign remained an approved proposal with no implementation. The current product guides must describe the merged assistant honestly and retain the security limitation rather than present the planning-only redesign as delivered.

## CI failures and repair

PR #11 first failed formatting because a handwritten handoff table and generated monitoring files were treated alike. Commit `0a1b4c14` formatted the handoff and added exact-file formatter exclusions for generated checkpoints without changing their bytes.

The next run passed `verify` but failed the browser job with 78 failures, 130 passes, and 20 skips. Existing intercepted workspace fixtures did not mock the assistant's new initial GET; it reached the real unauthenticated backend, emitted a 401/session-expiry path, and made the synthetic learner editor read-only. The acceptance interpretation was frozen before the repair diff. Commit `99eef065` added a strict schema-valid empty assistant-state double only for the exact GET endpoint. Independent local verification then passed the full browser suite with 208 passes and 20 skips, and the final remote `verify` and `browser` jobs passed. The fixture repair did not overturn the assistant's failed live-security verdict.

## Resource observations and outcome

The sanitized checkpoint generated 7 November 2026 09:30:59 UTC recorded 148,861,591 total observed Codex tokens across 814 responses: planning 85,150,953; implementation 52,828,769; AI security 10,881,869; testing/documentation unavailable. The planning bucket includes later coordinator follow-up and wait/poll activity, not only design. AI-security explicitly recorded 15,918.332 dependency-wait seconds; waiting is not useful computation and report silence is not evidence of token use. The 98.89% overall cache-hit ratio did not establish lower totals or cost.

PR [#11](https://github.com/CS3227-2610-MP4-ASE/Debug-Clinic/pull/11) merged into `master` as `44b931c5` on 8 November 2026 SGT. Merge status does not mean the failed semantic security objective was resolved.

## Primary references

- [Feature ledger](../../workflow/zhenghao/handoffs/ZH-CHAT-01.md)
- [Discovery](../../workflow/zhenghao/specs/003-learner-chatbot-assistant-discovery.md)
- [Approved free-text plan](../../workflow/zhenghao/specs/004-learner-chatbot-assistant-plan.md)
- [Final security report](../../workflow/evaluations/zhenghao/ZH-CHAT-01/security-final.md)
- [Planning-only redesign proposal](../../workflow/zhenghao/specs/005-learner-chatbot-assistant-security-redesign-proposal.md)
- [Constrained-coaching amendment](../../workflow/zhenghao/specs/006-learner-chatbot-assistant-constrained-coaching.md)
- [PR #11 CI repair](../../workflow/evaluations/zhenghao/ZH-CHAT-01/pr11-ci-repair.md)
- [Telemetry](../../workflow/evaluations/zhenghao/ZH-CHAT-01/monitoring/report.json)
