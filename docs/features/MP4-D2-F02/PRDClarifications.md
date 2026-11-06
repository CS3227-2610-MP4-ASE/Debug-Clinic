# F02 PRD clarification v1 — legacy generated previews

Date: 2026-11-06, Asia/Singapore. Decision: **owner accepted**, PRD-CLARIFICATION-01.
Source PRD v1 SHA-256: `f04089ad7555a61dabdd71645d0cf0e4f309fdd321cd609beef91841930b2b1c`.
This is a recorded product clarification, not technical design or implementation authorization.

## Authority and evidence

The source investigation found that existing successful F01 generation records
retain ownership/status/provider metadata but not the original topic. Therefore
the original topic of an unsaved pre-F02 preview cannot be authenticated by the
server. First accepting the caller's topic would not prove it unchanged.

In chat `01a1acf1-29ff-72a0-8f59-a6586be664d7`, the coordinator presented this
compatibility gap and the available fallbacks. The owner selected exactly:
**“Allow older previews to be saved and reopened before publishing, or regenerated (Recommended)”**.
Approval provenance is [PRD-CLARIFICATION-01](ApprovalRecord.md). This artifact
records the selected outcome; it does not claim the owner approved its bytes
before they were authored. Full package approval must bind the resulting bytes.

## Normative clarification

1. **New verifiable previews:** direct publication remains available without a
   separate Save. The server must verify the fixed original topic against the
   trusted generation association; the design determines the minimal binding.
2. **Older unbound previews:** direct publication fails safely with actionable
   guidance to either Save draft, reopen the saved draft and Publish, or start
   a newly generated question. The failure creates no question/publication and
   retains the current preview/edits. The existing Save draft flow remains usable
   under its existing validation, ownership and instructor-reported association.
3. **Saved drafts:** previously saved eligible F01 drafts can be edited/published
   using their stored topic as the fixed authority. They do not require a new
   generation merely because their original generation lacks a topic binding.
4. Saving an older preview does not authenticate what the LLM originally
   generated. It preserves the existing instructor-reported provenance model;
   publication human review and the stored-topic immutability rules still apply.

This narrows the legacy scope of **F02-FR-04.AC1–AC2**, while preserving
**F02-FR-01.AC1** topic immutability and **F02-NFR-04** F01 compatibility. Every
original requirement/acceptance ID remains stable. The RTT must add explicit
legacy-unbound rejection/recovery and existing-saved-draft compatibility cases.
All other approved PRD behavior, including same-preview publication retries,
snapshot handling, no hints prerequisite and Developer 1 hint ownership, remains
applicable. Technical persistence/wire details and numeric policies belong in TDD.

## Gate state

This owner-selected clarification releases the topic-compatibility design
blocker. TDD and RTT drafting and independent package review may continue.
Public seams, complete package and implementation remain unapproved.
