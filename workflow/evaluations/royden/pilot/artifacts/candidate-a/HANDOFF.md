# Publication guard handoff

Implemented the supplied public `publicationEligibility` function on branch
`candidate-a`. The supplied types and public tests are unchanged.

## Behavior

- Checks authentication, instructor ownership, draft status, then hint validity
  in the required error precedence.
- Requires exactly three hints already ordered by stages 1, 2, 3, each approved
  and containing non-whitespace content.
- Returns exactly the specified success or error object. Does not sort, trim in
  place, mutate inputs, or perform I/O.

## Verification

Commands ran from this fixture directory using Node `v24.14.0`:

| Command | Actual result |
| --- | --- |
| `node --version` | `v24.14.0` |
| `node --test public.test.mjs` before implementation | Exit 1: 0 passed, 2 failed at the supplied placeholder exception |
| `node --test public.test.mjs publication-guard.test.mjs` after implementation | Exit 0: 42 passed, 0 failed, 0 skipped |
| `git diff --check` after implementation and tests | Exit 0, no whitespace errors |

The added 40 focused tests cover competing failure precedence across roles,
ownership, draft/published status and valid/invalid hints; wrong hint counts;
swapped, reversed, duplicate, zero-based and fractional stages; an unapproved,
empty or whitespace-only hint at each position; padded nonempty content; deeply
frozen successful inputs; and input preservation for every failure category.

## Commits

- `85ebae5` — `Implement publication guard and focused policy tests`
- Documentation is committed separately with title
  `Document publication guard verification and limits`.

## Limits and observations

- Inputs are assumed to satisfy the supplied TypeScript interfaces, as directed.
  Transport parsing and malformed runtime shape validation are out of scope.
- Node's built-in TypeScript support executed the tests; a separate TypeScript
  compiler/typecheck was not run and no dependencies were added.
- Node emits `MODULE_TYPELESS_PACKAGE_JSON` while detecting this TypeScript file
  as an ES module. The tests still pass. No parent package configuration was
  changed to suppress that warning.
- This work only implements and tests the assigned synthetic fixture. No product
  integration, provider use, network operations, hidden checks, or other fixture
  inspection was performed. No human approval was requested or claimed.
