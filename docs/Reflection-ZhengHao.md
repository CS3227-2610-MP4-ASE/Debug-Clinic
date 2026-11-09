# Reflection on AI-Assisted Software Engineering

> This reflection was polished with AI, but the opinions, decisions, and lessons are my own. I checked the examples and measurements against the project's committed handoffs, reports, Git history, and merged PRs instead of treating a generated summary as evidence.

I used AI throughout DebugClinic's planning, implementation, review, testing, repair, and documentation. My main lesson is that adding agents does not automatically create a better engineering process. The useful part was the structure around them: a coordinator, narrow ownership, explicit evidence, and a rule that a green implementation handoff was not the same as independent acceptance. The cost was substantial context, waiting, and orchestration overhead. I would use the same structure again for high-risk work, but not for every fix.

## Multi-Agent Software Engineering

### How I coordinated the work

I used a master-worker pattern. I acted through a coordinator that kept the approved scope, assigned bounded work to specialist conversations, reviewed their handoffs, and decided whether to repair, recheck, document, or stop. My stage prompts normally named the product context, requirements, non-goals, authorization, owned files, acceptance criteria, runtime, evidence destination, and next handoff.

The learner workspace is the clearest example. After I approved the plan, the coordinator created one implementation conversation, one independent testing conversation, and one documentation conversation. The implementation agent used GPT-6 Luna/medium; the tester and coordinator used GPT-6.1 Sol/high; the documentation agent used Luna/medium. The same conversations were reused for the browser Python IDE and later repair rounds instead of creating a new chat for every issue. Testing started after the implementation handoff, repairs returned to the same implementer, re-review returned to the same tester, and documentation started after the tested revision was green.

That means most of my workflow was sequential specialization, not genuine parallel implementation. The agents had separate responsibilities, but they were usually waiting on a dependency rather than editing different parts of the product simultaneously. Parallel work only makes sense when interfaces and write paths are stable enough to avoid conflicts. For tightly coupled learner-workspace changes, one writer plus an independent test owner was safer.

The process was specification-driven but adapted to the size of the task:

1. I clarified requirements and non-goals, recorded decisions, and approved the scope.
2. The coordinator prepared a scoped implementation packet with ownership and checks.
3. One implementer changed the product and wrote focused tests.
4. An independent tester froze its interpretation before reviewing the implementation, then ran acceptance, standards, and security checks.
5. Findings went back as one bounded repair packet. The same tester rechecked the repaired revision.
6. I used the handoffs, local/manual observations, remote CI, and Greptile status where available before accepting documentation claims.

For PR #10, the final GitHub record showed successful `verify`, `browser`, preview, and Greptile checks. I still did not treat a successful status badge as proof of every claim. The local reports distinguished deterministic tests, real disposable PostgreSQL checks, mocked browser journeys, packaged Function checks, and remote CI. That distinction mattered because an earlier local full browser run for the Python IDE still contained three harness failures even though the affected final cases and later remote run passed.

### How I verified coordination

The coordinator did not rely on “the worker says it is done.” Each assignment had an exact base revision, owned paths, dependencies, model request, soft budget, and evidence destination. Handoffs recorded the resulting revision, changed scope, checks and outcomes, open findings, limitations, and next authorized action. For important transitions, the coordinator inspected Git status and commit hashes, checked the mapped conversation's runtime metadata, and compared the handoff to actual command results.

Triggering was observable. The learner workspace used fresh `create_thread` calls for implementation, testing, and documentation. Later work resumed those same conversations through targeted messages. The chatbot flow used separate implementation, planning-review, and AI-security conversations. Role files supplied instructions, but they did not prove that a named runtime role or model had been selected; the reports used actual mapped session metadata when available.

Shared resources also needed owners. The coordinator owned disposable PostgreSQL containers, integration ports, telemetry state, and final integration evidence. The implementer owned product source and focused tests. The independent tester owned frozen acceptance cases and review reports. Browser test files were frozen while a suite was running, because a retry can otherwise load a different definition. These boundaries prevented two agents from “fixing” the same failing test in incompatible ways.

