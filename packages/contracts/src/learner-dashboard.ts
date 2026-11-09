import { z } from "zod";
import { DraftIdSchema } from "./primitives.js";

export const LearnerDashboardResponseSchema = z
  .object({
    attemptedCount: z.number().int().nonnegative(),
    completedCount: z.number().int().nonnegative(),
    inProgressCount: z.number().int().nonnegative(),
    recentDrafts: z
      .array(
        z
          .object({
            exerciseId: DraftIdSchema,
            title: z.string().min(1),
            updatedAt: z.string().datetime(),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();

export type LearnerDashboardResponse = z.infer<
  typeof LearnerDashboardResponseSchema
>;
