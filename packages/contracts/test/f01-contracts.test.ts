import { describe, expect, it } from "vitest";
import {
  DraftListQuerySchema,
  DraftIdSchema,
  QuestionTopicSchema,
  QuestionFieldsSchema,
  QuestionGenerationResultSchema,
  QuestionOutputSchema,
  SaveDraftRequestSchema,
} from "../src/index.js";

const fields = {
  title: " Count values ",
  problemStatement: " Fix the loop ",
  buggyCode: "  count = 1\n",
  expectedBehavior: " Count every value ",
  bugExplanation: " The count starts too high ",
  correctedSolution: "  count = 0\n",
};
const draftOutput = {
  schemaVersion: "f01-question-v2",
  kind: "draft",
  language: "python",
  draft: fields,
};
describe("F01 contracts", () => {
  it("accepts the strict v2 Python draft and normalizes only prose", () => {
    expect(QuestionOutputSchema.parse(draftOutput)).toEqual({
      ...draftOutput,
      draft: {
        ...fields,
        title: "Count values",
        problemStatement: "Fix the loop",
        expectedBehavior: "Count every value",
        bugExplanation: "The count starts too high",
      },
    });
  });
  it.each(["vague", "non_python", "unrelated", "unsuitable"])(
    "accepts the strict v2 refusal %s",
    (reason) => {
      const output = {
        schemaVersion: "f01-question-v2",
        kind: "rejected",
        reason,
      };
      expect(QuestionOutputSchema.parse(output)).toEqual(output);
    },
  );
  it.each([
    { ...draftOutput, schemaVersion: "f01-question-v1" },
    { ...draftOutput, level: "beginner-undergraduate" },
    {
      schemaVersion: "f01-question-v2",
      kind: "rejected",
      reason: "out_of_level",
    },
  ])("rejects obsolete provider grammar %#", (output) => {
    expect(QuestionOutputSchema.safeParse(output).success).toBe(false);
  });
  it("normalizes prose while preserving code bytes and rejects blank code", () => {
    expect(QuestionFieldsSchema.parse(fields)).toEqual({
      ...fields,
      title: "Count values",
      problemStatement: "Fix the loop",
      expectedBehavior: "Count every value",
      bugExplanation: "The count starts too high",
    });
    expect(
      QuestionFieldsSchema.safeParse({ ...fields, buggyCode: " \n " }).success,
    ).toBe(false);
  });
  it.each([
    ["title", 120],
    ["problemStatement", 2000],
    ["buggyCode", 4000],
    ["expectedBehavior", 1500],
    ["bugExplanation", 2000],
    ["correctedSolution", 4000],
  ] as const)("enforces the %s maximum", (field, maximum) => {
    expect(
      QuestionFieldsSchema.safeParse({
        ...fields,
        [field]: "x".repeat(maximum),
      }).success,
    ).toBe(true);
    expect(
      QuestionFieldsSchema.safeParse({
        ...fields,
        [field]: "x".repeat(maximum + 1),
      }).success,
    ).toBe(false);
    expect(
      QuestionFieldsSchema.safeParse({
        ...fields,
        [field]: "😀".repeat(maximum / 2),
      }).success,
    ).toBe(true);
    expect(
      QuestionFieldsSchema.safeParse({
        ...fields,
        [field]: "😀".repeat(maximum / 2) + "x",
      }).success,
    ).toBe(false);
  });
  it("counts topic and ID bounds as JavaScript UTF-16 length", () => {
    expect(QuestionTopicSchema.safeParse("😀".repeat(149) + "x").success).toBe(
      true,
    );
    expect(QuestionTopicSchema.safeParse("😀".repeat(150)).success).toBe(true);
    expect(QuestionTopicSchema.safeParse("😀".repeat(150) + "x").success).toBe(
      false,
    );
    expect(DraftIdSchema.safeParse("😀".repeat(64)).success).toBe(true);
    expect(DraftIdSchema.safeParse("😀".repeat(65)).success).toBe(false);
  });
  it.each(["Python\u0000", "Python\ud800"])(
    "rejects storage-unsafe text %j",
    (topic) => {
      expect(QuestionTopicSchema.safeParse(topic).success).toBe(false);
      expect(
        QuestionFieldsSchema.safeParse({ ...fields, buggyCode: topic }).success,
      ).toBe(false);
    },
  );
  it("rejects authority-bearing and unknown keys at every input/output level", () => {
    const request = {
      topic: "Python loops",
      draft: fields,
      generationId: "g1",
    };
    expect(
      SaveDraftRequestSchema.safeParse({ ...request, ownerId: "other" })
        .success,
    ).toBe(false);
    expect(
      SaveDraftRequestSchema.safeParse({
        ...request,
        draft: { ...fields, approved: true },
      }).success,
    ).toBe(false);
    expect(
      QuestionOutputSchema.safeParse({
        schemaVersion: "f01-question-v2",
        kind: "rejected",
        reason: "vague",
        message: "provider text",
      }).success,
    ).toBe(false);
  });
  it.each(["4294967296", "4294967297", "9007199254740991", "-1", "1.5", "NaN"])(
    "rejects unsafe pagination %s",
    (offset) => {
      expect(DraftListQuerySchema.safeParse({ offset }).success).toBe(false);
    },
  );
  it("bounds normalized token usage to storage and defaults pagination to zero", () => {
    expect(DraftListQuerySchema.parse({})).toEqual({ offset: 0 });
    expect(DraftListQuerySchema.parse({ offset: "4294967295" })).toEqual({
      offset: 4_294_967_295,
    });
    const result = {
      output: {
        schemaVersion: "f01-question-v2",
        kind: "rejected",
        reason: "vague",
      },
      inputTokens: 2_147_483_647,
      outputTokens: null,
    };
    expect(QuestionGenerationResultSchema.safeParse(result).success).toBe(true);
    expect(
      QuestionGenerationResultSchema.safeParse({ ...result, preview: fields })
        .success,
    ).toBe(false);
    expect(
      QuestionGenerationResultSchema.safeParse({
        ...result,
        inputTokens: 2_147_483_648,
      }).success,
    ).toBe(false);
  });
});
