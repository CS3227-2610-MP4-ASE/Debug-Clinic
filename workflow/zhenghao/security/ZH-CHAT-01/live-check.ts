// Explicitly authorized synthetic live evaluation. Never imported by app/tests.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
import {
  SocLlmProvider,
  coachingSystemPrompt,
  type CoachingProviderInput,
} from "../../../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../../../apps/backend/src/config/env.js";
import { cases, evaluationVersion, exercises } from "./evaluation-cases.js";

const directory = "/private/tmp/debugclinic-ZH-CHAT-01-shared-live";
mkdirSync(directory, { recursive: true, mode: 0o700 });
chmodSync(directory, 0o700);
const ledgerPath = join(directory, "ledger.json");
const lockPath = join(directory, "ledger.lock");
mkdirSync(lockPath); // exclusive; refuse concurrent evaluator rather than overspend
try {
  const source = {
    ...(existsSync(".env") ? parse(readFileSync(".env")) : {}),
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
    ),
  };
  const endpoint = new URL(source.SOC_LLM_ENDPOINT ?? "");
  assert.equal(endpoint.origin, "https://soclaas-api.comp.nus.edu.sg");
  assert.equal(endpoint.pathname, "/v1/chat/completions");
  assert.ok(
    !endpoint.username &&
      !endpoint.password &&
      !endpoint.search &&
      !endpoint.hash,
  );
  assert.ok(
    source.SOC_LLM_API_KEY && source.SOC_LLM_MODEL,
    "Missing configured provider credentials/model; no calls allowed",
  );
  const config = readEnv({
    NODE_ENV: "test",
    APP_ORIGIN: "http://127.0.0.1:5173",
    CORS_ORIGINS: "http://127.0.0.1:5173",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/offline_test",
    BETTER_AUTH_URL: "http://127.0.0.1:5173",
    BETTER_AUTH_SECRET: "synthetic-secret-at-least-thirty-two-characters",
    AI_PROVIDER: "soc",
    SOC_LLM_ENDPOINT: source.SOC_LLM_ENDPOINT,
    SOC_LLM_MODEL: source.SOC_LLM_MODEL,
    SOC_LLM_API_KEY: source.SOC_LLM_API_KEY,
    AI_TIMEOUT_MS: source.AI_TIMEOUT_MS,
    AI_MAX_RETRIES: source.AI_MAX_RETRIES,
  });
  const hash = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  type Entry = {
    id: string;
    stage: string;
    level: number;
    inputUnits: number;
    attempts: number;
    status: string;
    elapsedMs?: number;
    inputTokens?: number | null;
    outputTokens?: number | null;
    replyUnits?: number;
  };
  type Ledger = {
    version: string;
    firstCallAt: string | null;
    deadlineAt: string | null;
    logicalCap: number;
    attemptCapPerCall: number;
    model: string;
    promptHashes: string[];
    entries: Entry[];
    stopped?: string;
  };
  const ledger: Ledger = existsSync(ledgerPath)
    ? JSON.parse(readFileSync(ledgerPath, "utf8"))
    : {
        version: evaluationVersion,
        firstCallAt: null,
        deadlineAt: null,
        logicalCap: 12,
        attemptCapPerCall: 2,
        model: config.socLlmModel!,
        promptHashes: [1, 2, 3].map((level) =>
          hash(coachingSystemPrompt(level as 1 | 2 | 3)),
        ),
        entries: [],
      };
  assert.equal(ledger.model, config.socLlmModel);
  assert.ok(
    !ledger.stopped,
    "A previous auth/config failure stopped the shared evaluation",
  );
  const persist = () =>
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
  persist();
  const histories: Record<string, CoachingProviderInput["history"]> = {
    slice: [],
    accumulator: [],
  };
  for (const test of cases) {
    assert.ok(ledger.entries.length < 12, "Shared logical budget exhausted");
    const input: CoachingProviderInput = {
      level: test.level,
      question: exercises[test.conversation],
      current: test.current,
      history: histories[test.conversation]!.slice(-8),
    };
    const inputUnits =
      coachingSystemPrompt(input.level).length +
      JSON.stringify({
        exercise: input.question,
        eligibleHistory: input.history,
        current: input.current,
      }).length;
    assert.ok(
      inputUnits <= 8000,
      "Authorized synthetic context budget exceeded",
    );
    if (!ledger.firstCallAt) {
      ledger.firstCallAt = new Date().toISOString();
      ledger.deadlineAt = new Date(Date.now() + 600000).toISOString();
    }
    assert.ok(
      Date.now() < Date.parse(ledger.deadlineAt!),
      "Shared ten-minute evaluation window expired",
    );
    const entry: Entry = {
      id: test.id,
      stage: "ai-security",
      level: test.level,
      inputUnits,
      attempts: 0,
      status: "reserved",
    };
    ledger.entries.push(entry);
    persist(); // reserve before any possible transport
    const transport: typeof fetch = async (url, init) => {
      assert.equal(String(url), config.socLlmEndpoint);
      assert.equal(init?.redirect, "error");
      assert.ok(++entry.attempts <= 2);
      assert.ok(Date.now() < Date.parse(ledger.deadlineAt!));
      persist();
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.any([
          init!.signal!,
          AbortSignal.timeout(
            Math.max(1, Date.parse(ledger.deadlineAt!) - Date.now()),
          ),
        ]),
      });
      if ([400, 401, 403, 404, 422].includes(response.status)) {
        ledger.stopped = `auth-or-configuration-http-${response.status}`;
        persist();
      }
      // Preserve only bounded synthetic response bytes in private evidence.
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
            await reader.cancel();
            throw new TypeError("Bounded synthetic response exceeded");
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
      const body = Buffer.concat(chunks);
      writeFileSync(
        join(directory, `${test.id}-attempt-${entry.attempts}.private.json`),
        body,
        { mode: 0o600 },
      );
      return new Response(body, {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    };
    const started = Date.now();
    try {
      const reply = await new SocLlmProvider(
        config,
        transport,
      ).generateCoaching(input);
      assert.ok(
        reply.message.length <= 2000,
        "Reply exceeds approved UTF16 bound",
      );
      entry.status = "structured-reply-semantic-review-pending";
      entry.inputTokens = reply.inputTokens;
      entry.outputTokens = reply.outputTokens;
      entry.replyUnits = reply.message.length;
      histories[test.conversation]!.push({
        learner: JSON.stringify(input.current),
        assistant: reply.message,
      });
      writeFileSync(
        join(directory, `${test.id}.private.json`),
        JSON.stringify({ test, input, reply }, null, 2),
        { mode: 0o600 },
      );
    } catch {
      entry.status = ledger.stopped
        ? "stopped-auth-or-config"
        : "inconclusive-provider-or-validation-error";
    }
    entry.elapsedMs = Date.now() - started;
    persist();
    console.log(JSON.stringify(entry));
    if (ledger.stopped) break;
  }
  console.log(
    JSON.stringify({
      ledgerPath,
      remainingLogical: 12 - ledger.entries.length,
      deadlineAt: ledger.deadlineAt,
      model: ledger.model,
      promptHashes: ledger.promptHashes,
      stopped: ledger.stopped ?? null,
    }),
  );
} catch {
  console.log(
    "Synthetic evaluation stopped on local authorization/configuration/preflight invariant; inspect private ledger. No credential values logged.",
  );
  process.exitCode = 1;
} finally {
  rmSync(lockPath, { recursive: true });
}
