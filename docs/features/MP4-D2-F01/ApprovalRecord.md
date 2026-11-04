# MP4-D2-F01 approval provenance

## SCOPE-APPROVAL-01

- Date recorded: 2026-11-05, Asia/Singapore.
- Source: owner reply in chat `01a1a781-5c07-7480-b70f-d9d87fc91b68`: “I approve the mission brief scope”.
- Context: direct reply to the coordinator's request to approve Mission Brief v1, with linked exact draft and ledger.
- Approved artifact: `docs/mission-brief/MP4-D2-F01-generate-question.md` v1.
- Approved SHA-256: `1dc4543abd85eb0cb396ffd3a416472c0f4cee1e6ee75e0b6781009d5740aac1`, independently reverified before recording approval.
- Exact approved bytes and dated recovery copy are preserved. The draft's pending-approval header describes its state at authorship; this subsequent external approval record establishes the current scope gate without altering approved bytes.
- Scope: INSTRUCTOR enters one Python topic and receives one draft for review; no automatic publication or code execution. Detailed draft structure, persistence, editing and regeneration remain requirements decisions.
- Authorizes: post-scope requirements grilling and subsequent PRD drafting.
- Does not approve the PRD, TDD, requirements-to-tests or complete package, and does not authorize application implementation, test implementation, live provider/database calls, publication, merge or deployment.

## REQUIREMENTS-ROUND-01

- Date recorded: 2026-11-05, Asia/Singapore.
- Source: owner reply “accept all recommendations”, directly following grilling Q1–Q4 in this chat.
- Binds only those four recommendations: six-field draft with instructor-only explanation/solution and no generated hints; unsaved preview followed by explicit private Save; free-text Python topic with blank/non-Python rejection; fixed beginner undergraduate level without a difficulty control.
- Exact accepted decisions are recorded in `GrillingDecisions.md`, round 1. Follow-up decisions remain open.
- This is requirements interview evidence, not shared-understanding confirmation, complete PRD approval, package approval or implementation authorization.

## REQUIREMENTS-ROUND-02

- Date recorded: 2026-11-05, Asia/Singapore.
- Source: owner reply “Accept all recommendations. NOTE: Keep the feature to a minimal. no need for over engineering and contingencies”, directly following Q5–Q10 in this chat.
- Binds Q5–Q10 as recorded in `GrillingDecisions.md`: editable unsaved six-field preview; own-draft listing/read-only reopen; topic suitability rules; beginner exercise quality; clear generation errors/manual Retry; minimal provider context and retained metadata without raw-content logging.
- Additional binding constraint: keep F01 minimal; avoid overengineering and speculative contingency mechanisms. Do not expand accepted workflows through architectural extras.
- Q11–Q12 and shared-understanding confirmation remain pending. No complete PRD, package or implementation approval is inferred.

## REQUIREMENTS-ROUND-03 / SHARED-UNDERSTANDING-01

- Date recorded: 2026-11-05, Asia/Singapore.
- Source: owner reply “accept both. Shared understanding confirmed”, directly following Q11–Q12 and the confirmation request in this chat.
- Binds Q11–Q12 in `GrillingDecisions.md`: explicit New question clears unsaved topic/preview; no autosave/restoration/discard dialog or separate regeneration; loading disables repeated request/save clicks; no Cancel flow; failed Save retains editable preview for retry; successful Save opens the saved draft read-only.
- Confirms the accepted Q1–Q12 decisions capture the intended minimal feature. Grilling is complete.
- Authorizes drafting the complete PRD for review. Does not constitute PRD/design/package approval or implementation authorization.

## PRD-APPROVAL-01

- Date recorded: 2026-11-05, Asia/Singapore.
- Source: owner reply “I approve the PRD”, directly following the coordinator's request to approve the complete PRD v1 including proposed clarification PC-01, in chat `01a1a781-5c07-7480-b70f-d9d87fc91b68`.
- Approved artifact: `docs/features/MP4-D2-F01/PRD.md` v1, SHA-256 `ca200e496be98ee8e1deae5b5ff995e5d5342ce9633e28825fac12a86a179b8b`, independently reverified before this transition.
- Includes PC-01: Generate is available before a preview; after success the original topic is read-only until New question clears the topic and preview. PC-01 is no longer an open product decision.
- Preserve the exact approved v1 bytes and existing dated backup. The original draft/pending and proposed-clarification labels record authorship state; this later approval record supersedes those labels without silently altering approved bytes.
- Authorizes technical-design and requirements-to-tests drafts plus independent complete-package specification review. Proposed public test seams are subject to human design/package approval before executable tests or implementation.
- Does not approve the TDD, requirements-to-tests or full package, and does not authorize application/test implementation, commits, live provider/database calls, push, merge or deployment.

## TEST-STRATEGY-UPDATE-01

- Date recorded: 2026-11-05, Asia/Singapore.
- Source: owner instructs “for testing the output of LLM, have an AI agent to test” and “There should still be some hard coded test cases, but evaluation of output should be handled by a test agent”.
- Directs an independent AI test agent to evaluate generated-content quality during feature verification, retaining hard-coded deterministic cases for contracts and application behavior.
- This changes the proposed evaluation method, not the accepted product flow. The approved PRD's general controlled-example quality-review criterion remains applicable and its bytes remain unchanged. Instructor review of each product draft is unchanged.
- Reopens affected TDD/RTT evaluation sections and package specification review. Previously reviewed-v1 hashes and backup remain historical evidence, not approval of these revisions.
- Authorizes revised planning artifacts and targeted independent review. Does not approve the complete design/package, authorize runtime judge functionality or grant application/test implementation or live provider-call permission.

Remaining design/package/implementation approvals: none recorded.
