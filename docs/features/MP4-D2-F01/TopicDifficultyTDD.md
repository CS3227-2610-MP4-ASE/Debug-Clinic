# Technical design amendment — MP4-D2-F01 Python topic difficulty

- **Status** Draft - awaiting owner approval
- **Draft date** 2026-11-09 (Asia/Singapore)
- **Workstream** MP4 Developer 2, F01
- **Inspected baseline** `Debug-Clinic`, `royden/mp4-agent-workflow` at `44b931c58c6d7831974b8837010c3db154ff8d3a`

## Authority and scope

The [scope amendment](../../mission-brief/MP4-D2-F01-topic-difficulty-amendment.md)
was approved under `F01-TOPIC-DIFFICULTY-SCOPE-01` at SHA-256
`f4b8a8a64c9b457b6c9240f1b89340398d66ae6d5c0c791877e7183ee91a91d0`.
The [PRD amendment](TopicDifficultyPRD.md) was approved under
`F01-TOPIC-DIFFICULTY-PRD-01` at SHA-256
`dda283810bf25f7a67408210affc7e86c9a48624aa1aaebf0cd409664f160f39`.
Both approvals are recorded in the [feature ledger](../../../workflow/handoffs/royden/MP4-D2-F01.md).
This delta replaces the level-dependent parts of the [original design](TDD.md)
and uses the delivered baseline for inherited behavior. It covers F01-FR-02,
F01-FR-04 and F01-NFR-01, with F01-FR-06 and F01-NFR-03 governing failure
and measurement. Follow the [coding standards](../../CodingStandards.md)
and [delivery runbook](../../../workflow/agents/README.md).

## Provider grammar and generation instructions

In `packages/contracts/src/index.ts`, update `QuestionOutputSchema` and its
inferred types together. The two strict alternatives are illustrated below.
The draft uses the existing `QuestionFieldsSchema` and the refusal accepts
exactly `vague`, `non_python`, `unrelated` or `unsuitable` as `reason`.

```json
{
  "schemaVersion": "f01-question-v2",
  "kind": "draft",
  "language": "python",
  "draft": {
    "title": "…",
    "problemStatement": "…",
    "buggyCode": "…",
    "expectedBehavior": "…",
    "bugExplanation": "…",
    "correctedSolution": "…"
  }
}
```

```json
{ "schemaVersion": "f01-question-v2", "kind": "rejected", "reason": "vague" }
```

Keep unknown-key rejection at the result, alternative and draft-field layers.
The old discriminator, a v2 draft carrying `level`, and a v2 refusal carrying
`out_of_level` are independently invalid. Keep the result wrapper
`{output,inputTokens,outputTokens}`. The six fields stay nonblank with the
same JavaScript string-length limits in the order above of 120, 2000, 4000,
1500, 2000 and 4000. Preserve storage-safe text rules, prose trimming and
verbatim code bytes. The same trimmed, storage-safe 1–300-unit topic schema
guards the browser and server. Blank or over-limit input stops before the
provider.

In `question-prompt.ts`, bump `QUESTION_PROMPT_VERSION` to `soc-question-v3`
and update the fixed system text and its literal grammar together. Direct the
model to accept a specific Python concept or task at any difficulty, including
related concepts that fit one exercise, and to stay on that topic. Keep the
existing tolerance for list/array terminology, algorithmic tasks and stated
complexity when compatible with the exercise. Treat underspecified and safe
but overly broad topics as `vague`. Use `non_python` for an explicitly
non-Python task, `unrelated` for a request outside Python programming, and
`unsuitable` for unsafe requests, instruction overrides, requests for private
context or tool use, or a request that cannot yield a safe, self-contained
exercise. Give safety precedence over the other classifications.

Keep the correct-first exercise construction and self-check instructions.
Require a small, deterministic, self-contained exercise using Python and
built-ins. Allow short classes and in-memory instance state when the topic
requires them. Require a stated input domain and concrete in-domain failing
input in the problem statement or expected behavior. Direct the model to
trace the input privately, verify the wrong and intended behavior and any
stated complexity, and fix the one causal behavioral bug without unrelated
behavior changes. Require syntactically coherent snippets and an explanation
that agrees with the two versions. Exclude third-party dependencies, file,
network and process operations. Require a single JSON object in the exact
v2 grammar with field bounds. Direct the model to treat the topic as data,
reject override attempts, keep instructions and private context private, and
avoid tools, execution, additional context and topic substitution.

