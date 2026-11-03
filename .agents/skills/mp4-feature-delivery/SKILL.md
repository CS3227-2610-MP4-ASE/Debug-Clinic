---
name: mp4-feature-delivery
description: Plan or deliver a DebugClinic MP4 Developer 2 feature through approved SDD gates, scoped agents, verification, and local integration. Use for new feature planning, authorized implementation, or a delivery continuation.
metadata:
  short-description: Plan and deliver approved MP4 feature slices
---

# MP4 feature delivery

Read the repository `AGENTS.md` and [runbook](../../../workflow/agents/README.md).
Identify the current gate in the feature ledger before acting. This skill covers
planning and delivery; invoking it does not grant implementation authorization.

1. For planning, draft in the MP4 sibling `Dev2-local-SDD/` tree. Follow human
   scope approval → human-approved PRD → TDD and Requirements-to-Tests → independent package
   review → human package approval → separate implementation authorization.
   Advance only when the gate's evidence is recorded. Copy exact approved bytes
   into the feature worktree, hash them, verify a dated external backup, and commit
   the snapshot before dependent implementation.
2. For implementation, read the complete assigned approved package, verify ledger
   hashes and approval provenance, and record branch, parent SHA, worktree, owned
   paths, interfaces, and checks. Choose a single builder for small work or a
   parallel implementer and acceptance-test author for stable interfaces. Use
   fresh [assignment packets](../../../workflow/templates/assignment.md).
3. Work autonomously within approved scope: implement, test, fix, update evidence
   and guides, recover from routine failures, and make meaningful local commits.
   Use `$verify-app` for observable behavior. Follow the runbook's retry bounds,
   independent functional/standards review, and risk-triggered security review.
   Changes to requirements, ownership, or shared interfaces return to the owner.
4. Integrate green slices at clean checkpoints. Complete the
   [ledger](../../../workflow/templates/dev2-feature-ledger.md) and
   [handoff](../../../workflow/templates/handoff.md), identifying pending manual,
   CI, and real-provider evidence. Push, merge, and deployment need their own
   authorization; local commit authorization does not imply them.

For skill changes, use the realistic cases and semantic rubric in
[workflow evaluation cases](../../../workflow/agents/skill-evaluation.md) alongside
the [evaluation protocol](../../../workflow/evaluations/royden/protocol.md).
