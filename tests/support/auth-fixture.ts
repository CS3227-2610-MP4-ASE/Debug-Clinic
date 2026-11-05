import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { vi } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import {
  createDebugClinicAuth,
  type DebugClinicAuth,
} from "../../apps/backend/src/auth/auth.js";
import type {
  AuthEmail,
  AuthEmailSender,
} from "../../apps/backend/src/auth/email.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import type { DebugClinicPrisma } from "../../apps/backend/src/db/client.js";
import { testDatabaseUrl } from "./database-target.js";
export { testDatabaseUrl } from "./database-target.js";
export const password = "Synthetic-auth-password-12345";
export function database(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
  });
}
export function fixture(prisma: DebugClinicPrisma, sender?: AuthEmailSender) {
  const outbox: AuthEmail[] = [];
  const config = readEnv({
    NODE_ENV: "test",
    APP_ORIGIN: "http://127.0.0.1:5173",
    CORS_ORIGINS: "http://127.0.0.1:5173",
    DATABASE_URL: testDatabaseUrl(),
    BETTER_AUTH_URL: "http://127.0.0.1:5173",
    BETTER_AUTH_SECRET: "synthetic-auth-secret-at-least-32-characters",
    GOOGLE_CLIENT_ID: "synthetic-google-client",
    GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
    SMTP_HOST: "smtp.example.test",
    SMTP_USER: "auth@example.test",
    SMTP_PASSWORD: "synthetic",
    EMAIL_FROM: "auth@example.test",
    LOG_LEVEL: "silent",
  });
  const auth = createDebugClinicAuth(
    config,
    prisma,
    sender ??
      (async (message) => {
        outbox.push(message);
      }),
  );
  return { auth, config, outbox };
}
export function email(): string {
  return `acceptance-${randomUUID()}@example.test`;
}
export function cookies(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
export function post(
  auth: DebugClinicAuth,
  path: string,
  body: Record<string, unknown>,
  cookie?: string,
  origin = "http://127.0.0.1:5173",
) {
  return auth.handler(
    new Request(`http://127.0.0.1:5173/api/auth${path}`, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}
export function link(
  outbox: AuthEmail[],
  recipient: string,
  type: "Verify" | "Reset",
): URL {
  const message = outbox
    .filter((entry) => entry.to === recipient && entry.subject.includes(type))
    .at(-1);
  if (!message) throw new Error("Expected captured test message");
  return new URL(message.text.match(/https?:\/\/\S+/)![0]);
}
export async function verify(
  auth: DebugClinicAuth,
  outbox: AuthEmail[],
  recipient: string,
) {
  return auth.handler(new Request(link(outbox, recipient, "Verify")));
}
export async function googleDouble(
  auth: DebugClinicAuth,
  recipient: string,
  subject = randomUUID(),
  verified = true,
) {
  const provider = (await auth.$context).socialProviders.find(
    (entry) => entry.id === "google",
  )!;
  const exchange = vi
    .spyOn(provider, "validateAuthorizationCode")
    .mockResolvedValue({
      accessToken: "synthetic",
      scopes: ["email", "profile", "openid"],
    });
  const profile = vi.spyOn(provider, "getUserInfo").mockResolvedValue({
    user: {
      email: recipient,
      emailVerified: verified,
      name: "Synthetic Google",
    },
    data: { sub: subject, email: recipient, email_verified: verified },
  });
  return {
    subject,
    restore() {
      exchange.mockRestore();
      profile.mockRestore();
    },
  };
}
export async function googleStart(
  auth: DebugClinicAuth,
  role?: "LEARNER" | "INSTRUCTOR",
) {
  const start = await post(auth, "/sign-in/social", {
    provider: "google",
    requestSignUp: role !== undefined,
    ...(role ? { additionalData: { registrationRole: role } } : {}),
  });
  if (start.status !== 200) throw new Error("Synthetic Google start rejected");
  const body = (await start.json()) as { url: string };
  const state = new URL(body.url).searchParams.get("state")!;
  return {
    start,
    callback: `http://127.0.0.1:5173/api/auth/callback/google?code=synthetic&state=${encodeURIComponent(state)}`,
    cookie: cookies(start),
  };
}
export async function googleFinish(
  auth: DebugClinicAuth,
  flow: Awaited<ReturnType<typeof googleStart>>,
  cookie = flow.cookie,
) {
  return auth.handler(new Request(flow.callback, { headers: { cookie } }));
}
export function barrier(parties = 2) {
  let arrived = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrived += 1;
    if (arrived === parties) release();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        ready,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Race barrier timed out")),
            3000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
}
