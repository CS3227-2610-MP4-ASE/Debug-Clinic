# MP4 workflow bootstrap handoff

Date: 3 November 2026. Contributor: Royden / Developer 2.
Branch: `royden/mp4-agent-workflow`.
Exact parent: `c551906083201ee1d54b942721570ef16b6586e2` (`master`, clean at start).

## Authorization and scope

Owner reference: this chat's **“PLEASE IMPLEMENT THIS PLAN: MP4: autonomous
delivery with measurable agent coordination”** request, following the completed
workflow grilling. It authorizes workflow/tooling, local incremental commits and
four synthetic runs. This is bootstrap from an explicitly approved implementation
plan, not a claim that a product Mission Brief/PRD/TDD package exists or that the
synthetic drafts received human approval. No first application feature was
authorized or started. Future feature work follows the installed SDD gates.

Owned changes: project skills/role instructions, runbook/standards/templates,
Python monitor and tests, CI test wiring, pilot fixture/evaluator tools and
derived evidence, reflection/log/handoff, and developer navigation references.
Application APIs/schema/behavior and host settings are unchanged.

## Recovery and commits

| Integrated commit | Meaningful slice / evidence                                           |
| ----------------- | --------------------------------------------------------------------- |
| `f0f7377`         | Freeze protocol and synthetic fixture generator before dispatch       |
| `b3aa884`         | Held-out grader; reference 12/12 and throwing stub 0/12 self-test     |
| `88cfb7d`         | First monitor implementation; 23 passing tests                        |
| `2c85fa9`         | Skills, ten roles, runbook/standards/templates; structural checks     |
| `1ecd976`         | Bounds, private-state validation, locking, task budgets; 28 tests     |
| `65c8ffe`         | Monitoring guide, explicit PRD gate, assigned reflections, CI command |
| `73ada5c`         | Five independent findings repaired; 34 passing tests                  |
| `f2b202f`         | Exact synthetic output snapshots, hashes and formatting integration   |

Writer branches: `royden/mp4-workflow-docs` and `royden/mp4-workflow-monitor`.
They used separate worktrees; their commits were cherry-picked at clean
checkpoints. Actual dispatch used generic agents with scoped instructions and
fresh context, without a named TOML selector or model override. Synthetic commit
history is separate and listed in the pilot report. Later evidence/format commits
are discoverable from this branch's Git log; this file does not recursively
record the SHA of the commit containing itself.

## Verification and review

- Python 3.14.3 / Node 24.14.0 observed; no dependency changes.
- `python -B -m unittest discover -s tests/workflow -v`: 34/34 pass.
- Both skill-creator positive validations pass; writer's negative description
  fixture rejected. Ten role TOMLs parse; integrated links checked.
- Pilot grader passing/failing self-test observed; both delivery candidates
  pass the identical 12 held-out checks. Integrated parallel suite: 141/141.
- Independent review required one correction round and two review passes;
  final functional/standards/scoped-security verdicts pass. See the review record.
- All four actual pilot conditions completed; blind scoring preceded resource
  interpretation. Qualifying scores: single 10, parallel 9, ordinary planning 8,
  grill-me planning 10. These are exploratory outcomes, not a general ranking.
- Pinned Prettier 3.6.2 is used for formatting/checks; exact participant archives
  are deliberately ignored and byte-hashed instead.
- Normal full `prettier --check .`: pass after Git LF checkout alignment matching
  `.editorconfig`; normalized baseline source content remains unchanged.

The monitoring snapshot is explicitly bounded; final documentation/commit work
after cutoff is excluded. Original raw sessions, manifests and state stay outside
Git in the local `.workflow-runs` tree. Derived reports contain allowlisted
metadata. Keep missing metrics, unknown schemas and limits visible.

## Next authorized action and remaining evidence

The routing policy is installed: one builder for small/coupled work, parallel
writers for stable interfaces and enough independent acceptance work. Require the
coordinator's exact integrated verification command in the final handoff.

The next product feature needs scope/PRD/package approvals and separate
implementation authorization. No product feature definition is silently inferred
from the synthetic pilot. Controlled real-provider/app/database/browser checks
belong to those features. Hosted CI has not been observed. No push, PR, merge or
deployment was performed. Python collection is invocation-based, cumulative-only
legacy logs and aggregate tool totals are unsupported, and role scopes remain
instructions rather than OS sandbox enforcement.
