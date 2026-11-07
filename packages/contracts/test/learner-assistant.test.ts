import { describe, expect, it } from "vitest";
import { AssistantMessageRequestSchema } from "../src/index.js";

const valid = {
  requestId: "2a7504c3-6920-4c0e-8320-dff0aef1895f",
  expectedRevision: 0,
  expectedExerciseVersionId: "version-1",
  action: "MESSAGE" as const,
  message: "Why is the final item missing?",
  context: { shareCode: true, shareReasoning: false, shareOutput: false },
  sharedCode: "total = sum(values[:-1])",
};

describe("learner assistant contract", () => {
  it("accepts a bounded, explicit context snapshot", () => {
    expect(AssistantMessageRequestSchema.parse(valid).sharedCode).toBe(
      valid.sharedCode,
    );
  });

  it("counts UTF-16 code units and rejects a surrogate pair beyond the limit", () => {
    const exact = { ...valid, message: "a".repeat(1_998) + "🧭" };
    expect(AssistantMessageRequestSchema.safeParse(exact).success).toBe(true);
    expect(
      AssistantMessageRequestSchema.safeParse({
        ...valid,
        message: `${exact.message}a`,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown fields and content sent while its context category is off", () => {
    expect(
      AssistantMessageRequestSchema.safeParse({ ...valid, role: "ASSISTANT" })
        .success,
    ).toBe(false);
    expect(
      AssistantMessageRequestSchema.safeParse({
        ...valid,
        sharedOutput: "not consented",
      }).success,
    ).toBe(false);
  });

  it("requires explicit learner text for ordinary messages", () => {
    expect(
      AssistantMessageRequestSchema.safeParse({ ...valid, message: "   " })
        .success,
    ).toBe(false);
  });
});
