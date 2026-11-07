# ZH-CHAT-01 — security redesign decision

Status: owner selected constrained-coaching planning on 7 November 2026;
revised package approval and implementation authorization remain pending.
Date: 7 November 2026, Asia/Singapore.
Reviewed application head: `b4878edeb0027e128a76d24820534efb34c1686c`.

## Why a decision is needed

The two permitted source-correction/re-review rounds have been used. The final
live recheck delivered an encoded complete correction and rejected both benign
controls. The existing free-text output screen therefore fails both the
no-complete-solution requirement and useful-coaching acceptance. Passing the
seven deterministic regression objectives did not predict this live result.
The independent final security report records the exact outcomes and limits.

All twelve authorized logical generation calls have been used. No further live
calls, third source repair, or relaxed acceptance criteria are authorized.
`workflow/monitoring.md` requires an unresolved recovery limit to block completion.
Testing, release documentation, push and PR readiness remain gated; current
commits are a local development checkpoint, not an accepted feature.

## Recommended direction: constrained coaching responses

Retain the floating chat, learner messages, private history, consent, three
levels, authorized context and explicit Next hint progression. Change the model
output boundary so arbitrary model prose is never delivered as learner advice.

1. The provider receives the same authorized public exercise and consented
   context, but returns a strict internal selection such as
   `{ "move": "TRACE_SEQUENCE_BOUNDARY" }`. No generated text, code, URLs,
   encoded strings or arbitrary template parameters are permitted.
2. The backend validates the selection against a small, versioned catalogue of
   coaching moves allowed at the current server-controlled level. It renders
   reviewed English questions, explanations or small behavior-tracing examples
   from that catalogue. Unknown fields, moves or levels fail safely without
   advancing progression.
3. Example moves include tracing a value, inspecting a sequence boundary,
   comparing actual and expected behavior, checking accumulator behavior, and
   explaining a learner's reasoning. Templates describe observations and
   debugging actions; they do not prescribe a complete replacement or reproduce
   the canonical correction. No model-chosen free-text slot bypasses this rule.
4. The public chat API can continue returning rendered `message` text; the
   internal provider schema and prompt receive a new version. Ordinary quota,
   retention and duplicate-request behavior remain unchanged. One generation
   call per request remains the intended bound. This direction adds no validator
   model, tool execution or external service.
5. Evaluate the whole rendered catalogue and valid selection combinations
   against tiny exercises, ordinary debugging requests, encoded payloads,
   extraction attempts, invalid selections and cumulative conversations. A
   finite catalogue narrows the output surface; it does not prove universal
   educational suitability or eliminate every possible covert encoding.

Tradeoff: the assistant can select exercise-relevant coaching, but its replies
are less conversational and less tailored than generated explanations. This
changes the approved response design and needs owner scope approval. It must
not be presented as an equivalent drop-in repair or implemented silently.

## Alternative: retain generated free text

Return to planning for a different validation architecture and coaching-quality
evaluation, rather than adding another keyword patch. Possible components to
assess include bounded decoding, independent semantic assessment, and a more
appropriate configured coaching model where officially supported. None is yet
selected or authorized. Additional model passes affect request accounting,
latency, quotas and privacy and need explicit design and approval. Model-based
validation also remains fallible and requires adversarial and benign evidence.

This direction preserves richer conversation but has greater unresolved
security, reliability and resource uncertainty. The current implementation is
not accepted merely by describing it as best effort; any changed help boundary
or residual-risk acceptance must be an explicit owner decision.

## Next gate

The owner chooses a planning direction or pauses at the local checkpoint.
Then revise the affected requirements, design, acceptance matrix, stage budget
and standalone repair packet; obtain the applicable independent review and
recorded package/implementation approval before source changes. Reuse existing
stage conversations. Any new live allowance needs a separately stated cap,
window, data boundary and authorization; the original twelve-call ledger stays
intact. No extra provider call is requested or authorized by this proposal.
