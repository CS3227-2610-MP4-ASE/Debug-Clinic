# Grading integration handoff

Developer 2 implemented manual grading across the instructor and learner
surfaces. The local code checkpoint is `f7ed08b` on
`royden/mp4-d2-f01-grading`.

The learner dashboard links to `/learner/submissions`. Its private result route
uses an attempt ID and remains available for an archived question. The existing
published-question workspace mounts a grade panel only for `FINAL_SUBMITTED`
attempts. The current attempt, question and dashboard wire schemas retain their
existing shape. New grading schemas are exported from
`packages/contracts/src/grading.ts`.

The learner API has list, detail and compact grade GETs under
`/api/v1/learner/submissions`. The compact result is `{ grade: null | { score } }`.
The list exposes grading status, and the detail includes the learner's own final
snapshot. Instructor routes use their own role and question-ownership checks.
The additive `AttemptGrade` table stores the current score independently of
legacy reviews and final attempt content.

The grade panel uses visible-document polling, read deadlines and backoff.
Grading admission disposes old state on route, actor and session changes.
Background session revalidation and peer-session signals are scoped to grading
consumers. Preserve these disposal guards when extending the workspace.

Existing intercepted tests that reach final attempts use
`tests/support/learner-grade-fixture.ts` to answer grade reads. Add a schema-valid
grade response to a new mocked final-answer journey. Real-cookie composed tests
exercise the normal backend instead.

Local Node 24 checks passed, including 551 root tests, 19 frontend tests,
213 PostgreSQL integration cases, 234 ordinary browser passes with 30 expected
opt-in skips, and 16 composed browser passes. Twelve grade visibility observations
were within 15 seconds on desktop/mobile. Manual screen-reader/contrast and
actual BFCache observations, remote CI and hosted deployment/load remain pending.
