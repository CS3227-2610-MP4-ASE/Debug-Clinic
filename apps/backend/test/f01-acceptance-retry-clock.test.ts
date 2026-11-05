import { afterEach, describe, expect, it, vi } from "vitest";
import { SocLlmProvider } from "../src/ai/provider.js";
import { readEnv } from "../src/config/env.js";
import { f01Topic } from "../../../tests/support/f01-fixtures.js";

// Virtualize the external timer boundary as well as global timers. Assertions
// observe remote request times; they do not call or assert a private retry helper.
vi.mock("node:timers/promises", () => ({
  setTimeout: (
    delay: number,
    value: unknown,
    options?: { signal?: AbortSignal },
  ) =>
    new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      const timer = setTimeout(() => {
        options?.signal?.removeEventListener("abort", abort);
        resolve(value);
      }, delay);
      if (options?.signal?.aborted) abort();
      else options?.signal?.addEventListener("abort", abort, { once: true });
    }),
}));
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  CORS_ORIGINS: "http://127.0.0.1:5173",
  DATABASE_URL:
    "postgresql://synthetic:synthetic@127.0.0.1:55441/debugclinic_f01_test",
  BETTER_AUTH_URL: "http://127.0.0.1:5173",
  BETTER_AUTH_SECRET:
    "f01-clock-synthetic-secret-at-least-thirty-two-characters",
  AI_PROVIDER: "soc",
  SOC_LLM_ENDPOINT: "https://provider.example.test/chat/completions",
  SOC_LLM_MODEL: "f01-synthetic-model",
  SOC_LLM_API_KEY: "f01-synthetic-key",
  AI_TIMEOUT_MS: "5000",
  AI_MAX_RETRIES: "3",
  LOG_LEVEL: "silent",
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("F01 public remote retry timing under a controlled scheduler", () => {
  for (const fault of ["network", 429, 500] as const) {
    it(`B09 ${fault} makes requests at0/100/300/700ms then stops`, async () => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), delay);
        return controller.signal;
      });
      const times: number[] = [];
      const transport = vi.fn<typeof fetch>().mockImplementation(async () => {
        times.push(Date.now());
        if (fault === "network")
          throw new TypeError("synthetic transient failure");
        return new Response(null, { status: fault });
      });
      const operation = new SocLlmProvider(config, transport).generateQuestion({
        topic: f01Topic,
      });
      const observed = expect(operation).rejects.toMatchObject({ status: 503 });
      await vi.advanceTimersByTimeAsync(700);
      await observed;
      expect(times).toEqual([0, 100, 300, 700]);
      expect(transport).toHaveBeenCalledTimes(4);
    });
  }
});
