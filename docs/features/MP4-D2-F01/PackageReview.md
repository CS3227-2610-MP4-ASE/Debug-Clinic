# MP4-D2-F01 independent specification review

Date: 2026-11-05, Asia/Singapore. Current verdict: **READY FOR HUMAN PACKAGE REVIEW — owner-directed AI test-agent strategy review passed**. Historical reviewed-v1 and numeric-review results remain below; final current hashes are in the owner-directed strategy review section. See TEST-STRATEGY-UPDATE-01 in ApprovalRecord.md.

Reviewer: `/root/f01_spec_review`, Developer 2, independent generic collaboration agent applying `.codex/agents/spec_reviewer.toml`. Read-only reviewer; no package authorship or repair. Coordinator records the returned report here. Review is specification readiness, not implementation verification or owner approval.

## Initial review — F01-SPEC-REVIEW-1

### Blocking findings

**F01-SPEC-01 — P2: accepted offsets can wrap into another page.** Original TDD lines 23–26 and RTT line 61/F01-B18 accept every nonnegative JavaScript safe integer. Installed Prisma 7.10.1 PostgreSQL query compilation does not preserve that domain. Offline compilation explicitly repeated under Node v24.14.0 produced:

| Requested offset | Compiled SQL OFFSET |
| --- | --- |
| 2,147,483,648 | 2,147,483,648 |
| 4,294,967,295 | 4,294,967,295 |
| 4,294,967,296 | 0 |
| 4,294,967,297 | 1 |
| 9,007,199,254,740,991 | 4,294,967,295 |

A valid request can repeat the first page rather than return the promised empty result. Correction: document supported offset/terminal nextOffset behavior or explicitly handle larger values before Prisma; retain concrete 4,294,967,296 regression evidence. Prefer the smallest coherent policy, without additional infrastructure.

**F01-SPEC-02 — P2: accepted token counts exceed storage capacity.** Original TDD line 44/usage section and RTT line 63/F01-B07/B11 accept nonnegative safe integers. Existing `AiUsageEvent.inputTokens/outputTokens` are Prisma `Int?`, backed by PostgreSQL INTEGER (`prisma/migrations/20261101000000_initial/migration.sql:183`). Count 2,147,483,648 cannot be stored; mandatory success usage insertion would turn otherwise usable generation into 503. Correction: normalize out-of-storage-range provider counts to null, align the normalized contract, and include 2,147,483,647/2,147,483,648/JS-safe-maximum fixtures. No schema widening required.

### Separate verdicts and minimality

- **Spec-functional: changes required.** Nine FR and four NFR have substantive planned coverage; preview/edit/Save, ownership/private DRAFT, read-only reopening, failures, PC-01 and unsaved navigation are consistent apart from the two numeric defects.
- **Standards-readiness: changes required.** Otherwise consistent with shared Zod contracts, server authorization, one coherent draft module, existing provider seam, atomic Exercise/version, explicit projections, additive nullable migration and both runtime compositions. Implementation compliance unverified.
- **Planning-security: no additional blocking finding.** Minimized context, fixed versioned prompts, untrusted input/output, origin protection, safe rendering/errors/logging, owner checks, bounded transport/retries, usage limitations, adversarial fixtures and separate authorized live quality review are specified. Schema validity is distinguished from semantic quality. Implementation security review remains required.
- **Minimality: consistent with owner instruction.** No queues, caches, signed previews, generation sessions, quotas, execution or exactly-once machinery. Neither repair requires architectural expansion. No optional finding requiring action.

### Authority and reviewed hashes

Reviewer confirmed scope and Q1–Q12/shared-understanding provenance, and PRD-APPROVAL-01 including PC-01. External recorded approval supersedes historical draft/proposed headers; headers were not treated as approval.

| Artifact | Independently verified SHA-256 |
| --- | --- |
| Mission Brief | `1dc4543abd85eb0cb396ffd3a416472c0f4cee1e6ee75e0b6781009d5740aac1` |
| PRD | `ca200e496be98ee8e1deae5b5ff995e5d5342ce9633e28825fac12a86a179b8b` |
| TDD, original v1 | `a70afa71619c496d3287754be4060cc3e1365e211b6bf4538f2d717aac4d602d` |
| RTT, original v1 | `a8d06bebbffecda8781c8abee2effbeaf0dc5f351f443c7c49b7a3372b098fe3` |

