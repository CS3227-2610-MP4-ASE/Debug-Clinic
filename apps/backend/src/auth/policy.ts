import { randomUUID } from "node:crypto";
import { defineRequestState } from "@better-auth/core/context";
import { RoleSchema, type Role } from "@debugclinic/contracts";
import { z } from "zod";

import type { DebugClinicPrisma } from "../db/client.js";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const registrationRole = defineRequestState<Role | null>(() => null);
export const pendingIntent = defineRequestState<string | null>(() => null);
export const INTENT_NAMESPACE = "debugclinic:google-intent:";
export const INTENT_SECONDS = 600;

const intentSchema = z
  .object({
    mode: z.enum(["sign-in", "register"]),
    role: RoleSchema.optional(),
    origin: z.string(),
    authOrigin: z.string(),
    returnTo: z.enum(["/learner", "/instructor"]).optional(),
  })
  .strict()
  .refine((value) => value.mode !== "register" || value.role !== undefined);

export type GoogleIntent = z.infer<typeof intentSchema>;

/** Root-client conditional deletion is deliberately independent of provisioning. */
export function createIntentStore(
  prisma: DebugClinicPrisma,
  origin: string,
  authOrigin: string,
) {
  return {
    async start(
      intent: Omit<GoogleIntent, "origin" | "authOrigin">,
    ): Promise<string> {
      const now = new Date();
      const expired = await prisma.verification.findMany({
        where: {
          identifier: { startsWith: INTENT_NAMESPACE },
          expiresAt: { lte: now },
        },
        select: { id: true },
        take: 100,
        orderBy: { expiresAt: "asc" },
      });
      if (expired.length)
        await prisma.verification.deleteMany({
          where: {
            id: { in: expired.map((row) => row.id) },
            identifier: { startsWith: INTENT_NAMESPACE },
            expiresAt: { lte: now },
          },
        });
      const id = randomUUID();
      await prisma.verification.create({
        data: {
          id,
          identifier: `${INTENT_NAMESPACE}${id}`,
          value: JSON.stringify({ ...intent, origin, authOrigin }),
          expiresAt: new Date(now.getTime() + INTENT_SECONDS * 1000),
        },
      });
      return id;
    },
    async claim(
      id: string,
      cookieId: string | null | undefined,
    ): Promise<GoogleIntent | null> {
      if (id !== cookieId || !z.uuid().safeParse(id).success) return null;
      const row = await prisma.verification.findUnique({ where: { id } });
      if (
        !row ||
        row.identifier !== `${INTENT_NAMESPACE}${id}` ||
        row.expiresAt <= new Date()
      )
        return null;
      let value: unknown;
      try {
        value = JSON.parse(row.value);
      } catch {
        return null;
      }
      const parsed = intentSchema.safeParse(value);
      if (
        !parsed.success ||
        parsed.data.origin !== origin ||
        parsed.data.authOrigin !== authOrigin
      )
        return null;
      const claimed = await prisma.verification.deleteMany({
        where: {
          id,
          identifier: row.identifier,
          value: row.value,
          expiresAt: { gt: new Date() },
        },
      });
      return claimed.count === 1 ? parsed.data : null;
    },
  };
}
