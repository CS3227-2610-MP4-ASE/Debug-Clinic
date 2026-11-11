# F01 generate-question paired comparison

This publication copy records the frozen comparison completed on 5 November 2026 (Singapore time). It preserves the final blind scores, common test outcomes, and matched development measurements from the study archive. Raw session telemetry and provider response captures remain in the private experiment archive.

## Design and cutoff

Both conditions started from the same prepared baseline and approved requirements. The multi-agent condition used a coordinator, a code and unit-test writer, and an independent acceptance-test writer who froze their interpretation before seeing the implementation. The single-builder condition used one agent for construction. Both received independent functional, standards, and security review after construction. The observed development setting was `gpt-6.1-sol` with high reasoning effort. Multi ran first. Cache state, host load, and learning across runs were uncontrolled. [Experiment protocol](../../../experiments/MP4-D2-F01/PROTOCOL.md) · [Multi-agent delivery evidence](../../../experiments/MP4-D2-F01/multi/delivery.md)

| Condition      | Frozen reviewed revision                   | Development start (UTC)            | Reviewed cutoff (UTC)              |
| -------------- | ------------------------------------------ | ---------------------------------- | ---------------------------------- |
| Multi-agent    | `7707aeee09af4baa1623ce8449c22cc3a77f53b0` | `2026-11-04T19:19:03.881471+00:00` | `2026-11-04T20:49:53.889257+00:00` |
| Single-builder | `c0bbd5d4629c1add3dfa24e6e2bcd10410a09f16` | `2026-11-05T02:49:06.384520+00:00` | `2026-11-05T03:45:38.058140+00:00` |

## Frozen quality results

Workflow metadata compromised the first blind code review. The final reviewers received fresh contexts and redacted evidence packets. Their judgments were locked at `2026-11-05T04:48:48.911097+00:00`, before the condition labels and resource totals were revealed. The final review labels were C for multi-agent and D for single-builder. The separate live-output labels were B for multi-agent and A for single-builder.

Each final reviewer scored five dimensions from 0 to 2. A score of 2 indicates adequate and traceable evidence, 1 indicates a partial result or material gap, and 0 indicates absent or incorrect evidence. A numeric qualification required at least 8/10 with no zero in correctness or failure/security handling. Substantive blockers could still prevent acceptance.

| Rubric dimension         | Multi delivery | Single delivery | Multi security/standards | Single security/standards |
| ------------------------ | -------------: | --------------: | -----------------------: | ------------------------: |
| Correctness              |              2 |               2 |                        2 |                         2 |
| Failure/security         |              2 |               1 |                        2 |                         1 |
| Test validity            |              2 |               1 |                        2 |                         1 |
| Interface/standards      |              2 |               2 |                        2 |                         1 |
| Handoff/evidence honesty |              2 |               2 |                        2 |                         2 |
| **Final score**          |      **10/10** |        **8/10** |                **10/10** |                  **7/10** |

| Common acceptance evidence                | Multi-agent                    | Single-builder                   |
| ----------------------------------------- | ------------------------------ | -------------------------------- |
| Identical offline probes                  | 46 passed, 0 failed            | 45 passed, 1 failed              |
| Default invocation of opt-in suite guard  | Fail, threw with opt-in absent | Pass, skipped with opt-in absent |
| Live outputs (pass / fail / inconclusive) | 9 / 2 / 0                      | 7 / 4 / 0                        |
| **Common acceptance**                     | **Fail**                       | **Fail**                         |

The single-builder candidate's failing offline probe supplied a selected content string above 32,768 decoded UTF-8 bytes inside an envelope below 65,536 bytes and withheld EOF. At 150 ms under a 1,000 ms deadline it had neither rejected nor cancelled. The multi-agent candidate rejected and cancelled early. The reviewers also identified a 128-character model-metadata restriction in the single-builder candidate that narrowed the approved contract. The delivery reviewer treated it as minor, and the security/standards reviewer treated it as a blocker. The counterexample for that restriction came from source inspection. The separate opt-in guard probe ran after score lock and left the final review scores intact. [Multi-agent transport review and repair](../../../experiments/MP4-D2-F01/multi/reviews.md)

Both frozen candidates used the same `soc-question-v1` prompt and application model for the fixed 11-request live sample. The multi-agent failures were a suitable topic refused as vague and an exercise with two defects and an inconsistent explanation. The single-builder failures were an exercise with no behavioral bug, two refusals of a suitable topic, and an incorrect refusal category for a vague topic. The small batches do not establish an effect of development topology on generated quality. The recorded judgments apply to these frozen candidates, before the subsequent prompt and CI repairs. [Post-experiment repairs](../../../experiments/MP4-D2-F01/post-experiment-repairs/README.md)

## Matched development measurements

The measurement window runs from development start to reviewed readiness and includes candidate construction, development review, and repairs. Preflight, post-review reporting, and the common blind evaluation are outside this window. Wall time comes from the recorded timestamps above. Token totals sum supported unique response observations. Cached input is a subset of input, and reasoning is a subset of output. These counts describe observed usage and supply no billing or quota estimate. [Measurement protocol](../protocol.md) · [Multi-agent per-actor measurements](../../../experiments/MP4-D2-F01/multi/measurements.md)

| Start through reviewed     |    Multi-agent | Single-builder |
| -------------------------- | -------------: | -------------: |
| Wall time (seconds)        |      5,450.008 |      3,391.674 |
| Input tokens               |     73,733,024 |     30,135,856 |
| Cached input tokens        |     72,746,624 |     29,419,904 |
| Uncached input tokens      |        986,400 |        715,952 |
| Output tokens              |        341,640 |        141,683 |
| Reasoning output tokens    |        144,955 |         43,052 |
| **Total observed tokens**  | **74,074,664** | **30,277,539** |
| Supported unique responses |            476 |            218 |

Dividing the multi-agent measurement by the single-builder measurement gives **1.61×** the wall time and **2.45×** the observed tokens. Cached input as a share of input was **98.66%** and **97.62%**. Reasoning as a share of output was **42.43%** and **30.39%**, and as a share of total observed tokens it was **0.196%** and **0.142%**, respectively. These are costs through the reviewed checkpoint for one paired case. The resources required to deliver a candidate that passed common acceptance were unobserved.
