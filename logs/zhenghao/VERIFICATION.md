# Verification notes for Zhenghao interaction summaries

Audit date: 9 November 2026 (Asia/Singapore).

Audited master: `5d4155b2062cbbb4de558c5794384f674e9b9985`, fetched from `origin/master` before the documentation branch was created.

## Method

Material claims were checked against at least one primary repository record and, where applicable, a second authority:

| Claim type                    | Primary check                                                     | Corroboration or limit                                                                                    |
| ----------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| authorization and decisions   | feature ledger, approval record, or frozen acceptance file        | missing source conversations are labeled; generated packets are not treated as human messages             |
| chronology and implementation | Git commit graph and revision-specific handoffs                   | current source is used later for guide claims                                                             |
| merge status                  | GitHub PR metadata for PRs 1–3 and 10–12                          | merge commits are reachable from audited master; branch tips alone were not used                          |
| model/effort                  | explicitly mapped canonical monitoring report or handoff metadata | role files and requested settings alone are not evidence                                                  |
| tests and failures            | revision-specific testing/verification reports                    | focused reruns are kept separate from full runs; mocks/local PG/remote CI/live provider are distinguished |
| resource numbers              | named generated report and timestamp                              | cached input/reasoning subsets are not added again; cumulative snapshots are not summed                   |
| current capability            | audited `origin/master` source/contracts/tests                    | performed during Task 3; these interaction logs do not themselves prove current behavior                  |

GitHub PR metadata was retrieved read-only on 9 November 2026. It confirmed:

- PRs 1–3 from `zh-infra-setup` merged as `08a3a507`, `36db1353`, and `c5519060`.
- PR #10 from `zh/learner-workspace` merged as `2c372c5a`; final remote `verify` and `browser` checks succeeded, as did the reported Greptile check.
- PR #11 from `zh/learner-chatbot-assistant` merged as `44b931c5`; final remote `verify` and `browser` checks succeeded after the preserved formatting and fixture failures.
- PR #12 from `zh/learner-hotfixes-20261109` merged as `5d4155b2`; final remote `verify` and `browser` checks succeeded.

## Conversation availability

The following exact project conversations were located through committed mappings and checked through Codex thread summaries. This confirms availability and recent outcomes; it is not a claim that every historical turn or tool output was retained or re-read.

| Thread                                 | Source-provided title / role          | Verified use                                               |
| -------------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `01a1af97-daca-7080-9189-d07ba58e8cb0` | Learner workspace — implementation    | ZH-LWS-01 implementation and later IDE repairs             |
| `01a1afbe-797a-7352-bfd5-150343ea1e0b` | Learner workspace — testing           | independent workspace/IDE testing and re-review            |
| `01a1afe6-bebf-7621-ae97-0ad8b565e2d3` | Learner workspace — documentation     | guide/reflection handoffs after green evidence             |
| `01a1b442-630f-7012-b4b8-eef108dad47f` | Check main chat progress              | delegated assistant-plan approval/status check             |
| `01a1b443-00c4-7373-b68b-d9b70cf0c91a` | planning reviewer (title unavailable) | initial and constrained-plan reviews                       |
| `01a1b448-99c6-7861-bd1d-3ea7613baff1` | ZH-CHAT-01 · Implementation           | assistant implementation/repairs and PR #11 fixture repair |
| `01a1b47c-237f-7b01-8bd1-7ee5b1fbf508` | ZH-CHAT-01 · AI security              | independent policy/live evaluation and final block         |
| `01a1beda-5226-7ba1-a257-c50b980b8035` | Learner dashboard and UI hotfixes     | expedited hotfix implementation                            |

The infrastructure episode has no committed conversation/session mapping. The coordinator sessions for ZH-LWS-01/02 and the full documentation/closeout chronology are represented through handoffs and monitoring mappings, but not every parent-thread ID is published. Some session metadata and raw telemetry remain deliberately outside Git. These are retention/access gaps; the summaries do not recreate missing prompts as quotations.

## Known evidence limitations

- Raw personal Codex history was not scanned. Only explicitly mapped project threads were queried.
- One bounded thread-summary request returned an oversized serialized response and was discarded as a source for fine-grained claims; it was repeated one thread at a time with a one-turn bound and locally reduced metadata.
- Sanitized reports diagnose unsupported legacy/unknown record schemas. Missing fields remain unavailable rather than zero.
- Workflow events are coarse checkpoints, not CPU profiles. Silence does not establish waiting, and a recorded wait is not useful computation.
- The assistant's live semantic evaluation used synthetic exercises and the configured service; it is not a universal AI-safety proof. The final recorded result was blocking.
- Local mocked-browser, real local PostgreSQL, packaged Function, remote CI, preview deployment, and live-provider observations are different evidence layers.
- Successful merge or CI status does not erase a documented limitation or prove production behavior.

## Link and content check

All repository-relative Markdown links under `logs/zhenghao/` are checked from their containing file. No raw session transcript, secret, credential value, provider body, or private unrelated message is included. Ordinary prompts are paraphrased; short source titles and exact status labels are retained only where needed for attribution.
