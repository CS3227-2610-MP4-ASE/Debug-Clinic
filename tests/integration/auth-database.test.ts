import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../../generated/prisma/client.js";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import type { AuthEmail } from "../../apps/backend/src/auth/email.js";
import { readEnv } from "../../apps/backend/src/config/env.js";
import { createApp } from "../../apps/backend/src/app.js";

const url = process.env["TEST_DATABASE_URL"];
if (
  !url ||
  !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_test")
) {
  throw new Error(
    "Integration tests require a loopback TEST_DATABASE_URL whose database name ends with _test",
  );
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173",
  DATABASE_URL: url,
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "isolated-auth-integration-secret-at-least-32-characters",
  SMTP_HOST: "smtp.example.test",
  SMTP_USER: "auth@example.test",
  SMTP_PASSWORD: "synthetic",
  EMAIL_FROM: "auth@example.test",
  LOG_LEVEL: "silent",
});
const outbox: AuthEmail[] = [];
const auth = createDebugClinicAuth(config, prisma, async (email) => {
  outbox.push(email);
});
const app = createApp({
  config,
  database: prisma,
  auth,
  profileUpdater: async (id, name) =>
    prisma.user.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    }),
});
const email = `integration-${randomUUID()}@example.test`;
const proxyEmail = `proxy-${randomUUID()}@example.test`;
const origin = config.appOrigin;
const password = "Test-password-unique-12345";
afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [email, proxyEmail] } },
  });
  await prisma.$disconnect();
});

