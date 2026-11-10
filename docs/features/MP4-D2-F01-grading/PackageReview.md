# MP4-D2-F01 — Independent specification review

**Reviewed package v1.1 · Ready for owner package approval · 2026-11-10 (Asia/Singapore)**

The independent reviewer `/root/grading_spec_review` reviewed the full package as `GRADING-SPEC-01` and verified the targeted repair as `GRADING-SPEC-02`. The reviewer had read-only scope and used the repository spec reviewer instructions. The inspected checkout was `e4483dd958d7100b066b75e4d48179d356f4c6a3`. The proposed master parent `e244e3e4c138ea2d6ab912c9d06075042a34434a` was verified by the coordinator through GitHub. [Reviewer instructions](../../../.codex/agents/spec_reviewer.toml) · [Planning gates](../../../workflow/agents/README.md#planning-gates)

## Reviewed inputs

| File | SHA-256 |
| --- | --- |
| [Mission Brief v1.1](../../mission-brief/MP4-D2-F01-grading.md) | `44ef877124aff610329e1477a448d96a036eebb3ff09cfbeecb7047eb4e1fa27` |
| [ApprovalRecord](ApprovalRecord.md) | `7873f310380e944132135ca06e3c8992da8f94290f9d14222103c72b979ca40c` |
| [GrillingDecisions](GrillingDecisions.md) | `4b836f4c0557d2d614dc7c0b43f0bc30458df92f65cb0db50e96c2a442e2d8b3` |
| [Approved PRD v1](PRD.md) | `559c94c9724d3c6b74ed048fa2a1ca2f699c949e8007dfe1f11b5aac822ed00f` |
| [Technical Design v1.1](TDD.md) | `ab27bdcd6008063a3241d7bbf45bbb35252daec4980b83e410403e67572fbb62` |
| [Requirements-to-Tests v1.1](RequirementsToTests.md) | `78a5b94b17f9b9d2a626b6859e239dc47ebc10d09a2446c23a0be0cf0251d4ec` |

## Findings and closure

The initial v1 package was blocked. The coordinator revised the design and test map in one targeted round. The independent reviewer confirmed closure against the hashes above.

| Finding | Resolution verified in the plan |
| --- | --- |
| P1 · The opt-in browser backend had no grading service and the packaged smoke had no grading journey. | Add the grading and learner dashboard services to `tests/support/browser-auth-server.ts` and grading checks to `scripts/verify-netlify-artifact.ts`. Plan separate composed and packaged evidence. |
| P1 · A pending session recheck could discard an unsaved grade. | Define verified, indeterminate or revalidating, and invalid grading admission. Retain same-session input through revalidation, prevent writes until verified, and test same-account recovery and cross-account clearing. |
| P1 · Ten active learners on one IP could exhaust the existing 120-request-per-minute IP budget through polling. | Scope dedicated limits to the compact learner grade GET, with a pre-auth IP ceiling, verified learner budgeting and ordinary IP treatment of denials. H07 plans a normal-limit, eleven-learner shared-IP run and isolation checks. C04 measures visibility separately. |
| P2 · Custom-header preflight and hostile request metadata needed explicit treatment. | Plan unauthenticated OPTIONS checks for the actor header, fixed route labels and server-generated request IDs for grading. Verify absence of sentinel data in errors and logs. |

The reviewer verified the recorded owner decisions, unchanged approved PRD bytes, and coverage of all 27 acceptance criteria. The coordinator checked mappings to 22 planned cases. The documentation and monitor checks establish package readiness. The 15-second timing result, shared-IP workload capacity, deployment topology, database migration, packaged handler, manual accessibility and CI remain implementation evidence to collect. The rate budgets and test seams are design choices presented for package approval. A separate owner instruction authorizes implementation after package approval.
