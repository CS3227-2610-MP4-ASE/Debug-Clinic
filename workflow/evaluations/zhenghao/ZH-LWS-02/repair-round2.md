# ZH-LWS-02 repair round 2 — F5 viewport range

Base: `d8d7a0c` (independent viewport-change acceptance case).

`LearnerWorkspace` now tracks viewport height as React state and passes the
measured height to the shared editor-height clamp. Resize updates viewport and
clamped editor state together. If the editor remains at 180px while the viewport
grows from 600px to 900px, the viewport state still triggers a render and updates
`aria-valuemax` from 180 to 480. Initialization, keyboard, pointer, and resize
paths all use the same viewport-specific bounds. Code, scratch tests, stdin,
reasoning, and output state are untouched.

## Verification

- Node `v24.22.2`.
- `npm test -w @debugclinic/frontend`: 2 files, 9 tests passed.
- Frontend typecheck and repository lint passed.
- Scoped Prettier check and `git diff --check` passed.
- `npm run build` passed, including contracts, backend, frontend, and production
  assets. Vite emitted its existing large-chunk and third-party annotation
  advisories; the build completed successfully.
- The independent browser case is owned by the tester and remains pending for
  the committed repair revision.
