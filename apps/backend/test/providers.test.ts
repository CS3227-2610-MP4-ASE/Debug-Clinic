import { describe, expect, it, vi } from "vitest";
import { SocLlmProvider } from "../src/ai/provider.js";
import { createAuthEmailSender } from "../src/auth/email.js";
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
  RESEND_API_KEY: "synthetic-email-key",
  EMAIL_FROM: "test@example.test",
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

describe("SoCLaaS transport", () => {
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

describe("authentication email transport", () => {
  it("sends the documented Resend fields", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "test" }));
    await createAuthEmailSender(
      config,
      transport,
    )({ to: "learner@example.test", subject: "Verify", text: "Test link" });
    expect(
      JSON.parse(transport.mock.calls[0]?.[1]?.body as string),
    ).toMatchObject({ from: config.emailFrom, to: ["learner@example.test"] });
  });
  it("fails safely without echoing provider response text", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("private", { status: 403 }));
    await expect(
      createAuthEmailSender(
        config,
        transport,
      )({ to: "learner@example.test", subject: "Verify", text: "Test" }),
    ).rejects.toThrow("temporarily unavailable");
  });
});
