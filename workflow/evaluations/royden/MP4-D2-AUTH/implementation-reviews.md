# Independent authentication implementation reviews

Initial review: exact head `65192525387a5bfdaf26034d9828be4a03694a36`, base approved
snapshot `9011d4664d873789677ca658e397e2f7e2f77a4e`. Three fresh generic agents
received scoped read-only role packets, with no model override or named-runtime
selector. All independently verified the four approved hashes. This record
preserves their actual verdicts; reviewer readiness does not replace owner approval.

| Pass             | Independent agent / thread                                             | Initial verdict              |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------- |
| Functional       | `/root/auth_functional_review`, `01a1a20c-4999-7ac1-8448-4de0a206beee` | Changes required             |
| Coding standards | `/root/auth_standards_review`, `01a1a20c-8761-7d93-90af-568c6f99898d`  | Pass; no actionable findings |
| Security         | `/root/auth_security_review`, `01a1a20c-cae4-7271-a495-ec667d7c4048`   | Changes required             |

## Initial findings and first targeted repair batch

- **AUTH-REV-GUARD-01:** functional P1 / security P2, shared finding.
  `tests/integration/auth-database.test.ts:11–25` validated only URL host/path,
  permitting query overrides and wrong protocols. A pure Node/pg parse, without
  connecting, confirmed a loopback-looking URL's effective host could be remote.
  `tests/support/browser-auth-server.ts:13–25` also checked the direct target but
  connected using a potentially different pooled target. Observed Playwright runs
  explicitly matched them and were safe. Repair requires strict validation before
  any client plus matching direct/runtime fixture targets and hostile-config tests.
- **AUTH-SEC-LOG-01:** security P2. `apps/backend/src/auth/auth.ts:83` configured
  a safe logger, but Better Call's unexpected-error fallback could still print the
  raw exception. The reviewer captured a synthetic non-APIError handler failure
  privately: HTTP500 and exception reached console; no private payload was printed
  in the report. Direct `auth.api.getSession` at `auth/session.ts:26` bypassed an
  HTTP-only wrapper and could reach application raw-error logging. Repair must
  contain actual handler and session exceptions, with console/application/client
  canary regressions. Returning a Response from `onAPIError.onError` alone is
  insufficient because the installed router discards that return value.
- **AUTH-REV-RTT-02:** functional P2 evidence gap, not an observed password defect.
  Reset's explicit 11/12/128/129 policy boundary matrix and preservation of token,
  hash and sessions on rejection were absent; signup-only bounds do not prove it.
  Related targeted gaps: actual Google normalization through its mapper, callback
  role substitution rather than a test title, and deeper keyboard observation.

The builder receives guard, logging and targeted persistence/provider repairs in
one first review batch. Coordinator owns keyboard/built-file evidence. These are
within approved requirements; no product/interface change or new owner decision
is needed. At most two targeted repair/review rounds remain the workflow bound.
No finding is marked closed until the independent repair-head review records it.

## Keyboard observation supplied during round one

Coordinator rebuilt emitted assets and ran the strengthened
`scripts/verify-built-frontend.ts`: 16 exact public route/viewport loads, role-group
Tab entry and ArrowDown/ArrowUp selection, Google→Name→Email→Password→Create account
tab order, focused missing-role alert, and mobile Enter/Escape menu/focus restoration.
It uses an anonymous local API stub, no database or real account input. Semantic
alert/status behavior is checked alongside the separate feedback suite; no human
auditory screen-reader claim is made. The functional reviewer read the script diff
and green raw log and accepted this specific evidence gap once tied to a commit.

## Review limitations and current gate

Reviewers read complete approved artifacts, exact source/test/tool diffs, relevant
installed library seams and available raw static logs. Functional/security used
only safe pure reproductions; they started no database/server and edited nothing.
Standards independently found coherent boundaries, portable declarations, preserved
ESM and unchanged shared contracts/schema. Root's first unit run had an unexpected
worker exit (117/126); the unchanged command rerun alone passed126/126. That failure
is retained rather than counted as green.

