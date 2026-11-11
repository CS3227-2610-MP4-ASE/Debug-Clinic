import { LearnerSubmissionGradeResponseSchema } from "@debugclinic/contracts";
import type { Page } from "@playwright/test";

export async function mockAwaitingLearnerGrade(page: Page) {
  const result = LearnerSubmissionGradeResponseSchema.parse({ grade: null });
  await page.route("**/api/v1/learner/submissions/*/grade", (route) =>
    route.fulfill({ json: result }),
  );
}
