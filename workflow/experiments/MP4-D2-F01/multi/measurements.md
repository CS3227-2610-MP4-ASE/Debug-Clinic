# Context and resource measurements

Observed as of `2026-11-04T20:49:54.901011+00:00`. All six mapped role sessions are included; raw telemetry remains outside Git.

Start-to-candidate: 2857.945s. Start-to-reviewed: 5450.008s. Candidate-to-reviewed: 2592.063s.
Summed logical agent spans: 10823.496s, separate from overlapping wall time. Exact UTC boundaries/intervals are in measurements.json; Singapore is UTC+08:00.

| Actor             |    Input | Cached input subset | Uncached input | Output | Reasoning output subset |    Total |
| ----------------- | -------: | ------------------: | -------------: | -----: | ----------------------: | -------: |
| acceptance        | 13991725 |            13833728 |         157997 |  81132 |                   23135 | 14072857 |
| coordinator       | 40692499 |            40486016 |         206483 | 175715 |                  100152 | 40868214 |
| functional-review |  5284492 |             5115264 |         169228 |  13045 |                    4076 |  5297537 |
| implementer       |  7483894 |             7366528 |         117366 |  51253 |                   10988 |  7535147 |
| security-review   |  2741680 |             2583680 |         158000 |  10777 |                    4085 |  2752457 |
| standards-review  |  3538734 |             3361408 |         177326 |   9718 |                    2519 |  3548452 |

Development total: **74,074,664**; cached input 72,746,624; uncached input 986,400; output 341,640, including reasoning subset 144,955. Original soft estimate 5,000,000 remains exceeded and visible. Two-hour wall estimate is not an acceptance waiver.

Context journal: 339 reads, 178 distinct file-hash/ranges, 13 within-actor repeats, 148 cross-actor reuse, 2,472,544 emitted bytes. Range aggregates are in retrieval-ranges.json; original timestamped journals stay private.

Four coded clarification topics concerned constructor spelling, log access, exact-diff access and dashboard label. All resolved; material owner product decisions/waits: zero. Recorded note counters are a different, incomplete proxy for actual messages. No missing requirement was privately added for a later condition.

Context-linked rework: a guidance regex and five browser locator groups assumed text/DOM details beyond the frozen requirements; public rendered facts repaired them without implementation exposure. The test-only Request/Response API mistake was caught at runtime and checked against installed types. The JS-length and two transport defects were implementation/test coverage defects, not changed scope.

Qualitative overhead: the coordinator's full historical planning-ledger read included superseded metrics; focused current-gate retrieval could avoid that material. Truncation recovery, allowlist failures and one receipt-lock collision added retrieval work. Independent actors intentionally reused frozen requirements; repeats alone are not waste. Stable-prefix cached input is counted repeatedly, so file bytes cannot explain exact token totals or context occupancy.

Two initial receipt archives contain one extra final newline relative to sender intent; both versions/hashes are preserved. Reviewer packets match sender-declared bytes. Host-encrypted message arguments prevent independent plaintext transport-byte comparison; no decryption was attempted and no opaque argument content is retained in Git. Root chat began at the parent directory; every assigned command selected its own worktree explicitly.

All unavailable/unknown measurements remain unavailable. Application-provider usage is a separate dataset: zero live calls, no observed live token counts, and synthetic/null/Int32-bound fixture values do not represent consumption. Legacy cumulative/unknown record diagnostics remain in resources/report.json. Final semantic calibration/evaluation and qualifying blind scores remain pending after both candidates freeze with separate authorization.
