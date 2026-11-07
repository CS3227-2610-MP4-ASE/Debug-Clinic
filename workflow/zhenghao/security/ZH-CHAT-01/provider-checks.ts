import assert from "node:assert/strict";
import {
  SocLlmProvider,
  type CoachingProviderInput,
} from "../../../../apps/backend/src/ai/provider.js";
import { readEnv } from "../../../../apps/backend/src/config/env.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/offline_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET: "synthetic-secret-at-least-thirty-two-characters",
  AI_PROVIDER: "soc",
  SOC_LLM_ENDPOINT: "https://soclaas-api.comp.nus.edu.sg/v1/chat/completions",
  SOC_LLM_MODEL: "synthetic-model",
  SOC_LLM_API_KEY: "synthetic-not-a-real-key",
  AI_MAX_RETRIES: "3",
  AI_TIMEOUT_MS: "100",
});
const input: CoachingProviderInput = {
  level: 1,
  question: {
    title: "List sum",
    problemStatement: "Find the omitted element.",
    expectedBehavior: "Include all values.",
    buggyCode: "return sum(values[:-1])",
  },
  current: { message: "What should I trace?" },
  history: [],
};
const envelope = (message: string) =>
  Response.json({
    choices: [{ message: { content: JSON.stringify({ message }) } }],
  });
const results: Array<{ id: string; result: string }> = [];
async function check(id: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ id, result: "pass" });
  } catch {
    results.push({ id, result: "fail" });
  }
}
await check("coaching-single-deadline-noncooperative-transport", async () => {
  const keepAlive = setInterval(() => {}, 1000);
  const started = Date.now();
  try {
    await assert.rejects(
      new SocLlmProvider(
        config,
        async () => new Promise(() => {}),
      ).generateCoaching(input),
      { status: 503 },
    );
    assert.ok(Date.now() - started < 1000);
  } finally {
    clearInterval(keepAlive);
  }
});
await check("envelope-byte-bound-before-parse", async () => {
  await assert.rejects(
    new SocLlmProvider(
      config,
      async () => new Response(" ".repeat(256 * 1024 + 1)),
    ).generateCoaching(input),
    { status: 503 },
  );
});
await check("content-byte-bound", async () => {
  await assert.rejects(
    new SocLlmProvider(config, async () =>
      envelope("x".repeat(32769)),
    ).generateCoaching(input),
    { status: 503 },
  );
});
await check("malformed-utf8-envelope", async () => {
  await assert.rejects(
    new SocLlmProvider(
      config,
      async () => new Response(new Uint8Array([0xc3, 0x28])),
    ).generateCoaching(input),
    { status: 503 },
  );
});
await check("retry-at-most-two-with-stricter-config", async () => {
  let calls = 0;
  await assert.rejects(
    new SocLlmProvider({ ...config, aiTimeoutMs: 1000 }, async () => {
      calls++;
      return new Response(null, { status: 503 });
    }).generateCoaching(input),
    { status: 503, providerAttempts: 2 },
  );
  assert.equal(calls, 2);
});
await check("auth-failure-no-retry-no-body", async () => {
  let calls = 0;
  await assert.rejects(
    new SocLlmProvider(config, async () => {
      calls++;
      return new Response("PRIVATE_UPSTREAM_SENTINEL", { status: 401 });
    }).generateCoaching(input),
    (error: unknown) => {
      assert.ok(!JSON.stringify(error).includes("PRIVATE_UPSTREAM_SENTINEL"));
      return true;
    },
  );
  assert.equal(calls, 1);
});
await check("redirect-option-nullable-usage-and-message-envelope", async () => {
  const result = await new SocLlmProvider(config, async (_url, init) => {
    assert.equal(init?.redirect, "error");
    assert.equal(JSON.parse(String(init?.body)).messages.length, 2);
    return envelope("Trace one small example.");
  }).generateCoaching(input);
  assert.equal(result.inputTokens, null);
  assert.equal(result.outputTokens, null);
});
await check("known-syntactic-pass-is-not-semantic-pass", async () => {
  const result = await new SocLlmProvider(config, async () =>
    envelope("Replace the faulty line with return sum(values)."),
  ).generateCoaching(input);
  assert.ok(result.message.includes("return sum(values)"));
});
console.log(
  JSON.stringify(
    { kind: "independent-fake-transport-bounds", results },
    null,
    2,
  ),
);
if (results.some((r) => r.result === "fail")) process.exitCode = 1;
