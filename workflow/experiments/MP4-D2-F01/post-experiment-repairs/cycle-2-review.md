PASS — targeted database-identity correction.

`tests/integration/f01-drafts.test.ts:149` now compares the actual `current_database()` result with the decoded database name from the same configured URL passed to Prisma. Decoding correctly handles URL-encoded database-name characters. The query and strict equality assertion remain; validation still occurs before client construction and requires an explicit loopback PostgreSQL `_test` URL without query or fragment. No safety guard is weakened and no production or CI configuration changes appear in this diff.

The coordinator reports the focused case passes on both database names; I did not rerun it. My earlier portability review missed this hardcoded assertion. This verdict covers only the second-cycle correction, not whole-PR or hosted-CI readiness.
