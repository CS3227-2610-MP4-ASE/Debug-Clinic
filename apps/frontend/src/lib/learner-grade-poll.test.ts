import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startLearnerGradePoll } from "./learner-grade-poll.js";

describe("active learner grade polling", () => {
  let page: EventTarget & { visibilityState: DocumentVisibilityState };
  let browser: EventTarget;
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    page = Object.assign(new EventTarget(), {
      visibilityState: "visible" as DocumentVisibilityState,
    });
    browser = new EventTarget();
    vi.stubGlobal("document", page);
    vi.stubGlobal("window", browser);
  });

  afterEach(() => {
    dispose?.();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reads immediately and schedules from request starts with one read in flight", async () => {
    const read = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3_900));
    });
    const poll = startLearnerGradePoll(read);
    dispose = poll.dispose;
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    browser.dispatchEvent(new Event("online"));
    browser.dispatchEvent(new Event("focus"));
    poll.retry();
    await vi.advanceTimersByTimeAsync(2_999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("aborts on hide, resumes on visibility and aborts again on disposal", async () => {
    const read = vi.fn((signal: AbortSignal) => {
      return new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true }),
      );
    });
    const poll = startLearnerGradePoll(read);
    dispose = poll.dispose;
    const firstSignal = read.mock.calls[0]![0];
    page.visibilityState = "hidden";
    page.dispatchEvent(new Event("visibilitychange"));
    expect(firstSignal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    browser.dispatchEvent(new Event("online"));
    expect(read).toHaveBeenCalledTimes(1);
    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(read).toHaveBeenCalledTimes(2);
    poll.dispose();
    expect(read.mock.calls[1]![0].aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("coalesces event bursts and applies backoff to scheduled and explicit reads", async () => {
    const read = vi.fn(async (): Promise<number | void> => {});
    read.mockResolvedValueOnce(12_000);
    const poll = startLearnerGradePoll(read);
    dispose = poll.dispose;
    await vi.advanceTimersByTimeAsync(1);
    browser.dispatchEvent(new Event("focus"));
    poll.retry();
    await vi.advanceTimersByTimeAsync(11_998);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(2);
    browser.dispatchEvent(new Event("online"));
    poll.retry();
    await vi.advanceTimersByTimeAsync(999);
    expect(read).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(3);
  });
});
