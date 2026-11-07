// Explicit owner authorization: remaining six calls only, after final repairs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import {
  SocLlmProvider,
  assembledCoachingPromptUnits,
  coachingSystemPrompt,
  type CoachingProviderResult,
} from "../../../../apps/backend/src/ai/provider.js";
import { coachingOutputViolation } from "../../../../apps/backend/src/ai/coaching-output-policy.js";
import { readEnv } from "../../../../apps/backend/src/config/env.js";
import { cases, exercises } from "./evaluation-cases.js";
import { db, fixture, privateMarker } from "./recheck-fixtures.js";

const directory = "/private/tmp/debugclinic-ZH-CHAT-01-shared-live";
const ledgerPath = join(directory, "ledger.json");
const lockPath = join(directory, "ledger.lock");
type Entry = {
  id: string;
  originalCaseId: string;
  stage: string;
  round: string;
  sourceSha: string;
  level: number;
  attempts: number;
  status: string;
  inputUnits?: number;
  candidateReplyUnits?: number;
  deliveredReplyUnits?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  elapsedMs?: number;
  privateContextExcluded?: boolean;
  clientPrivateContextExcluded?: boolean;
  persistedMessages?: number;
  requestState?: string;
  candidatePolicyViolation?: string | null;
  originalMessagePreserved?: boolean;
};
type Window = {
  id: string;
  sourceSha: string;
  authorization: string;
  firstCallAt: string | null;
  deadlineAt: string | null;
  maximumNewLogicalCalls: number;
  promptHashes: string[];
  policyHash: string;
};
type Ledger = {
  entries: Array<Record<string, unknown>>;
  model: string;
  logicalCap: number;
  stopped?: string;
  repairAuthorization: {
    remainingLogical: number;
    freshTenMinuteWindowAfterRepairs: boolean;
    windowStarted: boolean;
  };
  windows?: Window[];
};
let locked = false;
try {
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  assert.equal(sourceSha, "b4878edeb0027e128a76d24820534efb34c1686c");
  // The unchanged seven-case fixture must be observed green before live spend.
  const log = readFileSync(
    "/private/tmp/ZH-CHAT-01-security-final-policy.log",
    "utf8",
  );
  const begin = log.indexOf(
    '{\n  "kind": "independent-actual-service-policy-recheck"',
  );
  assert.ok(begin >= 0);
  const jsonEnd = log.indexOf("\nOwned disposable", begin);
  const policy = JSON.parse(log.slice(begin, jsonEnd));
  assert.equal(policy.observations.length, 7);
  assert.ok(
    policy.observations.every((o: { result: string }) => o.result === "pass"),
  );
  mkdirSync(lockPath);
  locked = true;
  const originalContents = readFileSync(ledgerPath);
  const ledger: Ledger = JSON.parse(originalContents.toString());
  assert.equal(ledger.entries.length, 6);
  assert.equal(ledger.logicalCap, 12);
  assert.equal(ledger.repairAuthorization.remainingLogical, 6);
  assert.equal(
    ledger.repairAuthorization.freshTenMinuteWindowAfterRepairs,
    true,
  );
  assert.equal(ledger.repairAuthorization.windowStarted, false);
  assert.ok(!ledger.stopped);
  const originalEntries = JSON.stringify(ledger.entries);
  writeFileSync(
    join(directory, "ledger-before-review-3.private.json"),
    originalContents,
    { mode: 0o600, flag: "wx" },
  );
  const configured = {
    ...parse(readFileSync(".env")),
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
    ),
  };
  const endpoint = new URL(configured.SOC_LLM_ENDPOINT ?? "");
  assert.equal(endpoint.origin, "https://soclaas-api.comp.nus.edu.sg");
  assert.equal(endpoint.pathname, "/v1/chat/completions");
  assert.ok(
    !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash,
  );
  assert.ok(configured.SOC_LLM_API_KEY && configured.SOC_LLM_MODEL);
  assert.equal(configured.SOC_LLM_MODEL, ledger.model);
  const config = readEnv({
    NODE_ENV: "test",
    APP_ORIGIN: "http://127.0.0.1:5173",
    CORS_ORIGINS: "http://127.0.0.1:5173",
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    DATABASE_URL_POOLED: process.env.TEST_DATABASE_URL,
    BETTER_AUTH_URL: "http://127.0.0.1:5173",
    BETTER_AUTH_SECRET: "synthetic-secret-at-least-thirty-two-characters",
    AI_PROVIDER: "soc",
    SOC_LLM_ENDPOINT: configured.SOC_LLM_ENDPOINT,
    SOC_LLM_MODEL: configured.SOC_LLM_MODEL,
    SOC_LLM_API_KEY: configured.SOC_LLM_API_KEY,
    AI_TIMEOUT_MS: configured.AI_TIMEOUT_MS,
    AI_MAX_RETRIES: configured.AI_MAX_RETRIES,
  });
  const hash = (value: string | Buffer) =>
    createHash("sha256").update(value).digest("hex");
  const window: Window = {
    id: "review-3-final-after-repairs",
    sourceSha,
    authorization:
      "Owner explicitly authorized remaining six calls in fresh ten-minute window after repairs; shared twelve-call cap unchanged",
    firstCallAt: null,
    deadlineAt: null,
    maximumNewLogicalCalls: 6,
    promptHashes: [1, 2, 3].map((n) =>
      hash(coachingSystemPrompt(n as 1 | 2 | 3)),
    ),
    policyHash: hash(
      readFileSync("apps/backend/src/ai/coaching-output-policy.ts"),
    ),
  };
  assert.ok(!ledger.windows?.some((w) => w.id === window.id));
  ledger.windows = [...(ledger.windows ?? []), window];
  const persist = () => {
    assert.equal(JSON.stringify(ledger.entries.slice(0, 6)), originalEntries);
    writeFileSync(
      join(directory, "ledger-review-3.tmp"),
      JSON.stringify(ledger, null, 2),
      { mode: 0o600 },
    );
    renameSync(join(directory, "ledger-review-3.tmp"), ledgerPath);
  };
  persist();
  let active: Entry | undefined;
  const state: { candidate?: CoachingProviderResult; providerInput?: unknown } =
    {};
  const transport: typeof fetch = async (url, init) => {
    assert.ok(active);
    assert.equal(String(url), config.socLlmEndpoint);
    assert.equal(init?.redirect, "error");
    assert.ok(++active.attempts <= 2);
    assert.ok(
      ledger.entries.reduce((sum, e) => sum + Number(e.attempts ?? 0), 0) <= 24,
    );
    assert.ok(window.deadlineAt && Date.now() < Date.parse(window.deadlineAt));
    persist();
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.any([
        init!.signal!,
        AbortSignal.timeout(
          Math.max(1, Date.parse(window.deadlineAt) - Date.now()),
        ),
      ]),
    });
    if ([400, 401, 403, 404, 422].includes(response.status)) {
      ledger.stopped = `auth-or-configuration-http-${response.status}`;
      persist();
    }
    const reader = response.body?.getReader();
    if (!reader) return response;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 256 * 1024) {
          void reader.cancel().catch(() => undefined);
          throw Error("Response byte bound");
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = Buffer.concat(chunks);
    writeFileSync(
      join(directory, `${active.id}-attempt-${active.attempts}.private.json`),
      body,
      { mode: 0o600, flag: "wx" },
    );
    return new Response(body, {
      status: response.status,
      headers: { "content-type": "application/json" },
    });
  };
  const soc = new SocLlmProvider(config, transport);
  const provider = {
    generateHint: soc.generateHint.bind(soc),
    generateCoaching: async (
      input: Parameters<SocLlmProvider["generateCoaching"]>[0],
    ) => {
      assert.ok(active);
      state.providerInput = input;
      active.privateContextExcluded =
        !JSON.stringify(input).includes(privateMarker);
      assert.equal(active.privateContextExcluded, true);
      active.inputUnits = assembledCoachingPromptUnits(input);
      assert.ok(active.inputUnits <= 8000);
      active.originalMessagePreserved =
        input.current.message ===
        cases.find((c) => c.id === active!.originalCaseId)!.current.message;
      if (!window.firstCallAt) {
        window.firstCallAt = new Date().toISOString();
        window.deadlineAt = new Date(Date.now() + 600000).toISOString();
        ledger.repairAuthorization.windowStarted = true;
      }
      assert.ok(Date.now() < Date.parse(window.deadlineAt!));
      persist();
      state.candidate = await soc.generateCoaching(input);
      assert.ok(state.candidate.message.length <= 2000);
      active.inputTokens = state.candidate.inputTokens;
      active.outputTokens = state.candidate.outputTokens;
      active.candidateReplyUnits = state.candidate.message.length;
      persist();
      return state.candidate;
    },
  };
  const fixtures = {
    slice: await fixture("slice", provider),
    accumulator: await fixture("accumulator", provider),
  };
  for (const test of cases) {
    assert.ok(ledger.entries.length < 12);
    assert.ok(!ledger.stopped);
    const f = fixtures[test.conversation];
    const previous = await db.learnerAssistantMessage.findMany({
      where: { conversation: { learnerId: f.learnerId }, role: "ASSISTANT" },
      orderBy: { sequence: "desc" },
      take: 8,
      select: { text: true },
    });
    const canonical = await db.exerciseVersion.findUniqueOrThrow({
      where: { id: f.versionId },
      select: { correctedSolution: true },
    });
    active = {
      id: `review-3-${test.id}`,
      originalCaseId: test.id,
      stage: "ai-security",
      round: "review-3",
      sourceSha,
      level: test.level,
      attempts: 0,
      status: "reserved",
    };
    ledger.entries.push(active as unknown as Record<string, unknown>);
    persist();
    state.candidate = undefined;
    state.providerInput = undefined;
    const started = Date.now();
    const response = await f.send(test);
    active.elapsedMs = Date.now() - started;
    const request = await db.learnerAssistantRequest.findUnique({
      where: {
        learnerId_requestId: {
          learnerId: f.learnerId,
          requestId: response.requestId,
        },
      },
    });
    active.requestState = request?.status ?? "not-reserved";
    active.persistedMessages = await db.learnerAssistantMessage.count({
      where: {
        conversationId: request?.conversationId,
        requestId: response.requestId,
      },
    });
    const candidate = state.candidate as CoachingProviderResult | undefined;
    active.candidatePolicyViolation = candidate
      ? coachingOutputViolation({
          message: candidate.message,
          level: test.level,
          buggyCode: exercises[test.conversation].buggyCode,
          correctedSolution: canonical.correctedSolution!,
          previousAssistantMessages: previous.reverse().map((r) => r.text),
        })
      : null;
    active.status =
      response.status === "accepted" && response.result.reply
        ? "delivered-semantic-review-pending"
        : candidate &&
            active.candidatePolicyViolation &&
            request?.status === "FAILED"
          ? "policy-rejected"
          : ledger.stopped
            ? "stopped-auth-or-config"
            : !candidate && active.attempts > 0
              ? "transport-or-provider-validation-failed"
              : "inconclusive";
    active.deliveredReplyUnits =
      response.status === "accepted"
        ? (response.result.reply?.text.length ?? 0)
        : 0;
    active.clientPrivateContextExcluded =
      !JSON.stringify(response).includes(privateMarker);
    assert.equal(active.clientPrivateContextExcluded, true);
    writeFileSync(
      join(directory, `${active.id}.private.json`),
      JSON.stringify(
        {
          test,
          providerInput: state.providerInput,
          candidate,
          response,
          entry: active,
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
    persist();
    console.log(JSON.stringify(active));
    if (ledger.stopped) break;
  }
  console.log(
    JSON.stringify({
      sharedLogicalUsed: ledger.entries.length,
      sharedTransportAttempts: ledger.entries.reduce(
        (sum, e) => sum + Number(e.attempts ?? 0),
        0,
      ),
      remainingLogical: 12 - ledger.entries.length,
      window,
      ledgerPath,
      model: ledger.model,
    }),
  );
} catch {
  console.log(
    "Final synthetic evaluation stopped on safe preflight/provider invariant; private ledger retained; no credentials or provider bodies logged.",
  );
  process.exitCode = 1;
} finally {
  if (locked) rmSync(lockPath, { recursive: true });
  await db.$disconnect();
}
