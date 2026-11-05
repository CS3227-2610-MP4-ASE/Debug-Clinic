// Independent acceptance data: never derive expected values from app schemas.
export const f01Origin = "http://127.0.0.1:5173";
export const f01Topic = "Python lists and for loops";
export const f01Draft = {
  title: "Sum every list element",
  problemStatement:
    "The function should sum all numbers in a list. Find and fix the conceptual bug.",
  buggyCode:
    "def total(numbers):\n    result = 0\n    for number in numbers[:-1]:\n        result += number\n    return result",
  expectedBehavior: "total([2, 4, 6]) returns 12; total([]) returns 0.",
  bugExplanation:
    "The slice excludes the last element, so the loop omits one number.",
  correctedSolution:
    "def total(numbers):\n    result = 0\n    for number in numbers:\n        result += number\n    return result",
};
export const f01Edited = {
  title: "Sum all values",
  problemStatement:
    "Fix the function so every list value contributes to its sum.",
  buggyCode: "def total(values):\n    return sum(values[:-1])\n",
  expectedBehavior: "total([3, 5]) returns 8; total([]) returns 0.",
  bugExplanation: "Iterate over the complete list, including its last element.",
  correctedSolution: "def total(values):\n    return sum(values)\n",
};
export const f01Output = {
  schemaVersion: "f01-question-v1",
  kind: "draft",
  language: "python",
  level: "beginner-undergraduate",
  draft: f01Draft,
};
export const f01Generation = {
  id: "f01-generation",
  provider: "fake",
  model: null,
  promptVersion: "fake-question-v1",
  generatedAt: "2026-11-05T01:00:00.000Z",
};
export const f01Saved = {
  id: "f01-saved",
  status: "DRAFT",
  topic: f01Topic,
  ...f01Edited,
  provenance: {
    generationId: f01Generation.id,
    provider: "fake",
    model: null,
    promptVersion: "fake-question-v1",
    generatedAt: f01Generation.generatedAt,
    association: "instructor-reported",
  },
  createdAt: "2026-11-05T01:01:00.000Z",
};
export const f01FieldLimits = {
  title: 120,
  problemStatement: 2000,
  buggyCode: 4000,
  expectedBehavior: 1500,
  bugExplanation: 2000,
  correctedSolution: 4000,
};
export const f01Owner = {
  id: "f01-owner",
  name: "F01 Owner",
  email: "f01-owner@example.test",
  role: "INSTRUCTOR" as const,
};
export const f01Learner = {
  id: "f01-learner",
  name: "F01 Learner",
  email: "f01-learner@example.test",
  role: "LEARNER" as const,
};