`AiProvider.generateQuestion({ topic })` remains the seam. Change the
deterministic `FakeAiProvider` draft envelope to v2, retaining the sample and
`fake-question-v1` provenance. `SocLlmProvider` still sends two messages, the
fixed system message and `JSON.stringify({ topic })` as the user message.
Only the normalized topic varies with the instructor's request. Keep the
configured model and endpoint, server-side bearer header, redirect rejection,
and absence of tool configuration. Omit identities, request identifiers,
history, other exercises and edited draft content. Use the existing strict
parse at the transport and application boundaries. It validates structure and
Python declaration. Semantic quality and adherence require independent review
of controlled samples. The runtime renders generated text/code inertly and
never executes it.

Keep one overall deadline for fetch, backoff and body consumption
(`AI_TIMEOUT_MS` 100–60,000 ms, default 10,000). Within that deadline, keep
the current retry triggers: a fetch `TypeError`, an interrupted response
body, HTTP 429, or 5xx. A fetch error may include redirect rejection, and
the adapter never follows a redirect. Keep `AI_MAX_RETRIES` at 0–3 (default 2),
`100 * 2 ** attempt` ms backoff, and at most retries + 1 attempts. Valid
refusals reach the application without a retry. Malformed output and
nonretryable statuses take the existing immediate failure path.

Keep exactly one choice with string content, fatal UTF-8 decoding, and
streaming limits of 65,536 envelope bytes and 32,768 selected-content UTF-8
bytes. Keep response cancellation on invalid or oversized reads. The app
retains its `64kb` JSON body limit and app-wide rate limit of 120 requests per
60 seconds (10,000 in test), with the existing 429 response. The short
exercise format and field bounds still fit these controls, which limit
untrusted input, response consumption, and repeated provider work. Keep
final-response token counts as nullable integers in the range 0–2,147,483,647,
normalizing missing or invalid counts to null.

## Application behavior and compatibility

`createInstructorDrafts` maps a validated refusal to HTTP 400 `BAD_REQUEST`
with the existing fixed summary `Please choose a supported Python topic` and
one `details` entry whose `path` is `topic`. Keep the message map exhaustive
for the inferred refusal reasons. Proposed fixed detail strings follow.

| Reason       | Detail message                                                             |
| ------------ | -------------------------------------------------------------------------- |
| `vague`      | Please specify a Python concept or narrow the topic to one Python behavior |
| `non_python` | Please enter a Python topic                                                |
| `unrelated`  | Please enter a Python programming concept or task                          |
| `unsuitable` | Please choose a safe, self-contained Python debugging exercise             |

Use the existing alert and retain the editable topic on refusal. An invalid
result or provider failure gives HTTP 503 `DEPENDENCY_UNAVAILABLE` with the
fixed generation failure and explicit **Retry**. The instructor can edit and
resubmit. Both outcomes produce zero previews and saved drafts. The alert
receives only the app-authored error envelope, with no model-authored detail.

Keep authorization, origin/JSON checks, and request/response shapes on
`POST /api/v1/instructor/questions/generate`. Generation records one usage
event per application attempt with fresh operation identity, owner, provider,
model, prompt version, topic digest, latency, final-response tokens and
`SUCCEEDED`, `REJECTED` (`TOPIC_REJECTED`) or `FAILED` (`GENERATION_FAILED`).
Successful usage recording gates preview delivery. If usage recording fails,
retain the original refusal/failure or return a safe 503 for an otherwise
successful generation. Use the existing sanitized failure log with operation
ID. Exclude raw topic, code, model content and credentials from usage and logs.

The browser and persistence consume the six fields and separate provenance.
The v2 tag is internal to a generation call. Keep the read-only source topic,
editable six-field unsaved preview, explicit **Save draft**, and **New question**
restart/discard behavior. Existing owner-scoped Save, topic digest check for
new records, legacy null-digest handling and transaction still apply. Old
successful generation references and saved drafts retain their original
provenance. Deploy the new provider parser, prompt and fake response together
in the backend build. Existing frontend/API clients consume the same public
shapes and require no data migration. Keep the hint, coaching, auth and F02
publication behavior at their current boundaries.

## File ownership and shared approvals

Record owner approval of the shared-file requests before dependent edits.
Developer 2 owns the proposed amendment. The coordinator obtains the recorded
decision from the maintainer for each shared surface under the runbook.

