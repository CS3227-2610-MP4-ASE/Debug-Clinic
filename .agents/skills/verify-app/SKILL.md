---
name: verify-app
description: Verify DebugClinic MP4 application behavior using focused checks, existing Playwright journeys, PostgreSQL integration tests, and bounded repair. Use after behavior changes or to reproduce a UI failure in local synthetic environments.
metadata:
  short-description: Verify MP4 behavior with runtime evidence
---

# Verify app

1. Read `AGENTS.md` and the maintained
   [feature map](../../../workflow/agents/FEATURE_MAP.md). State the observable
   expectation and choose checks from actual `package.json` scripts and nearby
   tests. Respect Developer 2 SDD exclusions when collecting evidence.
2. Run relevant focused unit/API checks and static checks first, using Node 24.
   Use the existing `npm run test:e2e` for UI journeys and
   `npm run test:integration` for an explicitly verified loopback test database.
   `npm run db:verify` owns an isolated PostgreSQL container and runs integration
   checks; inspect its current prerequisites before use. See the feature map for
   coverage limits and stack ownership. There is no `verify:app` wrapper.
3. Exercise user-visible assertions in Playwright or an actual browser. Record
   whether network interactions were mocked, which services were real, viewport,
   commands, pass/fail counts, diagnostics, and evidence paths. A build is static
   evidence; mocked browser tests do not establish real authentication/provider
   behavior. Manual accessibility and responsive RTT cases remain pending until
   performed. Keep unrelated existing processes running.
4. Preserve each failure, diagnose one evidence-backed cause, make a scoped
   repair, and rerun the failed layer. Stop after three meaningful repair attempts
   for the same failure and hand off the blocker with diagnostics. Preserve the
   expected behavior and assertions; changing requirements needs owner approval.
5. Report observed results, cleanup of resources you started, fixes, skipped
   checks, and remaining runtime/CI/provider gaps. Within feature implementation
   authorization, commit coherent verified slices using explicit paths. Broader
   external actions follow their separate authorization.

For changes to this skill, use
[skill evaluation cases](../../../workflow/agents/skill-evaluation.md) and record
results under the [evaluation protocol](../../../workflow/evaluations/royden/protocol.md).
