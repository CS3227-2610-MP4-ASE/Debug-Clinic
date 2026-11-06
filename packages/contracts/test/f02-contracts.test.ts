import { describe, expect, it } from "vitest";
import * as contracts from "../src/index.js";

const fields = {
  title: "Sum all values",
  problemStatement:
    "Fix the function so every list value contributes to its sum.",
  buggyCode: "def total(values):\n    return sum(values[:-1])\n",
  expectedBehavior: "total([3, 5]) returns 8; total([]) returns 0.",
  bugExplanation: "The slice omits the last value.",
  correctedSolution: "def total(values):\n    return sum(values)\n",
};

describe("F02 contracts", () => {
  it("normalizes reviewed prose, preserves code and requires confirmed publication", () => {
    const schema = contracts.PublishQuestionRequestSchema;
    const input = {
      source: "saved",
      id: "question-a",
      expectedRevision: 0,
      topic: "  Python lists and for loops  ",
      draft: { ...fields, title: "  Sum all values  " },
      reviewConfirmed: true,
    };
    expect(schema.parse(input)).toEqual({
      ...input,
      topic: "Python lists and for loops",
      draft: fields,
    });
    expect(schema.safeParse({ ...input, reviewConfirmed: false }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...input, authorId: "forged" }).success).toBe(
      false,
    );
  });
});

for (const [field, maximum] of Object.entries({
  topic: 300,
  title: 120,
  problemStatement: 2000,
  buggyCode: 4000,
  expectedBehavior: 1500,
  bugExplanation: 2000,
  correctedSolution: 4000,
})) {
  describe(`F02 storage and UTF16 ${field}`, () => {
    const parse = (value: unknown) =>
      contracts.SaveQuestionChangesRequestSchema.safeParse({
        expectedRevision: 0,
        topic: field === "topic" ? value : "Python lists and for loops",
        draft: { ...fields, ...(field !== "topic" ? { [field]: value } : {}) },
      });
    for (const value of [
      undefined,
      null,
      1,
      "",
      "  ",
      "x\0y",
      "x\ud800y",
      "x\udc00y",
    ]) {
      it(`rejects invalid storage/type ${JSON.stringify(value)}`, () =>
        expect(parse(value).success).toBe(false));
    }
    for (const length of [1, maximum - 1, maximum]) {
      it(`accepts length ${length}`, () =>
        expect(parse("x".repeat(length)).success).toBe(true));
    }
    it("counts paired surrogates as two UTF16 units", () => {
      expect(parse("x".repeat(maximum - 2) + "😀").success).toBe(true);
      expect(parse("x".repeat(maximum - 1) + "😀").success).toBe(false);
      expect(parse("x".repeat(maximum + 1)).success).toBe(false);
    });
  });
}
it("requires canonical keys, bounded revisions and strict state timestamps/public allowlist", () => {
  const preview = {
    source: "preview",
    previewKey: "01234567-89ab-4cde-8fab-0123456789ab",
    generationId: "generation",
    topic: "Python lists",
    draft: fields,
    reviewConfirmed: true,
  };
  expect(
    contracts.PublishQuestionRequestSchema.safeParse(preview).success,
  ).toBe(true);
  expect(
    contracts.PublishQuestionRequestSchema.safeParse({
      ...preview,
      previewKey: preview.previewKey.toUpperCase(),
    }).success,
  ).toBe(false);
  for (const value of [-1, 2147483648, 0.5])
    expect(contracts.RevisionSchema.safeParse(value).success).toBe(false);
  for (const offset of ["-1", "1.5", "4294967296", ["0", "1"]])
    expect(
      contracts.PublishedQuestionListQuerySchema.safeParse({ offset }).success,
    ).toBe(false);
  const publicValue = {
    id: "question",
    versionId: "version",
    title: "Public",
    topic: "Python lists",
    instructorName: "Instructor",
    publishedAt: "2026-11-06T00:00:00.000Z",
    problemStatement: "Fix it",
    buggyCode: "print(1)",
    expectedBehavior: "Print 1",
  };
  expect(
    contracts.PublishedQuestionResponseSchema.safeParse({
      question: publicValue,
    }).success,
  ).toBe(true);
  expect(
    contracts.PublishedQuestionResponseSchema.safeParse({
      question: { ...publicValue, bugExplanation: "private" },
    }).success,
  ).toBe(false);
});
