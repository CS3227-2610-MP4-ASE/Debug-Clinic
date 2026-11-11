import { afterEach, describe, expect, it, vi } from "vitest";
import { readLearnerGrade, saveSubmissionGrade } from "./grading.js";

const attemptId = "final-attempt";
const request = {
  actorId: "learner-one",
  signal: new AbortController().signal,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("grading HTTP client", () => {
  it("sends the admitted actor and disables cached private responses", async () => {
    const fetch = vi.fn(async () => Response.json({ grade: { score: 6 } }));
    vi.stubGlobal("fetch", fetch);
    await expect(readLearnerGrade(request, attemptId)).resolves.toEqual({
      grade: { score: 6 },
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/learner/submissions/final-attempt/grade",
      expect.objectContaining({
        credentials: "include",
        cache: "no-store",
        headers: expect.objectContaining({
          "X-DebugClinic-Actor": "learner-one",
        }),
      }),
    );
  });

  it("times out a compact read even if the response headers already arrived", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new ReadableStream())),
    );
    const observed = expect(
      readLearnerGrade(request, attemptId),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/timed out/i),
    });
    await vi.advanceTimersByTimeAsync(4_000);
    await observed;
  });

  it("distinguishes a trusted rejection from an uncertain write reply", async () => {
    const rejection = {
      error: {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "Try again.",
        requestId: "grading-1",
        mutationOutcome: "NOT_APPLIED",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(rejection, { status: 503 }))
        .mockResolvedValueOnce(Response.json(rejection, { status: 500 }))
        .mockResolvedValueOnce(Response.json({ grade: { score: 6 } })),
    );
    const save = () =>
      saveSubmissionGrade(request, attemptId, {
        score: 6,
        expectedRevision: null,
      });
    await expect(save()).rejects.toMatchObject({ outcome: "NOT_APPLIED" });
    await expect(save()).rejects.toMatchObject({ outcome: "UNKNOWN" });
    await expect(save()).rejects.toMatchObject({ outcome: "UNKNOWN" });
  });

  it("recognizes the terminal revision limit only on a confirmed conflict", async () => {
    const conflict = (mutationOutcome: "NOT_APPLIED" | "UNKNOWN") =>
      Response.json(
        {
          error: {
            code: "CONFLICT",
            message:
              "The grade changed. Check the current grade before saving.",
            requestId: "grading-2",
            mutationOutcome,
            details: [
              {
                path: "revision",
                message: "The grade revision limit was reached.",
              },
            ],
          },
        },
        { status: 409 },
      );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(conflict("NOT_APPLIED"))
        .mockResolvedValueOnce(conflict("UNKNOWN")),
    );
    const save = () =>
      saveSubmissionGrade(request, attemptId, {
        score: 6,
        expectedRevision: 2_147_483_647,
      });
    await expect(save()).rejects.toMatchObject({
      outcome: "NOT_APPLIED",
      revisionLimit: true,
      message: "The grade revision limit was reached.",
    });
    await expect(save()).rejects.toMatchObject({
      outcome: "UNKNOWN",
      revisionLimit: false,
    });
  });

  it("honors valid Retry-After delay and date values on compact reads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
    const limited = (header: string) =>
      new Response(null, { status: 429, headers: { "Retry-After": header } });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(limited("12"))
        .mockResolvedValueOnce(limited("Tue, 10 Nov 2026 00:00:07 GMT"))
        .mockResolvedValueOnce(limited("2.5")),
    );
    await expect(readLearnerGrade(request, attemptId)).rejects.toMatchObject({
      retryAfterMs: 12_000,
    });
    await expect(readLearnerGrade(request, attemptId)).rejects.toMatchObject({
      retryAfterMs: 7_000,
    });
    await expect(readLearnerGrade(request, attemptId)).rejects.toMatchObject({
      retryAfterMs: undefined,
    });
  });
});
