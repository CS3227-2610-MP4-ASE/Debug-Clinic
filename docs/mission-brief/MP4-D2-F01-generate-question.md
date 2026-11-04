# Mission Brief v1 — MP4-D2-F01: generate-question

- Date: 2026-11-05 (Asia/Singapore)
- Owner: Developer 2
- Status: proposed scope; awaiting human approval
- Current gate: Scope. No scope approval, approved requirements package, or implementation authorization is recorded for this brief.

## Confirmed request

The user requested **MP4-D2-F01 — generate-question**, with the goal:

> Admin enters a Python topic; the LLM generates a draft.

The relevant application role is **`INSTRUCTOR`**. “Admin” describes the actor in the request; it does not establish a new role. The programming language is limited to **Python**.

The required baseline is **`Debug-Clinic-auth-completion`**, branch **`royden/auth-completion`**, at committed parent **`b8612d9dd655ae200607c4ff887703132eb0f61f`**. The coordinator reported this baseline clean and explicitly selected it as the parent checkpoint. A feature branch/worktree and eventual PR target have not been created or decided.

## Proposed bounded scope — for explicit approval

Enable an authorized instructor to enter a Python topic and request LLM generation of a draft. Recommend **one topic → one draft for instructor review**, with no automatic publication or code execution. This is a proposed boundary, not an approved product decision.

The intended observable outcome is that an instructor can submit a Python topic and receive a draft for review, or receive clear feedback when generation cannot complete. Requirements must later define what qualifies as a draft, its presentation, and the observable failure behavior.

The proposed slice includes the instructor interaction, the protected generation request, and the AI integration needed for that outcome. Detailed contracts, acceptance criteria, and implementation choices belong to the later approved requirements/design package.

## Inherited product constraints

[PRODUCT.md](../../PRODUCT.md) establishes two roles (`LEARNER` and `INSTRUCTOR`), human verification before learner access, and advisory AI output. Every published exercise requires exactly three approved, ordered hint stages. That publication constraint does not decide whether this draft feature generates hints or determine its draft composition. The SoC LLM must be accessed through a backend adapter with validation, limits, retries, and usage accounting. Arbitrary learner Python execution requires a separately reviewed sandbox; external credentials, provider contracts, and live deployments remain human-owned.

## Baseline observations and evidence limits

The following observations were supplied by the coordinator; this author has not independently run the application or contacted the provider:

- `/instructor` is an empty workspace with a disabled **Create exercise** action. Topic entry and draft-generation UI/API are not implemented.
- The current `AiProvider` interface offers `generateHint`; the existing `/api/v1/ai/hint-preview` route is learner-only. Neither establishes an instructor generation contract or grants this feature access to that route.
- Exercise, version, hint, and AI-usage models exist. Their existence does not establish draft-generation delivery or decide whether this feature uses them.
- Configuration observations identify provider `soc`, model `qwen3-coder-next`, and endpoint `https://soclaas-api.comp.nus.edu.sg/v1/chat/completions`. A key is configured; its value is excluded from this document. Configuration is not evidence of credential validity, provider capacity, availability, output quality, or acceptance success. Existing timeout/retry configuration is not an approved feature limit.

Keep fake-provider checks, compilation, database integration, browser observations, and controlled live-provider acceptance as separate evidence categories. Fake responses and schema presence cannot substantiate real LLM generation. No live-provider call is authorized or performed by this planning assignment.

## Proposed exclusions and dependencies

Exclude automatic publication, generated-code execution, support for programming languages other than Python, learner hint-flow changes, and a new administrator role from this proposed slice. Additional exercise-management or publication workflows require their own agreed scope.

Downstream work depends on confirmed instructor authorization, a defined generation contract, an agreed draft outcome, and provider constraints verified from authoritative evidence. Persistence and existing-model reuse remain open decisions rather than assumed dependencies. Shared interface or ownership changes require the owner's recorded decision before dependent implementation.

## Decisions reserved for grilling after scope approval

After human scope approval, use requirements grilling to resolve these decisions before PRD approval:

- **Draft structure and content:** What does “draft” contain, including any question, bug, solution, or hint composition? What makes it suitable for instructor review?
- **Persistence and lifecycle:** Is a draft saved, and when? What relationship, if any, does it have to exercises or versions?
- **Editing and review:** Can the instructor edit the result, and what review actions belong to this slice?
- **Topic input:** Is entry free text or constrained by a topic taxonomy? What validation and unsupported-topic behavior are required?
- **Regeneration:** Is it included, and what happens to an earlier result or in-flight request?
- **Failure and usage policy:** Which input/output bounds, usage limits, latency expectations, timeout/retry behavior, and provider-failure outcomes are justified? Numeric limits need authoritative evidence and an explicit requirements decision; this brief sets none.

These questions do not preselect answers or expand the proposed scope. Scope approval is not approval of a particular draft schema, storage model, editor, taxonomy, or regeneration behavior.

## AI security, validation, and privacy work required downstream

The TDD and Requirements-to-Tests must cover instructor authorization, authorized context selection, prompt versioning, data minimization, input/output validation, safe rendering, prompt-injection/adversarial cases, token-usage accounting, latency, usage limits, retries/timeouts, and provider failures. Treat topic input and model output as untrusted. Define the handling of malformed or unsuitable output before presenting it as a usable draft.

Decide which data is sent to the provider and retained in application records or logs. Keep credentials and real user data out of prompts used as test fixtures, logs, and evidence artifacts. Document outstanding provider/privacy constraints and require a separate security review for this AI feature. Controlled real-provider acceptance must have its own authorized environment and evidence; configuration observations do not satisfy it.

## Approval and delivery gates

Follow the [repository workflow](../../workflow/agents/README.md) and [MP4 feature-delivery skill](../../.agents/skills/mp4-feature-delivery/SKILL.md):

1. Human approves the exact Mission Brief scope, with a recorded reference/date. Only then proceed to requirements grilling and PRD drafting.
2. Human approves a complete PRD with stable requirement IDs and resolved product decisions.
3. Fresh scoped writers prepare the TDD and Requirements-to-Tests (RTT), defining interfaces, ownership, failures, and coverage for every acceptance criterion.
4. An independent spec reviewer checks the complete package, including contradictions, coverage, privacy, and contracts. Resolve blocking findings before the human package decision.
5. Human package approval binds exact artifact bytes. Record SHA-256 hashes and verify a dated external backup; copy and commit the exact approved snapshot before dependent implementation, under the coordinator's authority.
6. Obtain **separate human implementation authorization** identifying the approved package/version and scope. Planning approval alone does not authorize code changes, commits, or live calls.

Later delivery must preserve separate functional and coding-standards review verdicts, the AI security review, and explicit outstanding manual/CI/live-provider evidence. Push, PR publication, merge, deployment, and live infrastructure changes retain their separate authorization requirements.

Relative links in this draft target its eventual repository location, `docs/mission-brief/MP4-D2-F01-generate-question.md`.
