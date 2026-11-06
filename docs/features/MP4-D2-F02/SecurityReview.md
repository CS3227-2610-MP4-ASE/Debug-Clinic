# F02 independent planning security review — round 0

Date: 2026-11-06, Asia/Singapore. Package: **reviewed-v1**.
Verdict: **READY FOR HUMAN PACKAGE REVIEW**. Blocking design-risk findings: **none**.
This is a design/test-plan readiness verdict, **not an implementation-security verdict**.

## Independence and reviewed evidence

Independent Developer 2 generic collaboration agent `/root/f02_security_review`,
thread `01a1ad2c-fe9c-7ab2-af79-575107c4b542`, used the repository
`.codex/agents/security_reviewer.toml` instructions by reference. No named runtime
selector or enforced role sandbox is claimed. The coordinator records the returned
report here; the reviewer wrote no files and did not author or repair the package.

The reviewer read all seven complete frozen source artifacts and independently
matched their SHA-256 values to the review manifest. Source baseline HEAD matched
`982b0641cd45bf8184bca8e623c36b611af9d898`. The complete source manifest and separate
functional/standards verdicts are recorded in [PackageReview](PackageReview.md).
Actual PRD approval and the owner-selected legacy exception were verified through
[ApprovalRecord](ApprovalRecord.md) and [PRDClarifications](PRDClarifications.md).

## Concrete attack/failure paths examined

| Attack or failure path                                                                              | Design disposition and planned evidence                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guessed question/generation IDs, wrong roles, forged owner/status/provenance, cross-origin mutation | TDD §§2–4 requires real session identity, role checks, ownership/current-state predicates, strict input and configured Origin/JSON guards. Foreign/missing owner records share safe404. RTT B09/B22/B32/B33 cover no unauthorized mutation. Selective baseline auth/session/origin source supports the proposed interfaces.                                                          |
| Learner retrieval or hostile rendering reveals solutions/private generation data                    | TDD §3 selects strict public allowlists; §7 uses literal rendering and a separate public renderer. B28/B29/B36 require exact keys and private sentinels absent throughout learner JSON/DOM/errors. Client metadata never becomes authority.                                                                                                                                          |
| Topic substitution or malformed UTF-16 collides during UTF-8 hashing                                | TDD §§3–4 rejects NUL/unpaired surrogates before digest/write and binds normalized topics to owned successful generation. B01/B03/B09/B40 cover mismatch, Unicode and legacy recovery. Old Save remains instructor-reported rather than falsely attesting original model content.                                                                                                    |
| Concurrent Save/Publish mixes content, overwrites stale data or partially exposes a question        | TDD §5 uses parent-first CAS and atomic parent/version writes, with projection validation before commit. B12–B15/B19 require actual PostgreSQL races and a real database fault after parent CAS; mocked transactions are insufficient.                                                                                                                                               |
| Lost response/replay duplicates publication or resurrects archive                                   | TDD §§5–6 retains owner-scoped preview keys, resolves only the named uniqueness race after rollback and returns immutable existing authority including ARCHIVED. B16–B18/B25/B37/B44 cover changed payload, cross-owner key isolation, committed response loss, bounded recovery and archive replay.                                                                                 |
| Uncertain completion silently switches the reviewed snapshot                                        | TDD §§3/6–7 distinguishes NOT_APPLIED/UNKNOWN, freezes captured payload/key/revision and retries the same snapshot. B17/B19/B26 reject assumptions of rollback from HTTP failure.                                                                                                                                                                                                    |
| Expiry destroys edits or leaks a prior instructor's editor across identities                        | TDD §7 retains only a previously admitted disabled editor on expiry, preserves initial anonymous protection and clears the capsule on identity change. B35 separately covers API401, AuthProvider session loss, initial anonymity, logout and another-user sign-in. Existing RoleRoute unmounts on session loss; the proposed change still requires the stated browser verification. |
| Removal deletes referenced content or leaves future learner requests available                      | TDD §5 archives while retaining identity/content/version/key/provenance and references. B25/B27/B37/B41 cover repeated/concurrent removal, reference retention and subsequent learner denial. Already-loaded content follows the owner's accepted allowance.                                                                                                                         |

## Residual implementation-verification obligations

All referenced cases remain **Planned**. Later delivery must establish real
cookies/sessions/origins, PostgreSQL CAS/rollback/replay, safe fault logging,
browser uncertainty/expiry/identity handling and extracted Netlify composition.
These are required evidence obligations already in the package, not observed
passes or accepted implementation risks. Baseline generic error handling can log
raw unexpected errors; proposed safe database-error wrapping and B36 captured-log
checks must be implemented and verified.

Functional hints remain Developer 1-owned and excluded. No F02 hint publication
gate or future hint API is required. No new provider calls or generation policy
are added, so no new live-provider acceptance is demanded; inherited F01
privacy/generation regressions remain applicable. The exact-path formatting
exception creates no additional security finding.

No corrective round is required on the reviewed bytes. No executable tests,
runtime probes, services, network/database/provider/browser calls, builds,
migrations, commits, staging, approvals or deployment were performed. Separate
functional/standards readiness is the specification reviewer's responsibility.
Human package approval, public-seam approval and separate implementation
authorization remain absent.