The handoffs were more useful than raw transcripts because they carried the state another agent actually needed:

- exact base/head revision and branch;
- approved scope and later decisions;
- public contracts and owned paths;
- commands, runtimes, pass/fail counts, and evidence boundaries;
- unresolved findings, retries, and limitations;
- cleanup responsibility and the next authorized action.

I would keep this format. A transcript contains much more text, but it is worse as a recovery artifact because the next agent has to rediscover which decisions survived.

### Waiting, overload, and retries

The coordinator sometimes stayed active while waiting for a worker or owner decision, but waiting was not useful computation. The ZH-LWS-01 planning task recorded 5,632.796 seconds of dependency wait and 506.504 seconds of owner wait, alongside 519.741 seconds of summed active-agent time. The chatbot AI-security task recorded 15,918.332 seconds of dependency wait and 846.624 seconds of active-agent time; its planning task separately recorded 1,185.623 seconds of owner wait. These are workflow events, not a CPU profile. They also do not show that every wait consumed tokens: compact polling turns used context, but silence by itself is not a token measurement.

Several retries were valuable because they exposed real defects:

- Independent learner-workspace testing found async save/navigation races and a publication-eligibility gap after the builder's focused checks were green.
- PR #10 CI failed during Playwright collection because an opt-in file created Prisma at module load. A skipped test still evaluates its module, so the repair moved initialization into guarded setup and added no-database collection coverage.
- The Python IDE needed two review/repair rounds for UTF-8 output bounds, cancelled initialization, layout, and a stale viewport-dependent accessibility range.
- The chatbot's first six live calls exposed solution disclosure. Two source correction rounds improved the known policy cases, but the final live check still produced an encoded complete solution, so the security reviewer correctly blocked the feature.

Other work was avoidable or was caused by the harness. A Playwright locator click could auto-scroll a clipped element and made an action look reachable; a stronger pointer/hit-area test corrected that conclusion. During Python-worker debugging, JSON-escaped logs led to a wrong double-escaping hypothesis until character values were inspected. PR #11's browser run expanded to 78 failures, 130 passes, and 20 skips because a new background assistant read was missing from old fixtures; one strict schema-valid mock fixed the common cause. The hotfix's full browser run found five failures, but the final local evidence used targeted reruns rather than rerunning the whole suite again. That saved another broad run, but no report measured the tokens or time saved by that decision.

### Disagreements and review findings

I did not personally encounter a genuine agent disagreement over requirements or ownership. The records contain many “changes required” verdicts, but those were defect reports, not disagreements. The tester and security reviewer were doing their assigned jobs when they rejected a revision.

The closest case was a conflicting conclusion during PR #10 layout testing: an intermediate harness result was announced as a product defect, then a consolidated reproduction showed that the test's visibility threshold was unsupported. The conclusion was corrected and the project instructions were updated. I see that as evidence-reconciliation, not an agent dispute. If a real disagreement occurs in future, I would freeze both interpretations, trace each to the approved requirement, and ask the coordinator or owner to decide before changing code or tests.

### Did coordination pay off?

For complex work, I think it did. Independent review found defects that the implementation agent's own tests missed, including lost-reply recovery, disposed-session races, Python runtime output/cancellation problems, and assistant solution disclosure. The repair/recheck cycles produced stronger regression tests and more honest limitations.

The evidence does not support a controlled causal claim that multiple agents were better or cheaper. There was no equivalent single-agent run with the same requirements and quality bar. Planning/coordination was the highest-token task in the learner workspace, Python IDE, and chatbot reports. The workflow improved traceability and defect discovery, but it also created handoff, monitoring, repeated-context, and waiting costs.

My rule going forward is:

- Use multiple agents for complex or security-sensitive features, independent acceptance, or work with stable interfaces and safely disjoint ownership.
- Use a coordinator plus one implementer for a bounded but meaningful hotfix, with the coordinator independently verifying the highest-risk paths.
- Use one agent for simple documentation or mechanical changes when independent review would add more handoff cost than risk reduction.

