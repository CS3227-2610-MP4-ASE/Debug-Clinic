# Grading implementation review

The implementation was independently reviewed on three axes against approved
package v1.1. The first candidate tree was
`25be6fd49ee489e17ac5b30f3f591b4b67faf7d3`, based on approved snapshot
`d4b6f29362660b5dd2804889cff247fa295538ed`. Targeted review used repaired tree
`9f38d1458abf36247d3a723be78d12fb5019b662`.

| Axis             | Initial findings                                                                                                                                                                                                          | Targeted verdict                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Functional       | A schema-valid inconsistent write reply could falsely confirm a score. Repeated titles masked distinguishing link names. Two test triggers did not match the UI. Session and real commit-fault evidence needed expansion. | **Pass** from `/root/grading_functional_final`. |
| Coding standards | Invalid-input test needed an explicit submit. Session checks needed bounded, compatible coalescing. Queue ordering needed a pre-correction assertion. Duplicate titles needed accessible distinction.                     | **Pass** from `/root/grading_standards_final`.  |
| Security         | A peer-tab session change could retain private grading content. Delayed replies, restored-page disposal and real database acknowledgement faults needed coverage.                                                         | **Pass** from `/root/grading_security_final`.   |

The coordinator applied one targeted repair series. The original targeted review
workers were interrupted by a runtime usage limit. Fresh independent reviewers
received the exact repaired tree and the earlier findings. Each reviewer had
read-only scope, inspected the package and applicable role instructions, and
returned a separate verdict without editing the implementation.

The repairs check save replies against the requested score and revision, retain
pending scores until authoritative reconciliation, use native row link names,
bound grading session checks, and invalidate peer grading views before session
revalidation. New tests cover real PostgreSQL BEGIN and COMMIT acknowledgement
loss, same-context peer sign-out, held replies, synthetic persisted lifecycle
events, retry after a stalled session read, and queue order before and after
correction.

The reviewers assessed source and test definitions. Runtime results are reported
separately by the coordinator. Synthetic persisted lifecycle events exercise the
handlers. An actual browser BFCache round trip, manual screen-reader and contrast
observations, hosted load and remote CI require separate evidence.

Two subsequent baseline test repairs are outside that reviewed tree. The
publication test now recognizes the already-delivered learner hint button. The
older migration test accepts PostgreSQL's `23503` or PostgreSQL 18's `23001`
RESTRICT code while continuing to prove that referenced attempts and reviews
survive. The latter failure was reproduced on the unchanged baseline test.
