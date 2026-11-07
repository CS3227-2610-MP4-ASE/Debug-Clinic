import { AssistantStateResponseSchema } from "@debugclinic/contracts";
import type { Page } from "@playwright/test";

/** Empty, private assistant state for a published synthetic exercise version. */
export async function mockEmptyLearnerAssistantState(
  page: Page,
  exerciseId: string,
  exerciseVersionId: string,
) {
  const response = AssistantStateResponseSchema.parse({
    assistant: {
      exerciseVersionId,
      revision: 0,
      unlockedLevel: 1,
      hasSuccessfulReply: false,
      readOnly: false,
      expiresAt: null,
      messages: [],
    },
  });
  await page.route(
    `**/api/v1/learner/questions/${encodeURIComponent(exerciseId)}/assistant`,
    (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ json: response })
        : route.abort(),
  );
}