The six-item learner hotfix illustrates the smaller workflow. I used one new Luna/high implementation conversation and the existing Sol/high coordinator. This was enough to find and repair dashboard eligibility ordering, browser races, and CI screenshot portability without recreating the full workspace topology.

## Context Engineering and Resource-Aware Use

### How I structured prompts

My better prompts were not just long; they were structured. I supplied the product goal, current revision, requirements, non-goals, authorization, ownership, known contracts, acceptance criteria, runtime constraints, and the expected handoff. This reduced the chance that an agent would invent a feature, touch another contributor's files, or confuse a proposal with delivered behavior.

I supplied stable, decision-heavy information upfront: role boundaries, routes, security invariants, current approval, owned paths, and what must not change. I asked agents to retrieve volatile or local detail on demand: current source, nearby tests, package scripts, exact labels, installed runtime, Git state, and the latest failure output. Supplying a full source dump would have made the important constraints harder to find and would have gone stale as soon as another repair committed.

The learner assistant prompt is a good example. Upfront context specified selected code/reasoning/output consent, server-owned progression, private learner/version history, quotas, idempotency, retention, and semantic security evaluation. The implementation agent then inspected the current provider, attempt service, and shared contracts as needed. The later security reviewer received the frozen policy objectives and synthetic fixtures, not the entire planning transcript.

### Skills and what they actually contributed

I adopted Impeccable as an external UI/design skill. I used its context and mechanical detector alongside desktop/mobile inspection for focus, navigation, layout, and loading states. The detector returning no findings was only a structural signal; it did not prove good UX or accessibility. The repository history does not show that I authored Impeccable, so I do not claim that.

I also used the project-local `verify-app` skill to choose focused checks, distinguish mocked browser behavior from real local PostgreSQL/package evidence, retain failures, and bound repair attempts. Repository history attributes that skill to Royden's workflow commits, not to me. My own customization was the Zhenghao reporting add-on: commits `00451039` and `69d3a30e` added `scripts/zhenghao_workflow_report.py`, its tests, and contributor-specific output paths without changing the canonical monitor. That add-on is a reporting tool, not a claim that I created either skill.

### Context growth, compaction, and handoffs

My concern with long conversations was losing requirements as context grew. The records show context compaction and very large repeated-context totals in long-lived sessions, but compaction alone does not prove degraded performance. I found no verified case where a requirement was lost specifically because of compaction. The observed defects had more concrete causes: missing fixture coverage, module-load side effects, async races, or incorrect runtime assumptions.

There were still warning signals that context had become inefficient: soft budgets were exceeded, the same files were explored repeatedly, output batches were truncated, and coordination buckets became much larger than the actual implementation output. My response was to persist decisions and handoffs, send smaller repair packets, reuse exact evidence paths, and ask for bounded reads. These actions reduce rediscovery risk. They are not the same as platform “persisted reasoning”; I have no verified evidence that private reasoning was persisted and reused, so I do not claim a saving from it.

### Model choice and what the measurements say

My intended strategy was GPT-6.1 Sol/high for planning, coordination, independent security/testing, and documentation, with Luna medium/high for clear implementation work. Actual routing varied by stage and was checked separately:

- ZH-LWS-01/02: coordinator and tester were Sol/high; implementer and documentation writer were Luna/medium.
- ZH-CHAT-01: coordinator, planning reviewer, and security reviewer were Sol/high; implementer was Luna/medium; testing and release documentation were not dispatched after the security block.
- ZH-LHF-01: coordinator was Sol/high and the single implementer was Luna/high.
- This final documentation rewrite requested GPT-6.1 Sol/high, but the current environment did not expose a trustworthy runtime selector to verify that setting, so I record it as requested rather than observed.

I expected the Luna implementation stages to use fewer resources and finish faster. The measurements do not prove that expectation. All recorded soft token estimates were exceeded, and there is no comparable Sol-only implementation with the same scope and quality outcome. A cheaper model also does not necessarily use fewer tokens or less elapsed time. Without applicable pricing and matched runs, I cannot claim cost savings.

### Monitoring, cache misses, and reasoning percentages

