# Candidate B acceptance-test handoff

## Scope and independence

Work was confined to this assigned `candidate-b-tests` fixture, on branch
`candidate-b-tests`. The only authored files are `INTERPRETATION.md`,
`acceptance.test.mjs`, and this handoff. `publication-guard.ts` and
`public.test.mjs` were read as the supplied baseline and were not changed. No
independent implementation, other worktree, product source, evaluator, hidden
checks, or private fixture data was read. No dependencies, network services,
provider calls, or Python were used.

The interpretation was committed before the acceptance test file was created.
Tests import the public function and module exports; they do not inspect function
source or rely on private implementation details.

## Commits

- `f6efbee` — Freeze publication guard acceptance interpretation.
  Contains only `INTERPRETATION.md`.
- `1c7a7a3` — Add publication guard black-box acceptance coverage.
  Contains only `acceptance.test.mjs`.
- The subsequent handoff commit contains only `TEST-HANDOFF.md`; its hash is
  reported with the final delivery, avoiding a self-referential commit hash.

Apply these commits in that order. The independent implementation can then be
integrated by the coordinator, who owns the passing checkpoint.

## Commands and observed results

All commands ran in this fixture with Node `v24.14.0`.

| Command | Exit | Observed result |
| --- | --- | --- |
| `node --check acceptance.test.mjs` | 0 | JavaScript syntax check passed. |
| `git diff --check` | 0 | No whitespace errors in the tracked diff at that checkpoint. The test file was still untracked then, so the final committed range is checked again before delivery. |
| `node --test public.test.mjs acceptance.test.mjs` | 1 | Expected red against the original throwing stub. Runtime public-surface check passed; behavioral tests failed. |
| `node --test --test-reporter=tap public.test.mjs acceptance.test.mjs` | 1 | 110 tests: 1 passed, 109 failed, 0 cancelled, 0 skipped, 0 todo. All 109 failures reported `Implement the synthetic task`. |

The TAP reporter rerun provided machine-readable counts and confirmed the common
failure cause. There are 108 additional acceptance tests and two unchanged public
tests. The only passing baseline test checks the runtime export surface. **This
is an expected-red baseline, not a passing implementation checkpoint.**

Node emitted `MODULE_TYPELESS_PACKAGE_JSON` while loading the supplied TypeScript
module and reparsed it as an ES module. It still executed the tests. No package
configuration was changed to suppress this warning.

## Coverage

- A fixed 20-case matrix checks all combinations of five actor categories, both
  supported statuses, and valid/invalid hints. It compares exact result objects.
- Owner IDs differing in case or surrounding whitespace are forbidden.
- Thirty-three malformed hint collections cover cardinality, all five wrong
  permutations, duplicate/out-of-range/fractional/nonfinite stages, false approval
  at each position, empty/ASCII-whitespace/Unicode-whitespace content at each
  position, and combined defects. Each is rejected on an eligible draft and is
  subordinate to the conflict decision on a published exercise.
- Valid padded content at each position, multiline/non-ASCII text, and the string
  `0` are accepted.
- Seven representative decision/input cases are called repeatedly and compared
  with snapshots, including reference and order checks. The same seven cases use
  recursively frozen inputs to detect writes, including sorting and trimming.
- Runtime exports contain only `publicationEligibility`.

## Limitations and integration checkpoint

Tests exercise only inputs satisfying the supplied TypeScript interfaces. They do
not cover malformed transport input. They are synchronous black-box checks and do
not prove absence of every possible I/O operation or mutation on every possible
input. No attempt was made to patch built-in I/O functions or read implementation
source. The throwing baseline establishes that the tests load and execute, not
that all assertions have been demonstrated against a compliant implementation.

After integrating the independent implementation, run:

```powershell
node --test public.test.mjs acceptance.test.mjs
```

The expected passing checkpoint is 110 tests passed, zero failures. Investigate
any failure against the frozen interpretation and original task before changing
the contract or the tests.