describe("real PostgreSQL and Better Auth", () => {
  it("proxies Google through stable dev and creates a secure session only on the originating preview", async () => {
    const stableOrigin = "https://debugclinic-dev.netlify.app";
    const previewOrigin =
      "https://deploy-preview-12--debugclinic-dev.netlify.app";
    const makeAuth = (origin: string, secret: string) =>
      createDebugClinicAuth(
        {
          ...config,
          nodeEnv: "production",
          appOrigin: origin,
          corsOrigins: [origin],
          betterAuthUrl: origin,
          betterAuthSecret: secret,
          googleClientId: "synthetic-google-client",
          googleClientSecret: "synthetic-google-secret",
          oauthProxy: {
            url: stableOrigin,
            secret: "shared-development-proxy-secret-32-characters",
          },
        },
        prisma,
        async () => {},
      );
    const stable = makeAuth(
      stableOrigin,
      "stable-session-secret-at-least-32-characters",
    );
    const preview = makeAuth(
      previewOrigin,
      "preview-session-secret-at-least-32-characters",
    );
    const provider = (await stable.$context).socialProviders.find(
      (entry) => entry.id === "google",
    )!;
    // Mock only Google's remote exchange; exercise the real proxy crypto, state,
    // callback handlers, Prisma adapter, and session cookies without network calls.
    const exchange = vi
      .spyOn(provider, "validateAuthorizationCode")
      .mockResolvedValue({
        accessToken: "synthetic-token",
        scopes: ["email", "profile", "openid"],
      });
    const profile = vi.spyOn(provider, "getUserInfo").mockResolvedValue({
      user: {
        email: proxyEmail,
        emailVerified: true,
        name: "Proxy learner",
      },
      data: { sub: proxyEmail, email: proxyEmail, email_verified: true },
    });
    try {
      const start = await preview.handler(
        new Request(`${previewOrigin}/api/auth/sign-in/social`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: previewOrigin,
          },
          body: JSON.stringify({
            provider: "google",
            requestSignUp: true,
            additionalData: { registrationRole: "LEARNER" },
            callbackURL: `${previewOrigin}/learner`,
          }),
        }),
      );
      expect(start.status).toBe(200);
      expect(
        start.headers
          .getSetCookie()
          .some((value) => value.includes("debugclinic_intent")),
      ).toBe(true);
      const authorization = new URL((await start.json()).url as string);
      expect(authorization.searchParams.get("redirect_uri")).toBe(
        `${stableOrigin}/api/auth/callback/google`,
      );
      const callback = await stable.handler(
        new Request(
          `${stableOrigin}/api/auth/callback/google?code=synthetic&state=${encodeURIComponent(authorization.searchParams.get("state")!)}`,
        ),
      );
      expect(callback.status).toBe(302);
      expect(exchange).toHaveBeenCalledOnce();
      const completion = new URL(callback.headers.get("location")!);
      expect(completion.origin).toBe(previewOrigin);
      expect(completion.pathname).toBe("/api/auth/callback/google/oauth-proxy");
      expect(await prisma.user.count({ where: { email: proxyEmail } })).toBe(0);
      const cookies = start.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const tampered = new URL(completion);
      tampered.searchParams.set("profile", "invalid-encrypted-profile");
      const rejected = await preview.handler(
        new Request(tampered, { headers: { cookie: cookies } }),
      );
      expect(rejected.headers.getSetCookie().join(";")).not.toContain(
        "session_token",
      );
      expect(await prisma.user.count({ where: { email: proxyEmail } })).toBe(0);
      const finish = await preview.handler(
        new Request(completion, { headers: { cookie: cookies } }),
      );
      expect(finish.status).toBe(302);
      expect(finish.headers.get("location")).toBe(
        `${previewOrigin}/auth/complete`,
      );
      const sessionCookie = finish.headers
        .getSetCookie()
        .find((value) => value.includes("session_token"))!;
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("Secure");
      const session = await preview.api.getSession({
        headers: new Headers({ cookie: sessionCookie.split(";")[0]! }),
      });
      expect(session?.user.email).toBe(proxyEmail);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { email: proxyEmail } }))
          .role,
      ).toBe("LEARNER");
      const stableSession = await stable.api.getSession({
        headers: new Headers({ cookie: sessionCookie.split(";")[0]! }),
      });
      expect(stableSession).toBeNull();
    } finally {
      exchange.mockRestore();
      profile.mockRestore();
    }
  });
  it("verifies seeded fixtures and database check constraints", async () => {
    expect(
      await prisma.user.count({
        where: {
          email: { in: ["instructor@example.test", "learner@example.test"] },
        },
      }),
    ).toBe(2);
    const draft = await prisma.exercise.findFirstOrThrow({
      where: { title: "Unbound local variable" },
      include: { versions: { include: { hints: true } } },
    });
    expect(draft.versions[0]?.hints).toHaveLength(3);
    await expect(
      prisma.hintStage.create({
        data: {
          exerciseVersionId: draft.versions[0]!.id,
          stage: 4,
          title: "Invalid",
          content: "Invalid",
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.exercise.update({
        where: { id: draft.id },
        data: { status: "PUBLISHED" },
      }),
    ).rejects.toThrow();
  });
  it("registers, verifies email, enforces role, resets passwords, and revokes real sessions", async () => {
    await request(app)
      .post("/api/auth/sign-up/email")
      .set("origin", origin)
      .send({
        name: "Integration learner",
        email,
        password,
        registrationRole: "LEARNER",
      })
      .expect(200);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { email } })).role,
    ).toBe("LEARNER");
    await request(app)
      .post("/api/auth/sign-in/email")
      .set("origin", origin)
      .send({ email, password })
      .expect(403);
    const verification = outbox.find((message) =>
      message.subject.includes("Verify"),
    );
    const verificationUrl = verification?.text.match(/https?:\/\/\S+/)?.[0];
    expect(verificationUrl).toBeTruthy();
    await request(app)
      .get(
        new URL(verificationUrl!).pathname + new URL(verificationUrl!).search,
      )
      .expect(302);
    const signIn = await request(app)
      .post("/api/auth/sign-in/email")
      .set("origin", origin)
      .send({ email, password })
      .expect(200);
    const cookie = (signIn.headers["set-cookie"] as unknown as string[])
      .map((value) => value.split(";")[0])
      .join("; ");
    expect(cookie).toContain("session_token");
    expect(
      (signIn.headers["set-cookie"] as unknown as string[]).join(";"),
    ).toContain("HttpOnly");
    await request(app).get("/api/v1/me").set("cookie", cookie).expect(200);
    await request(app)
      .get("/api/v1/instructor/ping")
      .set("cookie", cookie)
      .expect(403);
    await request(app)
      .post("/api/auth/request-password-reset")
      .set("origin", origin)
      .send({ email, redirectTo: `${origin}/sign-in` })
      .expect(200);
    const reset = outbox.find((message) => message.subject.includes("Reset"));
    const resetUrl = new URL(reset!.text.match(/https?:\/\/\S+/)![0]);
    const token = resetUrl.pathname.split("/").at(-1);
    await request(app)
      .post("/api/auth/reset-password")
      .set("origin", origin)
      .send({ token, newPassword: `${password}-new` })
      .expect(200);
    await request(app).get("/api/v1/me").set("cookie", cookie).expect(401);
    await request(app)
      .post("/api/auth/sign-in/email")
      .set("origin", origin)
      .send({ email, password })
      .expect(401);
    const finalSignIn = await request(app)
      .post("/api/auth/sign-in/email")
      .set("origin", origin)
      .send({ email, password: `${password}-new` })
      .expect(200);
    const finalCookie = (
      finalSignIn.headers["set-cookie"] as unknown as string[]
    )
      .map((value) => value.split(";")[0])
      .join("; ");
    await request(app).get("/api/v1/me").set("cookie", finalCookie).expect(200);
    const signOut = await request(app)
      .post("/api/auth/sign-out")
      .set("origin", origin)
      .set("cookie", finalCookie)
      .send({})
      .expect(200);
    expect(
      (signOut.headers["set-cookie"] as unknown as string[]).join(";"),
    ).toContain("Max-Age=0");
    await request(app).get("/api/v1/me").set("cookie", finalCookie).expect(401);
  }, 20_000);
});