The canonical `workflow_monitor.py` used explicitly mapped project sessions, task IDs, `since` bounds, stage budgets, model checkpoints, and workflow events. My reporting add-on generated cache-miss, reasoning-share, task-share, and highest-token-task views under `workflow/evaluations/zhenghao/`. Raw manifests and telemetry remained outside Git.

The latest bounded checkpoint for each episode is summarized below. These snapshots belong to different workflows and must not be summed as if they were independent billing records or compared as controlled experiments.

| Workflow checkpoint (UTC)       | Total observed tokens | Highest-token task                | Cache hit | Important limitation                                          |
| ------------------------------- | --------------------: | --------------------------------- | --------: | ------------------------------------------------------------- |
| ZH-LWS-01, 2026-11-06 08:18:28  |           105,881,646 | planning/coordination: 61,000,402 |    99.05% | includes approval, integration, environment work, and polling |
| ZH-LWS-02, 2026-11-06 15:23:41  |           173,776,547 | planning/coordination: 90,845,331 |    99.04% | coordinator prototypes and follow-up are included             |
| ZH-CHAT-01, 2026-11-07 09:30:59 |           148,861,591 | planning/coordination: 85,150,953 |    98.89% | testing/documentation usage was unavailable                   |
| ZH-LHF-01, 2026-11-09 06:36:26  |            55,524,880 | implementation: 28,843,177        |    99.09% | verification includes coordination/documentation overhead     |

High cache-hit ratios did not prevent high raw totals. Cached input is already included in input, so adding it again would double-count. Cache misses can be reduced by keeping stable instructions stable, using smaller scoped packets, and retrieving only the relevant source. However, these reports do not contain a quality-matched before/after experiment, so the actual reduction remains unknown.

For one named task, the ZH-LHF-01 **implementation** checkpoint generated at **2026-11-09 06:36:26 UTC** recorded:

- reasoning output / total output = **42,617 / 103,597 = 41.14%**;
- reasoning output / total tokens = **42,617 / 28,843,177 = 0.1478%**.

The source is [`workflow/evaluations/zhenghao/ZH-LHF-01/monitoring/report.json`](../workflow/evaluations/zhenghao/ZH-LHF-01/monitoring/report.json). Reasoning output is already part of output, and output is already part of total tokens. The calculation uses the two requested denominators without adding reasoning or cached input again.

The highest-token labels also need interpretation. “Planning” includes coordination, environment setup, integration probes, approval handling, monitoring, and follow-up; it is not pure design reasoning. “Verification” in the hotfix includes coordination and documentation work. The records show that I proposed narrower packets, bounded reads, session reuse, and targeted reruns after budget warnings. They do not measure a causal reduction from those interventions.

### What I would change next time

I would keep the master-worker pattern, but calibrate it more aggressively:

- Start with the smallest useful topology and add an independent specialist only where risk justifies it.
- Put exact acceptance outcomes and evidence owners in the first packet, including ordinary test collection with opt-in variables absent.
- Record one authoritative handoff at every dependency boundary and avoid repeatedly reopening entire histories.
- Separate harness failures from product defects before announcing a conclusion.
- Measure matched, quality-qualified tasks before claiming that a model, cache strategy, or reduced context saved resources.
- Keep live-provider evaluation bounded and separate from deterministic orchestration tests.

The strongest part of my workflow was not that AI wrote code quickly. It was that the process made failures visible and recoverable. The weakest part was resource efficiency: long coordinator contexts and repeated verification were expensive, and the available data does not justify pretending otherwise.

## Evidence used

- [Zhenghao interaction-log index](../logs/zhenghao/README.md)
- [Learner workspace delivery ledger](../workflow/evaluations/zhenghao/ZH-LWS-01/delivery.md)
- [Browser Python IDE delivery ledger](../workflow/evaluations/zhenghao/ZH-LWS-02/delivery.md)
- [Learner assistant feature ledger](../workflow/zhenghao/handoffs/ZH-CHAT-01.md)
- [Learner hotfix verification](../workflow/evaluations/zhenghao/ZH-LHF-01/verification.md)
- [Contributor monitoring method](../workflow/zhenghao/monitoring.md)
