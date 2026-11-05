import type { Request } from "express";

import { CurrentUserSchema, type CurrentUser } from "@debugclinic/contracts";

import type { DebugClinicAuth } from "./auth.js";
import { DependencyUnavailableError } from "../lib/errors.js";

export type SessionResolver = (request: Request) => Promise<CurrentUser | null>;

function toWebHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

export function createSessionResolver(auth: DebugClinicAuth): SessionResolver {
  return async (request) => {
    let session;
    try {
      session = await auth.api.getSession({ headers: toWebHeaders(request) });
    } catch {
      throw new DependencyUnavailableError(
        "Session service is temporarily unavailable",
      );
    }
    if (!session) return null;

    const parsed = CurrentUserSchema.safeParse(session.user);
    return parsed.success ? parsed.data : null;
  };
}