TDD/RTT/package/shared-file approval and separate implementation authorization remain absent.

### Actual checks and limitations

Reviewer read complete assigned package/ledger; repository/role instructions, PRODUCT/CodingStandards, and relevant actual app/provider/config/contracts/schema/migration/compositions/tests. Verified clean `royden/auth-completion` at `b8612d9dd655ae200607c4ff887703132eb0f61f`. Twenty-six eventual-location Markdown links checked, none missing.

Only read-only inspection, hashing, link checks and offline installed-Prisma query-compilation feasibility probes ran. Initial exploratory PATH Node22 results were repeated under explicit `C:/Program Files/nodejs/node.exe`, observed v24.14.0. No query executed. No files changed by reviewer; no `.env`, unrelated SDD, network/provider/database calls, application tests, commits or infrastructure operations. All 28 application behaviors remain Planned. Real database/browser/CI/provider and implementation-review evidence is unavailable.

## Targeted repair/re-review tracking

- Repair round 1 dispatched to original scoped TDD writer, then dependent RTT writer. Reviewer performs no repairs.
- Both findings must be resolved and affected hashes/coverage rechecked before human package review.
- At most two targeted correction/review rounds. Initial readiness was blocked; the final re-review below supersedes that state. No approval or implementation permission follows from either verdict.

## Targeted re-review — round 1, final verdict

Returned by the same independent read-only reviewer `/root/f01_spec_review`; coordinator records the returned result. **READY FOR HUMAN PACKAGE REVIEW.** Both initial P2 findings resolved; no remaining blocking or optional findings from this round.

| Finding | Resolution |
| --- | --- |
| F01-SPEC-01 | TDD section 2 bounds offsets/non-null nextOffset to 0–4,294,967,295, rejects larger values before Prisma, and gives safe 400 when another page would overflow. RTT includes 4,294,967,296/297 wrap regressions and nextOffset boundaries. No wrapped/false terminal page. |
| F01-SPEC-02 | TDD section 4 normalizes unavailable/invalid/above-Int32 provider counts to null before normalized-result validation/storage. RTT B07/B11 distinguish raw versus normalized results and preserve otherwise-valid generation at overflow boundaries. No clamping, zero substitution or schema widening. |

- **Spec-functional: pass for package readiness.** Corrections preserve approved requirements; all 28 behavior IDs uniquely defined and Planned.
- **Standards-readiness: pass for package readiness.** Validation aligns with actual dependency/storage domains; no new subsystem. Implementation compliance remains unverified.
- **Planning-security: no additional blocker.** Privacy, authorization, bounded handling, adversarial and controlled-provider plans remain intact. Future independent implementation security review required.
- **Minimality:** narrow contract corrections; accepted flow preserved with no speculative infrastructure or workflows.

### Final reviewed hashes

| Artifact | Independently verified SHA-256 |
| --- | --- |
| Mission Brief | `1dc4543abd85eb0cb396ffd3a416472c0f4cee1e6ee75e0b6781009d5740aac1` |
| PRD | `ca200e496be98ee8e1deae5b5ff995e5d5342ce9633e28825fac12a86a179b8b` |
| TDD, repair 1 | `756b308a2347b99b083a292b8d7130cec022b8c85df8268e0555fc2901120bd9` |
| RTT, repair 1 | `724a5f0b21a8af89bc231dd665a0702e70c3ebe4f077000d6c8d3b02fff910ac` |

Reviewer reread complete affected TDD/RTT and exact diffs against original design-v1 recovery copies. Changes confined to the two repairs, affected planned cases and RTT source hash. Unaffected initial observations remain applicable. No passing diagnostic rerun, app tests, source/document edits, database/provider/network calls, .env or commits. Application evidence remains planned; readiness is not implemented behavior.

### Original offline compiler diagnostic — reproducible outline

Run from selected baseline, piping this JavaScript to `& 'C:/Program Files/nodejs/node.exe' --input-type=module` (observed Node v24.14.0):

