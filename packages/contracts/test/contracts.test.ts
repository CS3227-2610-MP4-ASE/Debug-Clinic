import { describe, expect, it } from "vitest";

import {
  AiHintRequestSchema,
  AiHintResponseSchema,
  ProfileUpdateSchema,
  RoleSchema,
} from "../src/index.js";

describe("shared contracts", () => {
  it("accepts valid roles and AI payloads", () => {
    expect(RoleSchema.parse("INSTRUCTOR")).toBe("INSTRUCTOR");
    expect(
      AiHintRequestSchema.parse({
        attemptId: "attempt-1",
        proposedCode: "print('fixed')",
        reasoning: "The variable was referenced before assignment.",
        stage: 2,
      }).stage,
    ).toBe(2);
    expect(
      AiHintResponseSchema.parse({
        requestId: "request-1",
        stage: 2,
        kind: "HINT",
        message: "Trace where the value is first assigned.",
        promptVersion: "hint-v1",
      }).kind,
    ).toBe("HINT");
  });

  it("rejects invalid hint stages", () => {
    expect(() =>
      AiHintRequestSchema.parse({
        attemptId: "attempt-1",
        proposedCode: "pass",
        reasoning: "Unsure",
        stage: 4,
      }),
    ).toThrow();
  });

  it("rejects client-controlled role escalation", () => {
    expect(() =>
      ProfileUpdateSchema.parse({ name: "Learner", role: "INSTRUCTOR" }),
    ).toThrow();
  });
});