Final integrated PG/browser/build/package evidence and targeted independent
re-review are pending. Live Google authorization, SMTP receipt, CI and production
readiness remain approved deferrals or unobserved evidence. Those do not establish
either reported production failure's cause and are not silently marked passed.

## First targeted repair checkpoint

Builder committed `b30c32a29c65caf85828b20b38a907b50a73e4c1`: strict shared test-target
guard before legacy client creation and matching browser direct/runtime targets;
actual handler/fetch exception containment using the installed throw seam, plus
safe session dependency translation; reset boundary/preservation cases for both
credential modes; stock Google mapper normalization; actual callback role-substitution
cases. Writer-local results: 16 focused units, nine focused PG cases (legacy plus
new), full typecheck, backend declarations and scoped lint/format pass. A final
six-case PG rerun also passes. No production/provider operations were performed.

Coordinator's emitted-frontend keyboard regression passes with the deeper M03
observations above. Functional reviewer inspected the actual script diff/log and
accepted that specific gap once committed. Independent closure of the guard,
logging and remaining evidence findings awaits repair-head re-review; this is the
first targeted repair batch, not a waiver of either initial verdict.

## First repair re-review and second targeted batch

At `0174272b7452a229ef5947a49417983935e655d5`, standards independently remains **pass**.
Security changes to **pass**, closing AUTH-SEC-LOG-01 and the shared guard finding.
Its independent database-free reproduction observes handler/fetch safe500 with zero
console calls, expected role400, safe session503 without raw cause, and rejected
hostile direct/pooled targets. It found no new security regression. These are
independent observations, separate from builder assertions.

Functional closes the guard, reset-boundary evidence and related actual Google
mapper/callback-substitution/M03 gaps. Its verdict remains **changes required** for
one new P2, **AUTH-FUNC-CALLBACK-03**: the new catch-all boundary returned JSON500
on a navigational Google callback exception (`auth.ts:406–412`, actual provider-throw
regression at `auth-review-boundaries.test.ts:309–317`). It exposed no sensitive
data, but left the user on an API document without the approved restart/sign-in UI.
AUTH-08-AC3 / G04 requires trusted navigation back to the configured `/auth/error`.

The builder receives the second and final allowed targeted repair batch: known GET
Google/originating-proxy callback failures go only to the configured application
error page; API actions retain safe JSON. Regressions must preserve privacy, deny
unintended sessions and prevent untrusted redirects. This is an in-scope feedback
repair, not a requirement change. Independent closure and final integrated evidence
are pending; initial verdict history remains intact.

## Final independent closure

At application checkpoint `a1645b9d42ccaed896bf94ba571713dbd9eb6a41` all three
independent verdicts are **pass**. Functional closes AUTH-FUNC-CALLBACK-03 after
reviewing actual direct/current-proxy/legacy-proxy failure tests and fixed configured
recovery redirects. Standards finds no regression in the final three-file diff.
Security independently fault-checks all three GET paths without a database/server:
fixed trusted redirect despite hostile hosts/parameters, no cookies, no console/private
payload; POST API actions retain safe JSON. Prior guard/logging/evidence closures remain.
Two targeted repair batches were used; no blocking finding remains.

The functional reviewer independently inspected final coordinator raw results:
142 unit/API,42 real PG,10 complete desktop/mobile journeys,58 feedback passes plus12
explicit skips, full lint/typecheck/format, production build/declarations,16 emitted
route/viewport plus deep keyboard checks, and extracted packaged runtime all pass.
The final ZIP hash was independently compared. [Acceptance](acceptance.md) records
all34 assessed criteria and precise complementary evidence/coverage limits; it does
not claim every frozen catalog permutation was separately run. Live Google/SMTP,
CI and deployed readiness remain the already-authorized external deferrals.