```javascript
import fs from "node:fs";
const root = "./node_modules/@prisma/client/runtime/";
const glue = await import(root + "query_compiler_fast_bg.postgresql.mjs");
const source = fs.readFileSync(root + "query_compiler_fast_bg.postgresql.wasm-base64.mjs", "utf8");
const data = source.match(/const wasm = "([^"]+)"/)[1];
const instance = await WebAssembly.instantiate(
  await WebAssembly.compile(Buffer.from(data, "base64")),
  { "./query_compiler_fast_bg.js": glue }
);
glue.__wbg_set_wasm(instance.exports);
instance.exports.__wbindgen_start();
const compiler = new glue.QueryCompiler({
  datamodel: fs.readFileSync("prisma/schema.prisma", "utf8"),
  provider: "postgres",
  connectionInfo: { schemaName: "public", supportsRelationJoins: true }
});
for (const skip of [4294967295, 4294967296, 4294967297]) {
  const plan = compiler.compile(JSON.stringify({
    modelName: "Exercise", action: "findMany",
    query: { arguments: { skip, take: 51 }, selection: { id: true } }
  }));
  console.log({ runtime: process.version, skip, parameters: plan.args.expr.args.args });
}
compiler.free();
```

Original output parameters were 4,294,967,295 / 0 / 1. This dependency-internal diagnostic connects to no database and executes no query. It is feasibility evidence, not an application acceptance-test seam.

**Still required:** human design/package approval including proposed seams, numeric policies and shared-file requests, exact approved snapshot/backup/commit gate, and separate implementation authorization. This report grants none of those permissions and authorizes no live calls.

## Owner-directed AI test-agent strategy review

Returned by independent read-only reviewer `/root/f01_spec_review` after TEST-STRATEGY-UPDATE-01. **READY FOR HUMAN PACKAGE REVIEW.** No blocking or optional findings; this is a new owner-directed method review, not an unresolved numeric-defect repair round.

- **Spec-functional readiness: pass.** Hard-coded deterministic application/contract tests remain; a fresh independent AI test agent evaluates captured LLM outputs. Product instructor review and human accessibility observations unchanged; no approved product requirement change.
- **Standards-readiness: pass for planning.** Existing public seams and numeric corrections retained. Same 13 requirement IDs and 28 unique Planned behavior rows. No production judge/service, execution capability or evaluation framework.
- **Planning-security: no additional blocker.** Captured output is untrusted evaluator data; fixed criteria/sample packet excludes credentials/history. Evaluator is instructed not to execute code or follow sample-requested tools and records actual exposed identity/settings. Agent instructions are not an OS sandbox guarantee. Judgments remain fallible evidence, not semantic proof.
- **Minimality: appropriate.** Bounded development acceptance using existing agent workflow, two calibration fixtures and one small initial sample batch; no additional product workflow/infrastructure.

Reviewer confirmed concrete rubric/prompt criteria, literal good and structurally valid wrong-correction calibration fixtures with expected labels/construction withheld, 11 specified synthetic samples preserving all outcomes, evidence/counterexamples per PASS/FAIL/INCONCLUSIVE, and blocking of failed calibration/failures/uncertainty rather than rerolling until green.

| Current artifact | Independently verified SHA-256 |
| --- | --- |
| Mission Brief | `1dc4543abd85eb0cb396ffd3a416472c0f4cee1e6ee75e0b6781009d5740aac1` |
| PRD | `ca200e496be98ee8e1deae5b5ff995e5d5342ce9633e28825fac12a86a179b8b` |
| TDD, AI test-agent strategy | `c9f47f8ee6073a43482c6b52e69e99c44b80c6c43ef1f683c1a30c8338458d41` |
| RTT, AI test-agent strategy | `329f8c6036ebb385cb905073b778566e12c10d82862f156ba7bfc4d076a4bb67` |

Actual checks: read TEST-STRATEGY-UPDATE-01, complete revised TDD/RTT, exact reviewed-v1 diffs, calibration fixtures and completion rules; independently verified hashes and 13-ID/28-Planned-row continuity. Changes confined to evaluator method, associated evidence/outcome handling and source references. Approved Mission Brief/PRD bytes unchanged.

No reviewer edits, app tests, calibration, sample evaluation, live/provider/database operations, .env, commits or repeated compiler probe. Actual evaluator calibration/quality results, application verification and implementation/security review remain pending. Human package/design approval, including seams/shared files, and separate implementation authorization remain absent and required.
