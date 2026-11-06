import { z } from "zod";

export const DraftIdSchema = z
  .string()
  .min(1)
  .refine((value) => value.length <= 128, {
    message: "Must contain at most 128 characters",
  });

export const RevisionSchema = z.number().int().min(0).max(2_147_483_647);
