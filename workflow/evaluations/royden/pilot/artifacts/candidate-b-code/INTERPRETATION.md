# Frozen acceptance interpretation

This interpretation is based only on `TASK.md`, the supplied TypeScript interfaces,
and the throwing stub in this fixture. It is committed before acceptance tests are
written and before any implementation is made available to this test author.

## Contract and precedence

Inputs satisfy `Actor`, `Hint`, and `Exercise`; malformed transport values and
properties outside those interfaces are out of scope. Call the synchronous public
`publicationEligibility(actor, exercise)` function and compare the entire returned
object with the required literal, so missing fields and additional fields fail.

| Priority | Condition | Exact expected result | Acceptance coverage |
| --- | --- | --- | --- |
| 1 | Actor is `null` | `{ok:false,code:'UNAUTHENTICATED'}` | Both statuses, valid/invalid hints; ownership cannot override authentication. |
| 2 | Actor is a learner, or instructor ID differs from owner ID | `{ok:false,code:'FORBIDDEN'}` | Owner learner, foreign learner, foreign instructor; both statuses and valid/invalid hints. |
| 3 | Owning instructor, status `PUBLISHED` | `{ok:false,code:'CONFLICT'}` | Valid and invalid hints, including invalid length, order, approval, and content. |
| 4 | Owning instructor, draft, invalid hint collection | `{ok:false,code:'INVALID_HINTS'}` | Each invalid hint category below, including combinations. |
| 5 | Owning instructor, draft, valid hint collection | `{ok:true}` | Ordinary text and text padded with whitespace; content is validated using trim without rewriting it. |

Actor and owner IDs are compared as supplied, without case folding or trimming.
All combinations of actor category, supported status, and valid/invalid hint state
will exercise the precedence ordering. Additional malformed-hint cases target the
owning instructor's draft, where hint validation determines the result.

## Hint cases

- Exactly three entries are required: empty, one, two, and four entries fail.
- Array positions must have stages `1`, `2`, `3`, respectively. Every other
  permutation fails; duplicates, zero, out-of-range, and fractional stages fail.
  Invalid order must never be sorted into validity.
- Each entry must have `approved === true`; a `false` at any position fails.
  Non-boolean approval values are outside the supplied interface.
- Each entry's `content.trim()` must be nonempty. Empty strings, ASCII whitespace,
  and JavaScript-trimmable Unicode whitespace fail at every position. A nonempty
  string with surrounding whitespace succeeds and remains unchanged in the input.
- Multiple defects remain `INVALID_HINTS`, unless an earlier authentication,
  authorization, or status condition determines the result.

## Preservation, public surface, and limits

Snapshot and compare both inputs across successful and unsuccessful decisions,
including invalid ordering. Repeat the same call to check stable results. Run
representative calls with recursively frozen inputs to detect attempted writes.
The runtime module must expose only `publicationEligibility`; TypeScript-only
exports are erased and are not additional runtime exports.

The suite uses Node 24's built-in `node:test` and `node:assert/strict` and imports
only the supplied public module. It does not inspect implementation source, use
dependencies, execute Python, or contact providers. Runtime black-box checks do
not prove the complete absence of I/O on every possible execution; input
preservation and deterministic calls provide focused observable purity checks.

## Expected baseline and handoff

The supplied implementation always throws `Error('Implement the synthetic task')`.
Behavioral tests are therefore expected to be red before independent implementation
integration. Record the actual Node version, command, exit code, counts, and
failure cause honestly in `TEST-HANDOFF.md`; an expected-red result is not a passing
checkpoint. The coordinator owns integration and the final passing checkpoint.
