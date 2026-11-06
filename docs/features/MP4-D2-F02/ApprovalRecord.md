# MP4-D2-F02 approval record

Recorded 2026-11-06, Asia/Singapore. Owner: Developer 2 / Royden.

## SCOPE-APPROVAL-01

- Source: owner reply in chat `01a1acf1-29ff-72a0-8f59-a6586be664d7`, immediately after the coordinator presented Mission Brief v1 and asked approval including minimum three-hint preparation.
- Exact owner reply: **“I approve the mission brief”**.
- Approved artifact: `docs/mission-brief/MP4-D2-F02-publish-question.md`, Mission Brief v1.
- SHA-256 independently reverified before recording approval: `b834da33099f368ddd42748539353369c4a095f77b9abced2e60dffe97a8f22b`.
- Scope includes both publishing entry points, editing owned saved drafts, minimum preparation/review/approval of three ordered hints, immutable publication, own published removal/deletion, and minimal learner verification UI.
- Original brief bytes are preserved. Its proposed/awaiting-approval header is historical and superseded by this explicit approval provenance; it is not evidence that scope approval is missing.
- This approves the feature boundary and unlocks requirements grilling. Open decisions and recommendations are not silently approved. PRD approval, design/test/package review and approval, and separate implementation authorization remain outstanding.

## REQUIREMENTS-ROUND-01 / SCOPE-AMENDMENT-01

- Source: same owner chat, 2026-11-06, response to Q1–Q6 after scope approval.
- Exact reply: **“Accept all except Q2 and Q4: hints are LEARNER side feature, will be developed by dev 1. For convenience, include a 'Get Hint' button with no functional use so Dev 1 has easier integration. Hints are not part of this implementation. For Q4, recommend an easiest implementation”**.
- Accepted Q1: all six existing question fields editable, topic fixed, explicit Save changes updates the same draft without autosave.
- Accepted Q3: immediate Publish from generated preview requires no separate Save step; persist reviewed content with publication, preserving edits on failure.
- Accepted Q5: all signed-in learners can view all instructors' published questions; no course/enrollment filters.
- Accepted Q6: learner-visible title/topic/problem statement/buggy code/expected behavior; hide hint content, bug explanation and corrected solution. The new Get Hint placeholder does not deliver hint content.
- Replaced Q2 and amended scope: no hint authoring, review/approval, generation or delivery in F02. Developer 1 owns the learner hint feature. Add a nonfunctional Get Hint button for later integration.
- Consequence: F02 publication is independent of hint existence/approval. This explicit owner direction supersedes PRODUCT.md's three-approved-hints prerequisite for this feature slice; no artificial hint rows or nonfunctional publication gate. Record product-document alignment and Developer 1 integration obligations in the design/package. No Developer 1 hint API or implementation is invented.
- Mission Brief v1 remains preserved in its approved backup. The original writer completed v2 reflecting the authorized amendment; coordinator read full bytes and verified SHA-256 `c6514f1be7d5b92f4add999c09575e26568128db1ecf141d26c613f0acfa7dc9`. This hash identifies the resulting amendment snapshot; it is not a fabricated claim that the owner had approved these newly written exact bytes in advance. The owner's explicit direction authorizes the amendment and continued requirements clarification. No approval is inferred for unresolved Q4 or future detailed requirements.
- Q4: original two-action proposal rejected; owner asks for simplest recommendation. Coordinator proposes single Remove/archive behavior, but it is **not accepted yet**.

## REQUIREMENTS-ROUND-02

- Source: same owner chat, 2026-11-06, response to Q4 alternative and Q7–Q10.
- Exact reply: **“accept all recommendations.”**
- Q4 accepted: one confirmed Remove action archives the question, hides it from learners, and retains the immutable instructor record. Permanent deletion, restoration and republishing are excluded.
- Q7 accepted: publication confirmation text “I have reviewed this question and understand that published content cannot be edited.” Publish uses current edited content without a separate Save step.
- Q8 accepted: warn before discarding unsaved edits; failed Save/Publish retains edits in the current page. No autosave or recovery after reload.
- Q9 accepted: stale saves/publishes from another tab are rejected with reload feedback; publishing an already-published saved draft returns the existing publication. This answer did not yet settle response-loss retries of an unsaved generated preview.
- Q10 accepted: newest-published-first learner list and read-only detail; list includes title/topic/instructor display name/publication time. Detail uses the previously accepted learner question fields and disabled Get Hint button with “Coming soon”.
- The earlier Q4-unaccepted statements and proposed-placeholder wording are historical and superseded by this response. Mission Brief original writer incorporated these outcomes into v3, SHA-256 `43f981aaad9ba342cf6093bbfcd1886f6f78b71d434f139f37b5ed50852d3cd2`; coordinator read full bytes and independently checked the hash. This records the resulting clarification snapshot rather than approval of bytes before they existed.
- Final dependent frontier Q11–Q13 and explicit shared-understanding confirmation remain before PRD drafting. No PRD/package/implementation approval is inferred from this reply.

