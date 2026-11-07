import { describe, expect, it, vi } from "vitest";
import {
  FakeAiProvider,
  SocLlmProvider,
  type CoachingProviderInput,
} from "../src/ai/provider.js";
import { readEnv } from "../src/config/env.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173",
  DATABASE_URL: "postgresql://localhost/test",
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret-at-least-thirty-two-characters",
  AI_PROVIDER: "soc",
  SOC_LLM_ENDPOINT: "https://soclaas-api.comp.nus.edu.sg/v1/chat/completions",
  SOC_LLM_MODEL: "test-model",
  SOC_LLM_API_KEY: "synthetic-key",
  AI_MAX_RETRIES: "1",
});
const input = {
  attemptId: "test",
  proposedCode: "print(x)",
  reasoning: "Check the assignment",
  stage: 1 as const,
};
const context = {
  requestId: "request-1",
  user: {
    id: "test",
    name: "Test",
    email: "test@example.test",
    role: "LEARNER" as const,
  },
};
const answer = () =>
  Response.json({
    choices: [
      {
        message: {
          content: JSON.stringify({
            message: "Trace the variable assignment.",
          }),
        },
      },
    ],
  });
const coachingInput: CoachingProviderInput = {
  level: 1,
  question: {
    title: "List sum",
    problemStatement: "Find the skipped value.",
    expectedBehavior: "Return all values.",
    buggyCode: "return sum(values[:-1])",
  },
  current: {
    message: "Why is the last item missing?",
    code: "return sum(values[:-1])",
  },
  history: [],
};

describe("SoCLaaS transport", () => {
  it("uses a deterministic fake coaching response with unavailable token usage", async () => {
    const result = await new FakeAiProvider().generateCoaching!(coachingInput);
    expect(result).toMatchObject({
      attempts: 1,
      inputTokens: null,
      outputTokens: null,
    });
    expect(result.message).not.toContain("return sum(values)");
  });

  it("bounds coaching retries and parses nullable usage from the established envelope", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  message: "Trace the final loop iteration.",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 17, completion_tokens: 8 },
        }),
      );
    const result = await new SocLlmProvider(config, transport)
      .generateCoaching!(coachingInput);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      message: "Trace the final loop iteration.",
      attempts: 2,
      inputTokens: 17,
      outputTokens: 8,
    });
  });

  it("rejects malformed coaching output and never returns upstream text", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: JSON.stringify({ message: "" }) } }],
      }),
    );
    await expect(
      new SocLlmProvider(config, transport).generateCoaching!(coachingInput),
    ).rejects.toThrow("temporarily unavailable");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("maps deadline expiry during a network retry to a safe dependency error", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      new SocLlmProvider(
        { ...config, aiTimeoutMs: 50 },
        transport,
      ).generateHint(input, context),
    ).rejects.toMatchObject({ status: 503 });
  });
  it("uses the official chat protocol and owns response identity/stage", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(answer());
    const result = await new SocLlmProvider(config, transport).generateHint(
      input,
      context,
    );
    expect(result).toMatchObject({
      stage: 1,
      requestId: "request-1",
      kind: "HINT",
      promptVersion: "soc-hint-v1",
    });
    expect(transport.mock.calls[0]?.[0]).toBe(config.socLlmEndpoint);
    expect(
      JSON.parse(transport.mock.calls[0]?.[1]?.body as string),
    ).toMatchObject({ model: "test-model", messages: expect.any(Array) });
  });
  it("retries transient failures within the configured bound", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(answer());
    await new SocLlmProvider(config, transport).generateHint(input, context);
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it("does not retry unauthorized responses or expose upstream errors", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response("private provider detail", { status: 401 }),
      );
    await expect(
      new SocLlmProvider(config, transport).generateHint(input, context),
    ).rejects.toThrow("temporarily unavailable");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed structured content", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content: "not JSON" } }] }),
      );
    await expect(
      new SocLlmProvider(config, transport).generateHint(input, context),
    ).rejects.toThrow("temporarily unavailable");
  });
  it("stops when the overall deadline expires", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(
        async (_url, options) =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Timed out", "TimeoutError")),
            ),
          ),
      );
    await expect(
      new SocLlmProvider(
        { ...config, aiTimeoutMs: 100 },
        transport,
      ).generateHint(input, context),
    ).rejects.toThrow("temporarily unavailable");
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
