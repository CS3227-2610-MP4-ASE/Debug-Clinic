# Authentication completion: package for approval

Package ID: MP4-D2-AUTH-20261103-R2.
Status: independently reviewed; awaiting human package approval and local implementation authorization.

## What approval covers

- Public Learner/Instructor choice at initial password or Google registration; existing roles remain unchanged.
- One normalized email, one identity and one role; both login methods after verified ownership.
- Verification/resend, forgot/reset-password and Google-first password establishment, with safe feedback/retry.
- Existing Better Auth foundation, server-bound Google intent, identity/role protections, atomic recovery and canonicalization collision safeguards.
- Local implementation, meaningful tests, independent functional/standards/security reviews, guides/evidence, local commits and a Dev 1-safe handoff.

Production configuration/data operations, live Google/SMTP checks, push/merge/deployment are excluded from local implementation authorization. Dev 1 owns production diagnosis and those separately authorized operations; no Netlify membership or credentials are needed from this user.

## Read the exact package

1. [Mission Brief](../../mission-brief/MP4-D2-AUTH-authentication-completion.md)
2. [PRD: 10 requirements and 34 acceptance criteria](PRD.md)
3. [Technical design and proposed authentication interfaces](TDD.md)
4. [Requirements-to-Tests: 34/34 mapped criteria](RequirementsToTests.md)

[Independent review](PackageReview.md) closed two documentation findings after targeted correction. [Current feature ledger](../../../workflow/handoffs/royden/MP4-D2-AUTH.md) records provenance, ownership, exact hashes, backups and remaining gates. Document status headers retain authorship checkpoints; the ledger/owner approval record controls current authority. Do not modify approved artifact bytes merely to change a status label.

## Exact approval binding

| Artifact                                 | SHA-256                                                          |
| ---------------------------------------- | ---------------------------------------------------------------- |
| MP4-D2-AUTH-authentication-completion.md | ccddec27d430a987967048fb4b7ea92e91f616515efd426a4c5c259253b05046 |
| PRD.md                                   | 22fc03d11f48a5baa08cd92efec11fb958a6f7bfe0d8fb3d529b30bc437bdfa4 |
| TDD.md                                   | 1f61afd158095b797d05cdcae666dd91e1d061fc291d4f619f628a670a1bcc5a |
| RequirementsToTests.md                   | 440fc7567d9ec9c42b063819c5a4744a6c065b76d2109e7c4caed3a0c5978fdc |

Approval of the package includes the TDD's explicit auth wire/routing/dependency changes: registrationRole on password signup, explicit Google registration admission, recovery/result routes, direct compatible Better Auth core dependency and the owner-gated canonicalization utility. Existing shared Role/CurrentUser/Profile exports and schema models stay unchanged. Production data transition is a future owner operation, not automatic execution by the local builder.

## Existing local checkpoint versus pending feature

Prerequisite commit441838145f719f02810737fc435c4b59c2682901 on royden/auth-prerequisites repairs test origins/startup/isolation. Full unit/API suite114/114, lint/typecheck/format, two real local desktop/mobile password journeys and an extra isolation rerun passed; independent functional/standards review passed. Full authentication feature cases remain planned. Production readiness503 cause remains unknown; Google/SMTP remain unverified.

## Two distinct owner decisions

1. Approve this complete package ID and its four exact artifact hashes.
2. Separately authorize local implementation of that approved package: code/tests/docs, routine repair, independent reviews, local meaningful commits and handoff. Start only if the package is approved.

Both decisions may be expressed as separate clauses in one reply. The initial broad implementation request records intent, but does not retroactively approve artifacts that did not yet exist. After approval, copy exact bytes into the feature worktree, verify the dated external backup, and commit the approved snapshot before dependent feature code.
