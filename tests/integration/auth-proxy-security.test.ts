import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import type { DebugClinicPrisma } from "../../apps/backend/src/db/client.js";
import {
  barrier,
  cookies,
  database,
  email,
  fixture,
  googleDouble,
} from "../support/auth-fixture.js";
const prisma = database();
const owned: string[] = [];
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: owned } } });
  await prisma.$disconnect();
});
const stableOrigin = "https://debugclinic-dev.netlify.app";
const previewOrigin = "https://deploy-preview-12--debugclinic-dev.netlify.app";
function pair(client: DebugClinicPrisma) {
  const { config } = fixture(client);
  const create = (origin: string, secret: string) =>
    createDebugClinicAuth(
      {
        ...config,
        nodeEnv: "production",
        appOrigin: origin,
        corsOrigins: [origin],
        betterAuthUrl: origin,
        betterAuthSecret: secret,
        oauthProxy: {
          url: stableOrigin,
          secret: "synthetic-shared-proxy-secret-32-characters",
        },
      },
      client,
      async () => {},
    );
  return {
    stable: create(
      stableOrigin,
      "synthetic-stable-session-secret-32-characters",
    ),
    preview: create(
      previewOrigin,
      "synthetic-preview-session-secret-32-characters",
    ),
  };
}
async function flow(
  auths: ReturnType<typeof pair>,
  role: "LEARNER" | "INSTRUCTOR" = "INSTRUCTOR",
) {
  const start = await auths.preview.handler(
    new Request(`${previewOrigin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { origin: previewOrigin, "content-type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        requestSignUp: true,
        additionalData: { registrationRole: role },
        callbackURL: "https://evil.example",
        errorCallbackURL: "https://evil.example",
      }),
    }),
  );
  expect(start.status).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state")!;
  const exchange = await auths.stable.handler(
    new Request(
      `${stableOrigin}/api/auth/callback/google?code=synthetic&state=${encodeURIComponent(state)}`,
    ),
  );
  expect(exchange.status).toBe(302);
  const complete = exchange.headers.get("location")!;
  expect(new URL(complete).origin).toBe(previewOrigin);
  return { complete, cookie: cookies(start) };
}
describe("preview proxy intent security on real PostgreSQL", () => {
  it("G02 rejects copied completion, tampered ciphertext and expired intent; fresh signed flow succeeds", async () => {
    const auths = pair(prisma);
    const recipient = email();
    owned.push(recipient);
    await googleDouble(auths.stable, recipient);
    const first = await flow(auths);
    const tampered = new URL(first.complete);
    tampered.searchParams.set("profile", "invalid-ciphertext");
    const rejected = await auths.preview.handler(
      new Request(tampered, { headers: { cookie: first.cookie } }),
    );
    expect(
      rejected.headers
        .getSetCookie()
        .some((value) => value.includes("session_token")),
    ).toBe(false);
    const copied = await auths.preview.handler(new Request(first.complete));
    expect(copied.headers.get("location")).toContain("/auth/error");
    expect(await prisma.user.count({ where: { email: recipient } })).toBe(0);
    const expired = await flow(auths);
    const id = decodeURIComponent(
      expired.cookie
        .split("; ")
        .find((value) => value.includes("debugclinic_intent"))!
        .split("=")[1]!,
    ).split(".")[0]!;
    await prisma.verification.update({
      where: { id },
      data: { expiresAt: new Date(0) },
    });
    const denied = await auths.preview.handler(
      new Request(expired.complete, { headers: { cookie: expired.cookie } }),
    );
    expect(denied.headers.get("location")).toContain("/auth/error");
    const fresh = await flow(auths);
    const done = await auths.preview.handler(
      new Request(fresh.complete, { headers: { cookie: fresh.cookie } }),
    );
    expect(done.headers.get("location")).toBe(`${previewOrigin}/auth/complete`);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { email: recipient } }))
        .role,
    ).toBe("INSTRUCTOR");
    expect(
      await auths.stable.api.getSession({
        headers: new Headers({ cookie: cookies(done) }),
      }),
    ).toBeNull();
  });
  it("G03 proxy callbacks compete at real independent claim; post-claim provisioning failure stays consumed", async () => {
    const readGate = barrier();
    const claimGate = barrier();
    let racing = false;
    const extended = prisma.$extends({
      query: {
        verification: {
          findMany: async ({ args, query }) => {
            const value = await query(args);
            if (racing && JSON.stringify(args).includes("auth-state:"))
              await readGate();
            return value;
          },
          deleteMany: async ({ args, query }) => {
            if (racing && args.where?.value) await claimGate();
            return query(args);
          },
        },
      },
    }) as unknown as DebugClinicPrisma;
    const auths = pair(extended);
    const recipient = email();
    owned.push(recipient);
    await googleDouble(auths.stable, recipient);
    const started = await flow(auths);
    racing = true;
    const results = await Promise.all(
      [1, 2].map(() =>
        auths.preview.handler(
          new Request(started.complete, {
            headers: { cookie: started.cookie },
          }),
        ),
      ),
    );
    racing = false;
    expect(
      results.filter(
        (response) =>
          response.headers.get("location") === `${previewOrigin}/auth/complete`,
      ),
    ).toHaveLength(1);
    expect(await prisma.user.count({ where: { email: recipient } })).toBe(1);
    const replay = await auths.preview.handler(
      new Request(started.complete, { headers: { cookie: started.cookie } }),
    );
    expect(
      replay.headers
        .getSetCookie()
        .some((value) => value.includes("session_token")),
    ).toBe(false);
    const failedEmail = email();
    owned.push(failedEmail);
    const faulty = pair(
      prisma.$extends({
        query: {
          account: {
            create: async () => {
              throw new Error("PRIVATE_PROXY_PROVISION_CANARY");
            },
          },
        },
      }) as unknown as DebugClinicPrisma,
    );
    await googleDouble(faulty.stable, failedEmail);
    const failing = await flow(faulty, "LEARNER");
    const failed = await faulty.preview.handler(
      new Request(failing.complete, { headers: { cookie: failing.cookie } }),
    );
    expect(failed.headers.get("location")).toContain("/auth/error");
    expect(await prisma.user.count({ where: { email: failedEmail } })).toBe(0);
    const id = decodeURIComponent(
      failing.cookie
        .split("; ")
        .find((value) => value.includes("debugclinic_intent"))!
        .split("=")[1]!,
    ).split(".")[0]!;
    expect(await prisma.verification.findUnique({ where: { id } })).toBeNull();
  });
});
