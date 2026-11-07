# ZH-CHAT-01 — Learner assistant discovery

Date: 7 November 2026, Asia/Singapore.
Status: independent planning review passed; delegated owner approval and implementation authorization verified.

## Authority and baseline

The owner's request in the coordinator chat authorizes discovery, planning, and
creation of `zh/learner-chatbot-assistant`. It reserves implementation for recorded
approval. It authorizes concern-separated commits and a push for PR creation after
all stages finish; it does not authorize merge or deployment.

The branch was created from clean local `master` at
`2c372c5a9af9fafddf950e446121e475687ab29a`. The explicit new branch instruction
takes precedence over the older expected `zh/learner-workspace` reference.
No existing branch pointer was moved. Developer 2 SDD paths were excluded from
discovery. No application source or provider configuration has been changed.

## Verified current boundaries

- `PublishedQuestionPage` owns current code, reasoning, attempt revision,
  final-submission recovery, dirty-work handling, and session/lifecycle guards.
- `LearnerWorkspace` provides local Python Run/Test/Stop. Scratch tests and stdin
  are described as device-local and are not saved/submitted.
- `PRODUCT.md` and the feature map leave Get Hint unavailable. Publication does
  not require hints; functional hint integration belongs to Developer 1.
- The existing `AiProvider` exposes question generation and hint preview, not a
  conversational assistant. The existing SoC adapter is backend-only and uses a
  transport seam suitable for isolated tests.
- Presence checks confirmed the four existing AI/provider environment settings
  are nonempty. No values were printed and no real-provider request was made.
- Both `docs/Reflection-ZhengHao.md` and `docs/reflection-requirement.md` exist.
  Reflection edits belong to the later documentation stage.

## Fixed requested scope

A draggable side launcher opens a compact assistant panel with a Minimize action.
Preserve the existing MUI/light visual identity, exercise controls, keyboard flow,
current draft, and pending state across minimizing. Launcher interactions do not
call the model. No autonomous editing, execution, saving, or submission.

Use Impeccable for UI planning and implementation. Its context command ran once;
the shape discovery procedure is in progress. Existing design-context drift
includes an orphaned published-question surface brief and no recorded build path;
no drift repair or visual-world replacement was authorized or performed.

## Confirmed product decisions

The owner answered the first structured question round in the coordinator chat
on 7 November 2026. These decisions establish scope; they do not approve the
still-unwritten implementation package.

1. One assistant incorporates three-stage coaching. Do not introduce a parallel
   unrestricted chatbot that bypasses that progression.
2. Explain the bug and give small examples, but do not supply a complete exercise
   solution. A stage-specific disclosure rubric remains to be agreed.
3. Analyse a current editor snapshot with a visible sharing control. Include
   execution output only when the learner opts in. Other local-only inputs are
   not implicitly authorized by that decision.
4. Progression uses an explicit Next hint action. Advance only after a successful
   response; failures leave progression unchanged. Ordinary chat stays at the
   current level. Proposed levels are guiding questions, likely bug/reasoning,
   then targeted examples/partial guidance; all retain the no-complete-solution rule.
5. Generate coaching using the public question and shared code. Instructor-approved
   hint records are not required, and private instructor solutions remain excluded.
6. Persist private history per learner and exercise version, retain it across
   edits and refresh, identify snapshots, and make it read-only after final
   submission. Instructors do not see chat history in this first version.
7. Continue ordinary chat at Stage 3. Code edits and Clear chat preserve coaching
   progression; Clear chat deletes messages, not the unlocked stage.
8. Delete private chat content after 30 days without activity and offer immediate
   Clear chat. Retain only minimal progression and usage metadata needed for
   coaching state and limits.
9. English coaching for Python exercises, with configurable limits of 10 requests
   per 10 minutes and 100 per learner per day. These are product limits, not a
   statement of provider capacity.

## Open product decisions

The three clarification rounds are answered. Technical policy details and the
full acceptance plan in `004-learner-chatbot-assistant-plan.md` are proposals for
review, not implementation authorization. No unanswered recommendation has been
silently recorded as a product decision.

## Draft integration consequences

- Use a learner/exercise-version chat identity independent of a saved attempt so
  requesting help does not silently save code or require a reasoning-field write.
  Recheck final-submission and publication state on the backend.
- Treat ordinary messages and explicit progression as distinct request actions.
  Serialize progression changes and make duplicate/lost replies reconcilable.
- A reply identifies its code snapshot; editing while a call is pending does not
  relabel old advice as analysis of new code. Later messages supply fresh consented
  context and earlier conversation remains untrusted historical data.
- Evaluate generated coaching without assuming absence of a stored private
  solution prevents the model from independently deriving a complete correction.
  The no-complete-solution rule requires semantic evaluation as well as context
  exclusion; no perfect prevention claim is justified.

## Delivery and accounting

Five sequential stage identities: `planning`, `implementation`, `ai-security`,
`testing`, `documentation`. Reuse stage conversations for repairs; complete in
the original coordinator. No downstream stage has been dispatched.

Planning, security, testing, and documentation request GPT-6.1 Sol/high.
Current coordinator telemetry confirms `gpt-6.1-sol` and `high`.
Implementation requests an available GPT Luna model once directions are clear;
its exact runtime selection is unverified until dispatch.

Initial planning soft estimate: 250,000 observed response tokens and 45 minutes.
This is uncalibrated and includes repeated/cached inputs; it is not unique written
output or subscription billing. Set later-stage estimates with the approved plan.
Record overruns and revised estimates without erasing the original estimate.

First measured checkpoint: 3,070,649 tokens across 12 observed responses, with
92.05% cached-input reuse. This exceeds the initial estimate. The long coordinator
context is repeatedly counted as input; subsequent packets will use scoped file
pointers and concise handoffs. Planning remains on Sol/high as requested. No
savings claim follows from this checkpoint. The canonical monitor also warns
when an assignment estimate equals its budget, so its elapsed-budget warning
does not establish an actual elapsed-time overrun. Inspect actual durations.

The coordinator's session and bound were verified through its own metadata.
The canonical monitor manifest/state stays in an explicitly mapped private
temporary directory outside Git. Sanitized checkpoint reports go to
`workflow/evaluations/zhenghao/ZH-CHAT-01/monitoring/`. Temporary raw-state retention
is limited by the operating system; move it to durable private storage through
the applicable filesystem approval before relying on long-term raw evidence.

## References and gaps

- [SoCLaaS quickstart](https://dochub.comp.nus.edu.sg/cf/guides/soclaas/quickstart):
  browser-fetch tool could not access this page. An approved public-document
  download succeeded, but returned the DocHub login/access-denied page, not the
  guide. Provider contract verification remains pending; no credentials were sent.
  Existing source behavior is not a substitute for the guide's actual contract.
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html):
  referenced for the planned independent security stage. Identify applicable
  controls during planning; enforce authorization outside the model, treat output
  as untrusted, and evaluate real observable outcomes using harmless fixtures.

Next action: record exact approved-byte hashes and dispatch the implementation
packet. The verified owner delegation in side chat
`01a1b442-630f-7012-b4b8-eef108dad47f`, user turn
`01a1b444-56cb-71f2-a9fd-2b9a5f5c2256`, conditionally approved the scope/package
and separately authorized implementation after independent blockers were resolved.
The independent reviewer subsequently passed the corrected plan. No duplicate
approval is required for that transition. Preserve the provider evidence gap.
