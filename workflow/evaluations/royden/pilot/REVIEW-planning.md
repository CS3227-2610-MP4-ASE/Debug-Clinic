# Blinded planning review

Both experimental plans qualify. Sample-08 scores **8/10**; sample-31 scores **10/10**. Neither has a zero in requirement coverage or security/failure. These scores assess the supplied draft designs, not implemented behavior or executed tests.

| Criterion (0–2)         | sample-08 | sample-31 |
| ----------------------- | --------: | --------: |
| Requirement coverage    |         2 |         2 |
| Security/failure        |         1 |         2 |
| Decision completeness   |         1 |         2 |
| Acceptance traceability |         2 |         2 |
| Feasibility             |         2 |         2 |
| Total                   |     **8** |    **10** |

## Shared strengths and verdict

Both PRDs explicitly cover COACH-01–15 and connect them to observable acceptance behavior. Both plans require owner-only learner access before private context/provider access, saved work pinned to published content, server-selected stages, revision resets, terminal submission, bounded allowed context, inert advisory output, limits, honest nullable usage, stable recoverable errors, private telemetry and an accessible single workspace. Instructor authority and the fixed stack are preserved. Neither claims human approval or passing feature tests.

Both distinguish design proposals from owner requirements. Retention/deletion is truthfully pending before real users, and actual provider numeric/capability verification remains a production gate. These are allowed follow-ups, not failures. Historical owned-outcome retrieval after edit/submission is explicitly proposed as retrieval without new coaching or progression. No extra authoring, review, execution, identity-provider or deployment scope is needed.

The technical designs use short real database transactions, shared save/submit locking, durable request identities, atomic feedback/progression/stage accounting and conservative dispatch-intent recovery. Both make possible upstream charges distinct from application stages, and neither promises exactly-once upstream billing. Planned test matrices map requirements to concrete offline fake/provider captures, actual local PostgreSQL races and browser assertions. Raw test-row counts do not determine quality.

## Substantive finding: sample-08 stale overlapping action

**Material failure-control and contract-decision gap.** In TDD.md, “Proposed HTTP contracts” defines start input as revisionId, idempotencyKey and optional supersedesRequestId. “Admission, dispatch, and persistence protocol” selects successfulStages + 1 and checks the active pointer, but a fresh request does not bind the caller's observed progression. PRD R06 and test T13 promise concurrent distinct keys will not double-advance or double-charge application stages.

A permitted schedule defeats that promise:

1. A and B are distinct-key actions issued from the same saved revision and initial workspace state.
2. A is admitted and its fast provider result commits stage 1, then clears the active pointer.
3. B's overlapping but delayed admission now gets the attempt lock. Its revision still matches and no active pointer remains.
4. The proposed protocol selects stage 2 for B, calls the provider again and can commit a second stage/charge.

Per-revision locks and unique stage ledgers prevent duplicate stage-1 rows, but do not reject this stale second action. The browser's pending disabling is supplemental and cannot enforce the server requirement across delayed requests or clients. The design needs a caller-observed progression/version in the immutable fingerprint and a new-admission check, while preserving successful old-version key replay. The test plan should force B's admission after A commits even though both actions began against the same initial state.

This reduces security_failure to 1 because the concrete concurrency protection is partial, and decision_completeness to 1 because the proposed shared start contract lacks the state expectation needed to fulfill its concurrent-action promise. Requirement coverage remains 2: the owner requirement is explicitly represented throughout the documents. Acceptance traceability remains 2: the matrix maps the requirement to meaningful real-DB distinct-key tests with exact assertions; the missing adversarial ordering is a targeted addition, not an absence of a traceable test plan.

## Substantive differences

Sample-31 closes the stale-action gap explicitly. Its start contract includes expectedProgressVersion in the canonical fingerprint; new admission checks it, success/save increment it, and replay checks the original identity before rejecting current-progress mismatch. Its coordination section explains that an old expected version after a fast first success cannot accidentally consume the next stage; T13 and T14 trace this behavior to database/API evidence. No comparable material gap was found in the allowed sample-31 documents.

The unknown-outcome proposals differ but are both acceptable owner-unconfirmed policies. Sample-08 keeps UNKNOWN active until explicit same-revision supersession with a new key, warning about possible prior charges. Sample-31 closes UNKNOWN at deadline, then permits a deliberate refreshed new-key operation subject to current state and quotas. Both fence late feedback and retain honest provider accounting.

Their edit-time spending choices also differ. Sample-08 discards old active work and clears its pointer on save, allowing new-revision coaching while old physical work may still finish. Sample-31 retains the attempt guard until old completion/deadline, trading waiting time for less overlapping spend. The owner requires stale isolation and bounded honest resource use, not one particular choice between these policies; neither difference alone incurs a penalty.

Both remain feasible proposals within the supplied baseline. Neither requires an additional platform, process-local mutex for correctness, live service, new identity provider or Python runner. Exact existing-schema integration remains a review task, as both acknowledge.

## Limitations

This pass used only planning-task.md, planning-owner-requirements.json and the three specified documents per sample. It did not inspect other artifacts, owner transcripts, history, telemetry, method labels or external resources. Delivery scores were left unchanged.

No application code, database migration, feature test, compiler check or provider call was executed for this review. Test plans are assessed for specificity and traceability, not counted as passing evidence. Owner claims are compared with the supplied COACH answers; the actual clarification command history was not independently verified. Feasibility is conditional on the fixed supplied architecture, because the product repository was not inspected. No method/condition attribution was made.
