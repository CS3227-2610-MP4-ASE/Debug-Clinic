# Review correction: preserve browsing during focus refresh

Date: 2026-11-06, Asia/Singapore. Base `0f24a9cbaa0465e03f8c79b4e42befc4727f53ad`.
Owner supplied the AuthProvider review comment and authorized a direct fix.
**Verdict: valid; fixed.** This follow-up is local; no new push is performed.

## Reproduction and correction

The browser reproduction loads two50-item pages for each role, gates the actual
`/api/v1/me` focus request and lets React paint. Before the fix both desktop
cases failed: the role guard showed Loading your session and unmounted the list.
That destroys `useQuestionList` items/offset, so returning success starts over.
The deterministic gated test directly identifies the loading transition; no
broader hypothesis search, bisection or temporary debug logging was needed.

AuthProvider now uses a private background option for focus revalidation. Public
`refresh()` and initial authentication retain blocking loading, with unchanged
error/expiry policy, response-version checks and logout invalidation. No public
AuthState signature or backend contract changes. RoleRoute keys ordinary
authorized pages by user ID so a confirmed account replacement clears prior page
state; unchanged identities remain mounted. Existing disabled retained-editor
expiry handling and wrong-role denial are preserved.

New `f02-session-refresh.spec.ts` drives AuthProvider, RoleRoute and the real list
hook/pages together with HTTP doubles. For both roles it verifies page-two items
remain visible while a session response is pending, an unchanged session causes
no list reload, Load more continues at offset100, a new account refetches at zero
without old items, and401 redirects to sign-in. Desktop/mobile focused cases4/4
pass after the fix. These are browser-state checks, not real auth-server proof.

## Verification and independent review

Node24.14.0/npm11.9.0; owned alternate browser ports5273/3101. No DB/provider/
live-infrastructure change or connected database command.

- `npm run test:e2e -- tests/e2e/f02-session-refresh.spec.ts --workers=1`:4PASS.
- Full affected desktop/mobile browser command adds session-refresh, F02 owner/
  learner, F01 instructor, auth-feedback, auth-action-feedback and app-shell:
  **126PASS**, including editor retention, identity and logout regressions.
- `npm test`:27files/478PASS. Repository lint, typecheck, formatting and full
  declaration-emitting production build PASS.
- Built frontend verification:16 route/viewport loads plus keyboard/navigation
  checks PASS. Existing nonblocking bundle-size warning remains.

Raw logs: private sibling `.workflow-runs/MP4-D2-F02/implementation/`, prefix
`focus-refresh-`. Original red results remain in the command history/test output.
No assertions were weakened; the pending response is explicitly released even
when a regression assertion fails. Harnesses stop their own browser servers.

Independent read-only `/root/f02_final_spec`: functional PASS, standards PASS.
Independent read-only `/root/f02_security_review`: security PASS, no concrete
finding. Both reviewed the narrow source/test diff and checked initial/manual
loading, identity separation, expiry and request races. They ran no services or
tests; reported execution results are coordinator evidence. Generic scoped
follow-up role packets were used; no per-role sandbox is claimed.

Developer guide, feature map, ledger and reflections were updated. Existing
manual B38/B39 and remote CI limitations remain unperformed and unwaived.
