# Learner hotfix — independent acceptance

Owner directly authorized implementation on 9 November 2026, waived the original
SDD/stage-conversation process and requested one new Luna/high execution session.
Scope is the six attached hotfix requirements, not the constrained-coaching design.
Base: current master `44b931c58c6d7831974b8837010c3db154ff8d3a`.
Branch: `zh/learner-hotfixes-20261109`. No push, deployment or live AI authority.

These expectations are frozen before reviewing the implementation diff:

| ID     | Independent observable outcome                                                                                                                                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LHF-01 | 100 logical learner requests per rolling ten minutes, across exercises; no daily cap. Verify hundredth/101st, window expiry, earlier same-day usage, concurrent final slot and duplicate replay. Existing non-generation actions remain uncounted.                                                        |
| LHF-02 | Real owner-scoped dashboard counts distinct exercises across versions; final submission takes precedence, in progress is attempted minus completed, and unsaved edits do not count. Resume only accessible current drafts. Deny anonymous/instructor access and cross-learner data. Profile is read-only. |
| LHF-03 | Search has no unwanted black outer frame in normal focus styling while retaining visible keyboard focus, labels, search and paging. Scope styling locally.                                                                                                                                                |
| LHF-04 | Learner Home goes to /learner; workspace to /learner/question. Old plural list redirects with query retained; plural detail and backend URLs remain valid. Instructor/anonymous navigation, safe return-to and dirty-work protection remain correct.                                                      |
| LHF-05 | List/detail loading is visible, accessible, reduced-motion aware and layout-stable. Delayed, stale, failed and retried requests do not erase edits or incorrectly show an empty result.                                                                                                                   |
| LHF-06 | Signed-in branding has no link/button/keyboard navigation action; signed-out branding retains public Home behavior.                                                                                                                                                                                       |

Use focused unit/API/real disposable PostgreSQL tests for quota and dashboard
ownership, affected desktop/mobile browser journeys and a bounded visual pass.
Shared navigation warrants the complete browser regression after focused checks.
Keep existing assertions updated for intentional behavior changes, not removed.
Schema-valid background API doubles must preserve actual auth-expiry coverage.

The coordinator independently reviews functional and coding-standards outcomes
after the sole implementation writer hands off. Record actual checks, mock/real
boundaries and skips. No production mutation, real-provider evaluation or new
profile editing/gamification scope is implied. Keep raw telemetry outside Git.
