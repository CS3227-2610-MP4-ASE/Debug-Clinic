import { describe, expect, it } from "vitest";
import { workspace } from "./actions.js";

const learner = {
  id: "learner",
  name: "Learner",
  email: "learner@example.test",
  role: "LEARNER" as const,
};
const instructor = {
  id: "instructor",
  name: "Instructor",
  email: "instructor@example.test",
  role: "INSTRUCTOR" as const,
};

describe("safe post-sign-in workspace", () => {
  it("defaults learners to Home and keeps valid learner return paths", () => {
    expect(workspace(learner)).toBe("/learner");
    expect(workspace(learner, "/learner/questions/question-1")).toBe(
      "/learner/questions/question-1",
    );
    expect(workspace(learner, "/learner/question")).toBe("/learner/question");
  });

  it("keeps role boundaries and rejects external or malformed destinations", () => {
    expect(workspace(learner, "/instructor/questions/new")).toBe("/learner");
    expect(workspace(instructor, "/instructor/questions/new")).toBe(
      "/instructor/questions/new",
    );
    expect(workspace(learner, "//attacker.example/path")).toBe("/learner");
    expect(workspace(learner, "/learner/../instructor")).toBe("/learner");
  });
});
