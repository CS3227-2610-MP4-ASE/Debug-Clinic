// Independent setup guard tests. Mock test registration and DB constructors;
// invalid targets must fail before any client or cleanup side effect.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  before: undefined as (() => void) | undefined,
  after: undefined as (() => Promise<void>) | undefined,
  construct: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@playwright/test", () => ({
  test: Object.assign(vi.fn(), {
    skip: vi.fn(),
    use: vi.fn(),
    beforeAll: (callback: () => void) => {
      hooks.before = callback;
    },
    afterAll: (callback: () => Promise<void>) => {
      hooks.after = callback;
    },
  }),
  expect: {},
}));
vi.mock("../../../generated/prisma/client.js", () => ({
  PrismaClient: class {
    constructor(...args: unknown[]) {
      hooks.construct(...args);
    }
    $disconnect = hooks.disconnect;
  },
}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));

const keys = [
  "DATABASE_URL",
  "DATABASE_URL_POOLED",
  "TEST_DATABASE_URL",
  "E2E_TEST_DATABASE_URL",
] as const;
const owned =
  "postgresql://debugclinic:debugclinic@127.0.0.1:54603/debugclinic_pr10_test";
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  hooks.before = undefined;
  hooks.after = undefined;
  for (const key of keys) vi.stubEnv(key, owned);
  vi.stubEnv("E2E_AUTH_COMPLETION", "1");
});
afterEach(() => {
  vi.unstubAllEnvs();
});
async function collect() {
  await import("../../../tests/e2e/learner-workspace-composed.spec.js");
  expect(hooks.construct).not.toHaveBeenCalled(); // module evaluation is side-effect free
  expect(hooks.before).toBeTypeOf("function");
  expect(hooks.after).toBeTypeOf("function");
}
describe("independent PR10 composed target guard", () => {
  it("disabled opt-in with absent URLs performs neither construction nor cleanup", async () => {
    vi.stubEnv("E2E_AUTH_COMPLETION", undefined);
    for (const key of keys) vi.stubEnv(key, undefined);
    await collect();
    hooks.before!();
    await hooks.after!();
    expect(hooks.construct).not.toHaveBeenCalled();
    expect(hooks.disconnect).not.toHaveBeenCalled();
  });
  for (const key of keys) {
    for (const kind of ["missing", "mismatched"] as const) {
      it(`enabled opt-in rejects ${kind} ${key} without creating or cleaning a client`, async () => {
        vi.stubEnv(
          key,
          kind === "missing"
            ? undefined
            : "postgresql://synthetic:synthetic@127.0.0.1:54603/other_test",
        );
        await collect();
        expect(() => hooks.before!()).toThrow();
        await hooks.after!();
        expect(hooks.construct).not.toHaveBeenCalled();
        expect(hooks.disconnect).not.toHaveBeenCalled();
      });
    }
  }
  for (const target of [
    "postgresql://synthetic:synthetic@remote.example.test/test_test",
    "postgresql://synthetic:synthetic@127.0.0.1:54603/production",
    "postgresql://synthetic:synthetic@127.0.0.1:54603/demo_test?host=remote.example.test",
    "postgresql://synthetic:synthetic@127.0.0.1:54603/demo_test#fragment",
    "mysql://synthetic:synthetic@127.0.0.1:54603/demo_test",
  ]) {
    it(`rejects unsafe matching target ${new URL(target).protocol} ${new URL(target).hostname}${new URL(target).pathname}${new URL(target).search}${new URL(target).hash}`, async () => {
      for (const key of keys) vi.stubEnv(key, target);
      await collect();
      expect(() => hooks.before!()).toThrow("Unsafe synthetic database target");
      await hooks.after!();
      expect(hooks.construct).not.toHaveBeenCalled();
      expect(hooks.disconnect).not.toHaveBeenCalled();
    });
  }
  it("matching explicit owned target initializes only in setup and disconnects once", async () => {
    await collect();
    hooks.before!();
    expect(hooks.construct).toHaveBeenCalledTimes(1);
    await hooks.after!();
    expect(hooks.disconnect).toHaveBeenCalledTimes(1);
    await hooks.after!();
    expect(hooks.disconnect).toHaveBeenCalledTimes(1);
  });
});
