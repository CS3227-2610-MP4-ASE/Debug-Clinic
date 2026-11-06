# ZH-LWS-02 repair round 1

Implementation commit: `36df16b` (`fix learner workspace runtime and layout`).
The approved compact 40/60 split and light MUI tokens remain in effect. The
independent acceptance file and its helpers were not changed.

## Repairs

- **F1:** Pyodide stdout/stderr use raw UTF-8 writers. The worker retains the
  original Python stream objects before learner code, flushes those streams in
  `finally`, then flushes both UTF-8 decoders before sending the terminal state.
  It does not add a newline to learner output.
- **F2:** Worker and parent count the combined 64 KiB output limit in UTF-8
  bytes, preserve Unicode scalar boundaries, and reserve space for a visible
  truncation notice and incomplete decoder tails. Error text has its own 8 KiB
  UTF-8 bound.
- **F3:** Only resolved runtime bytes are cached. Each pending load has an
  `AbortController`, run ID, and generation; teardown cancels the owning load,
  cancels streaming readers, and stale completions cannot replace newer state.
  Fixed same-origin paths, omitted credentials, redirect denial, and per-asset
  limits are retained.
- **F4:** The question pane is a bounded white surface with a fixed Description,
  published title, and topic header. Problem, Starting code, and Expected
  behavior scroll independently below it using published content.
- **F5:** Initial, pointer, keyboard, and resized editor heights use one clamp.
  Its minimum and maximum are consistent, including short viewports, and resize
  events clamp the current value.

## Verification

- Node `v24.22.2`.
- `npm test -w @debugclinic/frontend`: 2 files, 9 tests passed.
- `npm run typecheck -w @debugclinic/frontend`: passed.
- `npm run lint`: passed.
- Scoped Prettier check and `git diff --check`: passed.
- `npm run build`: passed for deployment metadata, offline Prisma client
  generation, contracts, backend, frontend, and the bundled Pyodide worker.
  Vite reported the existing large-chunk advisory and third-party annotation
  warnings; the build completed successfully.
- A Node probe against the installed Pyodide package verified that flushing the
  captured original stream sends `NO_NEWLINE_OUTPUT` without an added newline.
- The coordinator reported its focused desktop/mobile browser matrix at 12/12
  passing on the preceding version. The captured-original-stream hardening is
  included in `36df16b`, so that result is not treated as verification of this
  exact commit. Independent source-revision verification remains pending.

No database migration, live provider, push, deployment, or independent test-file
change was made.
