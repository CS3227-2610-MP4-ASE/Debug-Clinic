import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../src/auth/policy.js";
import { normalizationPlan } from "../../../scripts/normalize-auth-identities.js";

describe("canonical authentication identity", () => {
  it.each([
    ["  Learner@Example.TEST  ", "learner@example.test"],
    ["\u00a0\u2003INSTRUCTOR@EXAMPLE.TEST\ufeff", "instructor@example.test"],
    ["İ@example.test", "i\u0307@example.test"],
  ])("canonicalizes JavaScript whitespace and case", (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
    expect(normalizeEmail(expected)).toBe(expected);
  });
  it("preserves dots and aliases", () => {
    expect(
      new Set(
        [
          "a.b@example.test",
          "ab@example.test",
          "a+tag@example.test",
          "a@example.test",
        ].map(normalizeEmail),
      ).size,
    ).toBe(4);
  });
  it("preflights every row and exposes only opaque collision IDs", () => {
    const plan = normalizationPlan([
      { id: "one", email: " A@EXAMPLE.TEST " },
      { id: "two", email: "a@example.test" },
      { id: "three", email: " B@EXAMPLE.TEST " },
    ]);
    expect(plan.collisions).toEqual([["one", "two"]]);
    expect(plan.changes).toEqual([
      { id: "one", before: " A@EXAMPLE.TEST ", after: "a@example.test" },
      { id: "three", before: " B@EXAMPLE.TEST ", after: "b@example.test" },
    ]);
  });
});
