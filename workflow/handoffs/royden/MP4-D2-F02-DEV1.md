# F02 public integration handoff for Developer 1

Local implementation is on `royden/mp4-d2-f02-publish-question`; no push or merge
has occurred. Coordinate integration before depending on this branch.

- Learner GET `/api/v1/learner/questions[/:id]` requires LEARNER role and selects
  current PUBLISHED questions. Lists contain id/title/topic/instructor display
  name/publication time; detail additionally contains versionId/problem statement/
  buggy code/expected behavior. Private solutions/explanations/provenance and
  author email are excluded.
- Instructor Remove archives while retaining question/version identity and
  existing references. Future learner retrieval excludes archives; already-loaded
  content may remain until refresh. Published question content is immutable.
- Publication requires no hint rows or approval. Developer 1 owns functional hint
  behavior and future shared-contract coordination. Learner detail currently has
  only disabled Get Hint with Coming soon; it sends no request and creates no
  attempt. No hint endpoint/lifecycle contract is promised.
- Additive migration must precede new code. Existing undated archived rows stop
  preflight for owner reconciliation. No live migration/deployment is authorized
  by this handoff.

Local automated verification is green. Manual assistive-technology/visual checks
and remote CI remain pending; no universal content correctness is claimed.
