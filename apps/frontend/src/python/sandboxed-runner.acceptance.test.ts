// Independent protocol/resource checks; fake DOM/transport supplement real E2E.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function fixture() {
  const receive: Array<(event: MessageEvent) => void> = [];
  const frames: Array<{
    contentWindow: { postMessage: ReturnType<typeof vi.fn> };
    style: object;
    setAttribute: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    srcdoc?: string;
  }> = [];
  let identifier = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `id-${++identifier}` });
  vi.stubGlobal("document", {
    createElement: () => {
      const frame = {
        contentWindow: { postMessage: vi.fn() },
        style: {},
        setAttribute: vi.fn(),
        remove: vi.fn(),
      };
      frames.push(frame);
      return frame;
    },
    body: { append: vi.fn() },
  });
  vi.stubGlobal("window", {
    location: { origin: "http://127.0.0.1:51819" },
    addEventListener: (
      _type: string,
      callback: (event: MessageEvent) => void,
    ) => receive.push(callback),
    removeEventListener: vi.fn(),
    setTimeout,
  });
  const { startPythonRun } = await import("./sandboxed-runner.js");
  const onState = vi.fn(),
    onOutput = vi.fn();
  const start = () =>
    startPythonRun({
      code: "print('real tests elsewhere')",
      tests: "",
      stdin: "",
      mode: "run",
      onState,
      onOutput,
    });
  const emit = (
    data: unknown,
    options: { origin?: string; source?: unknown; listener?: number } = {},
  ) =>
    receive[options.listener ?? receive.length - 1]!({
      origin: options.origin ?? "null",
      source: options.source ?? frames.at(-1)!.contentWindow,
      data,
    } as MessageEvent);
  return { frames, start, emit, onState, onOutput };
}

describe("independent runner bridge and lifecycle", () => {
  it("ignores wrong source/origin/nonce/runId/prototype and unknown channel", async () => {
    const f = await fixture();
    const stop = f.start();
    const valid = {
      nonce: "id-1",
      runId: "id-2",
      type: "output",
      channel: "stdout",
      text: "must-not-appear",
    };
    f.emit(valid, { source: {} });
    f.emit(valid, { origin: "http://127.0.0.1:51819" });
    f.emit({ ...valid, nonce: "wrong" });
    f.emit({ ...valid, runId: "wrong" });
    f.emit(Object.assign(Object.create(null), valid));
    f.emit({ ...valid, channel: "unknown" });
    expect(f.onOutput).not.toHaveBeenCalled();
    expect(f.onState.mock.calls).toEqual([["loading"]]);
    stop();
    expect(f.frames[0]!.remove).toHaveBeenCalledOnce();
  });
  it("bounds aggregate ASCII bridge output and error messages, disposing terminal state", async () => {
    const f = await fixture();
    f.start();
    const base = { nonce: "id-1", runId: "id-2" };
    for (let n = 0; n < 3; n++)
      f.emit({
        ...base,
        type: "output",
        channel: "stdout",
        text: "x".repeat(40_000),
      });
    expect(
      f.onOutput.mock.calls.reduce(
        (sum, call) => sum + (call[1] as string).length,
        0,
      ),
    ).toBeLessThanOrEqual(65536);
    f.emit({ ...base, type: "error", message: "e".repeat(20_000) });
    expect(f.onState.mock.calls.at(-1)).toEqual(["error", "e".repeat(8_000)]);
    expect(f.frames[0]!.remove).toHaveBeenCalledOnce();
    const calls = f.onOutput.mock.calls.length;
    f.emit({ ...base, type: "output", channel: "stdout", text: "stale" });
    expect(f.onOutput).toHaveBeenCalledTimes(calls);
  });
  it("separates the 30-second initialization deadline from the five-second execution deadline", async () => {
    const f = await fixture();
    f.start();
    vi.advanceTimersByTime(29_999);
    expect(f.frames[0]!.remove).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(f.onState.mock.calls.at(-1)?.[0]).toBe("timeout");
    f.start();
    f.emit({ nonce: "id-3", runId: "id-4", type: "running" });
    vi.advanceTimersByTime(4_999);
    expect(f.onState.mock.calls.at(-1)?.[0]).toBe("running");
    vi.advanceTimersByTime(1);
    expect(f.onState.mock.calls.at(-1)?.[0]).toBe("timeout");
    expect(f.frames[1]!.remove).toHaveBeenCalledOnce();
  });
  it("old run listeners cannot inject into a newly started frame", async () => {
    const f = await fixture();
    const stop = f.start();
    const old = f.frames[0]!.contentWindow;
    stop();
    f.start();
    f.emit(
      {
        nonce: "id-1",
        runId: "id-2",
        type: "output",
        channel: "stdout",
        text: "old",
      },
      { source: old, listener: 0 },
    );
    f.emit(
      { nonce: "id-1", runId: "id-2", type: "completed" },
      { source: old },
    );
    expect(f.onOutput).not.toHaveBeenCalled();
    expect(f.frames[1]!.remove).not.toHaveBeenCalled();
  });
});