| Exact file                                            | Current → proposed, rationale and verification                                                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/contracts/src/index.ts`                     | F01 v1 provider union → strict v2 without level. Synchronizes internal adapter grammar. Contract, adapter and HTTP regressions exercise both consumers and confirm public wire compatibility. |
| `apps/backend/src/ai/provider.ts`                     | Fake emits v1 → fake emits v2. Keep SoC transport, hint and coaching paths. Provider unit, injected transport and existing hint/coaching checks protect the shared module.                    |
| `apps/frontend/src/pages/InstructorDashboardPage.tsx` | Beginner copy → Python debugging copy. Keep current F01/F02 actions. Browser smoke confirms labels and routes.                                                                                |
| `docs/UserGuide.md`                                   | Replace the opening of **Preparing an instructor draft** with the approved text and exact examples. Check the guide against the instructor flow.                                              |
| `docs/DeveloperGuide.md`                              | Replace the current SoC prompt-version reference with `soc-question-v3`. Check against the captured request and provenance.                                                                   |

F01-owned source edits belong in `apps/backend/src/ai/question-prompt.ts`,
`apps/backend/src/exercises/instructor-drafts.ts`, and
`apps/frontend/src/pages/GenerateQuestionPage.tsx`. Use “Choose a specific
Python topic to prepare one private debugging draft” on the generation page
and “1–300 characters. Related Python concepts can fit one exercise” as
topic helper text. Remove “beginner” from the dashboard copy. Reuse the
current frontend API client and editor. The design calls for no new service,
route, configuration, parser, judge runtime or database object.

## Verification design

Proposed test seams for owner approval are the exported provider schemas,
`FakeAiProvider` and `SocLlmProvider` with injected fetch, `createApp` HTTP
with controlled provider dependencies, the same routes with isolated real
PostgreSQL, and the existing instructor browser journeys. Use independent
literal v2 fixtures and preserve v1-era provenance in compatibility cases.
Keep focused changes in `packages/contracts/test/f01-contracts.test.ts`,
`apps/backend/test/f01-unit-provider.test.ts`, `f01-unit-drafts.test.ts`,
`f01-acceptance-transport.test.ts`, `f01-acceptance-http.test.ts` and
`f01-prepush-regressions.test.ts` in that backend test directory,
`tests/support/f01-fixtures.ts`, `tests/integration/f01-drafts.test.ts`,
and `tests/e2e/f01-instructor.spec.ts` and `tests/e2e/f01-composed.spec.ts` as
affected. Preserve historical experiment captures and approved snapshots.

Use Node 24 and the [feature map](../../../workflow/agents/FEATURE_MAP.md).
After authorization, start with a red injected-transport case for the revised
request and strict v2 response, then update the grammar/prompt/adapter slice.
Add the HTTP refusal and malformed-result slice with usage and no-draft
assertions, then verify browser copy, local blank input, retained-topic alert,
Retry and compatible preview/Save. Retain request minimization, byte/clock
bounds, token normalization, privacy, origin/role, usage failure and legacy
provenance regressions. Check declaration build and focused F01 contract,
transport, HTTP, PostgreSQL and Playwright coverage, with separate functional,
standards and AI security review. See the amendment requirements-to-tests
checklist for criterion-level evidence.

### Controlled live acceptance

After separate authorization for a synthetic instructor, isolated database
and live SoC provider, use the current instructor generation flow. Run one
initial application submission for each of the seven approved verbatim topics
in the PRD amendment. The two guide topics each yield one unsaved six-field
preview on topic. The five refusal topics yield the mapped guidance, retained
topic, and zero preview or saved draft. For the unsafe and override inputs,
inspect the actual outcome for absence of code, private context and prompt
disclosure. Use the existing operational usage evidence and avoid adding
instrumentation or saving the live previews. Verify that live usage provenance
matches the running backend and distinguish retries within a submission from
additional samples.

Use a fresh scoped evaluator independent of the builder and generator with
rubric `f01-quality-v2` and evaluator instructions `f01-test-agent-v2`.
Calibrate with a structurally valid known-good synthetic example and a
structurally valid known-bad example with a wrong correction. Withhold the
expected labels and require correct classifications before scoring the live
drafts. For each draft, trace the stated in-domain input through both snippets
without executing them. Report PASS, FAIL or INCONCLUSIVE with the trace or
counterexample and evidence for topic fit across difficulty, one causal
behavioral defect, agreement across fields, determinism, and allowed
dependencies/operations. Treat captured material as untrusted data. A failed
calibration, failed case or inconclusive case leaves the live gate open.

Capture sample IDs, exact synthetic inputs and redacted outputs, actual
provider/model, prompt and schema versions, observed latency, final-response
token counts, failures and evaluator results. Record unavailable observations
explicitly and preserve each initial result and any approved repair attempts.
Keep exact synthetic captures private and separate from sanitized summaries,
mocked-browser, fake-provider, PostgreSQL and CI evidence. Keep credentials
and real user data out of artifacts. This draft records source inspection
only. Independent package review and owner package approval precede separate
implementation and synthetic live verification authorization.