## REQUIREMENTS-ROUND-03 / SHARED-UNDERSTANDING-01

- Source: same owner chat, 2026-11-06, reply to final Q11–Q13 and the explicit invitation to confirm the complete requirements and draft the PRD.
- Exact reply: **“Confirmed. Draft the PRD”**.
- Q11 accepted: archive/removal hides future learner list/detail requests; an already-open page may retain loaded content until refresh/navigation. No live push/polling requirement.
- Q12 accepted: retries of publishing the same generated preview resolve to the same question after a lost response; duplicate clicks are disabled while pending.
- Q13 accepted: own Drafts, Published and Removed management views; Drafts supports editing/publishing, Published viewing/removal, Removed read-only.
- Confirms combined Q1–Q13 as the complete shared understanding and explicitly authorizes PRD drafting. Requirements interview frontier is empty. All prior pending labels for these decisions are historical and superseded.
- Original Mission Brief writer consolidated v4, SHA-256 `8926bd04749633665d208065dbb94dc7cd101e413d67fef596efae092e4c5487`; coordinator read the complete result and verified its hash. This is the resulting confirmed-scope snapshot, not advance approval of its bytes. A fresh PRD writer receives complete confirmed source artifacts. This is not approval of the not-yet-drafted PRD, technical design, package or implementation.

## PRD-APPROVAL-01

- Source: same owner chat, 2026-11-06, immediately following presentation of complete PRD v1 and the explicit question asking approval including R1–R3.
- Exact owner reply: **“approve”**.
- Approved artifact: `docs/features/MP4-D2-F02/PRD.md`, v1; SHA-256 reverified before transition: `f04089ad7555a61dabdd71645d0cf0e4f309fdd321cd609beef91841930b2b1c`.
- Approval includes R1 bounded state-specific ordering/50-item pagination, R2 exact cancellation/removal wording and repeated Remove, and R3 the same reviewed snapshot while publication outcome is uncertain.
- Approved PRD bytes are preserved. Its draft/approval-absent header is historical and superseded by this explicit external approval record; do not mistake it for missing approval or silently rewrite the approved bytes.
- This unlocks fresh Technical Design Document and Requirements-to-Tests writers, followed by independent full-package specification review. Public test seams are proposed in that design package for human approval before executable tests. Package approval and separate implementation authorization remain absent.

## PRD-CLARIFICATION-01

- Source: same owner chat, 2026-11-06, answer to asynchronous legacy-preview compatibility question after PRD approval.
- Question explained that unsaved pre-F02 previews lack a trusted original-topic record; new previews retain direct publication. Owner selected exactly **“Allow older previews to be saved and reopened before publishing, or regenerated (Recommended)”**.
- Accepted delta: old unbound preview direct publication safely fails and retains edits with Save/open/Publish or regeneration guidance; existing F01 Save semantics remain. Saved drafts use their persisted fixed topic. New trusted-topic previews keep direct publication.
- Resulting normative delta is recorded in `PRDClarifications.md`; approved original PRD bytes are preserved. Original FR/AC IDs remain; FR-04.AC1–AC2 are read with this explicit legacy exception. This is the owner's approved clarification, not a silent requirements relaxation or an attestation of original legacy model content.
- Topic-binding design blocker released. Package review must read the full clarification and include its resulting hash in eventual human package approval. No test/code/package/implementation authorization is implied.

## Other gates

- Shared understanding after grilling: SHARED-UNDERSTANDING-01 above, complete.
- Human PRD approval: PRD-APPROVAL-01 above, complete.
- TDD/Requirements-to-Tests and independent specification review: authorized next; not yet completed.
- Human exact-package approval: absent.
- Separate implementation authorization: absent.
- Push/PR/merge/deployment/live-infrastructure authorization: absent.
