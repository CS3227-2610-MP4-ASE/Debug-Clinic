import { randomUUID } from "node:crypto";
import { inspect } from "node:util";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import * as authLogging from "../../apps/backend/src/lib/logger.js";
import {
  cookies,
  database,
  email,
  fixture,
  googleDouble,
  googleFinish,
  googleStart,
  link,
  password,
  post,
  verify,
} from "../support/auth-fixture.js";
const prisma = database();
const owned: string[] = [];
const recipient = () => {
  const value = email();
  owned.push(value);
  return value;
};
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: owned } } });
  await prisma.$disconnect();
});
describe("independent review boundary acceptance", () => {
  it.each(["password", "google"] as const)(
    "R02 %s replacement/establishment enforces every policy boundary atomically",
    async (method) => {
      for (const length of [12, 128]) {
        const address = recipient();
        const f = fixture(prisma);
        const oldCookies: string[] = [];
        if (method === "password") {
          expect(
            (
              await post(f.auth, "/sign-up/email", {
                name: "Policy boundary",
                email: address,
                password,
                registrationRole: "INSTRUCTOR",
              })
            ).status,
          ).toBe(200);
          await verify(f.auth, f.outbox, address);
          for (let i = 0; i < 2; i += 1)
            oldCookies.push(
              cookies(
                await post(f.auth, "/sign-in/email", {
                  email: address,
                  password,
                }),
              ),
            );
        } else {
          await googleDouble(f.auth, address);
          oldCookies.push(
            cookies(
              await googleFinish(
                f.auth,
                await googleStart(f.auth, "INSTRUCTOR"),
              ),
            ),
          );
        }
        const before = await prisma.user.findUniqueOrThrow({
          where: { email: address },
          include: { accounts: true, sessions: true },
        });
        expect(before.sessions.length).toBeGreaterThan(0);
        expect(
          (await post(f.auth, "/request-password-reset", { email: address }))
            .status,
        ).toBe(200);
        const token = link(f.outbox, address, "Reset")
          .pathname.split("/")
          .at(-1)!;
        const recovery = await prisma.verification.findFirstOrThrow({
          where: { identifier: `reset-password:${token}` },
        });
        for (const invalidLength of [11, 129]) {
          const rejected = await post(f.auth, "/reset-password", {
            token,
            newPassword: "p".repeat(invalidLength),
          });
          expect(rejected.status).toBe(400);
          expect(
            await prisma.verification.findUnique({
              where: { id: recovery.id },
            }),
          ).toEqual(recovery);
          const unchanged = await prisma.user.findUniqueOrThrow({
            where: { id: before.id },
            include: {
              accounts: { orderBy: { id: "asc" } },
              sessions: { orderBy: { id: "asc" } },
            },
          });
          expect(
            unchanged.accounts.sort((a, b) => a.id.localeCompare(b.id)),
          ).toEqual(
            [...before.accounts].sort((a, b) => a.id.localeCompare(b.id)),
          );
          expect(
            unchanged.sessions.sort((a, b) => a.id.localeCompare(b.id)),
          ).toEqual(
            [...before.sessions].sort((a, b) => a.id.localeCompare(b.id)),
          );
          expect(unchanged.role).toBe("INSTRUCTOR");
        }
        const newPassword = "p".repeat(length);
        expect(
          (await post(f.auth, "/reset-password", { token, newPassword }))
            .status,
        ).toBe(200);
        expect(
          await prisma.verification.findUnique({ where: { id: recovery.id } }),
        ).toBeNull();
        expect(
          await prisma.session.count({ where: { userId: before.id } }),
        ).toBe(0);
        for (const cookie of oldCookies)
          expect(
            await f.auth.api.getSession({ headers: new Headers({ cookie }) }),
          ).toBeNull();
        const after = await prisma.user.findUniqueOrThrow({
          where: { id: before.id },
          include: { accounts: true },
        });
        expect(after.role).toBe(before.role);
        expect(after.emailVerified).toBe(before.emailVerified);
        expect(
          after.accounts.filter(
            (account) => account.providerId === "credential",
          ),
        ).toHaveLength(1);
        expect(
          after.accounts.every((account) => account.userId === before.id),
        ).toBe(true);
        if (method === "google")
          expect(
            after.accounts.find((account) => account.providerId === "google"),
          ).toEqual(before.accounts[0]);
        expect(
          (await post(f.auth, "/sign-in/email", { email: address, password }))
            .status,
        ).toBe(401);
        const login = await post(f.auth, "/sign-in/email", {
          email: address,
          password: newPassword,
        });
        expect(login.status).toBe(200);
        expect(
          (
            await f.auth.api.getSession({
              headers: new Headers({ cookie: cookies(login) }),
            })
          )?.user.id,
        ).toBe(before.id);
        if (method === "google")
          expect(
            (await googleFinish(f.auth, await googleStart(f.auth))).headers.get(
              "location",
            ),
          ).toContain("/auth/complete");
        vi.restoreAllMocks();
      }
    },
  );
  it("N02 stock Google user-info applies configured canonicalization while preserving raw subject/profile", async () => {
    const address = recipient();
    const rawEmail = `\u00a0\u2003${address.toUpperCase()}\ufeff `;
    const subject = randomUUID();
    const f = fixture(prisma);
    const provider = (await f.auth.$context).socialProviders.find(
      (entry) => entry.id === "google",
    )!;
    // Only the remote code exchange is substituted. Its synthetic ID token stands
    // for an already-validated exchange; stock Google getUserInfo/mapProfileToUser runs.
    const encoded = (value: unknown) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const idToken = `${encoded({ alg: "none" })}.${encoded({ sub: subject, email: rawEmail, email_verified: true, name: "Google boundary" })}.synthetic`;
    vi.spyOn(provider, "validateAuthorizationCode").mockResolvedValue({
      accessToken: "synthetic",
      idToken,
      scopes: ["email", "profile", "openid"],
    });
    const userInfo = vi.spyOn(provider, "getUserInfo");
    const result = await googleFinish(
      f.auth,
      await googleStart(f.auth, "INSTRUCTOR"),
    );
    expect(result.headers.get("location")).toBe(
      `${f.config.appOrigin}/auth/complete`,
    );
    expect(userInfo).toHaveBeenCalledOnce();
    const mapped = await userInfo.mock.results[0]!.value;
    expect(mapped?.user.email).toBe(address);
    expect(mapped?.data).toMatchObject({
      sub: subject,
      email: rawEmail,
      email_verified: true,
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: address },
      include: { accounts: true },
    });
    expect(user.role).toBe("INSTRUCTOR");
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0]).toMatchObject({
      accountId: subject,
      providerId: "google",
      userId: user.id,
    });
  });
  it.each(["query", "body"] as const)(
    "G02 callback %s role/additionalData substitution cannot replace admitted registration role",
    async (surface) => {
      const f = fixture(prisma);
      const address = recipient();
      await googleDouble(f.auth, address);
      const flow = await googleStart(f.auth, "LEARNER");
      const callback = new URL(flow.callback);
      const attempted = {
        registrationRole: "INSTRUCTOR",
        role: "INSTRUCTOR",
        additionalData: {
          registrationRole: "INSTRUCTOR",
          serverContext: { debugClinicIntentId: "forged-client-intent" },
        },
      };
      let result: Response;
      if (surface === "query") {
        for (const [key, value] of Object.entries(attempted))
          callback.searchParams.set(
            key,
            typeof value === "string" ? value : JSON.stringify(value),
          );
        result = await f.auth.handler(
          new Request(callback, { headers: { cookie: flow.cookie } }),
        );
      } else {
        const redirect = await f.auth.handler(
          new Request(callback, {
            method: "POST",
            headers: {
              cookie: flow.cookie,
              "content-type": "application/json",
            },
            body: JSON.stringify(attempted),
          }),
        );
        expect(redirect.status).toBe(302);
        result = await f.auth.handler(
          new Request(redirect.headers.get("location")!, {
            headers: { cookie: flow.cookie },
          }),
        );
      }
      expect(result.headers.get("location")).toBe(
        `${f.config.appOrigin}/auth/complete`,
      );
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: address },
      });
      expect(user.role).toBe("LEARNER");
      expect(
        (
          await f.auth.api.getSession({
            headers: new Headers({ cookie: cookies(result) }),
          })
        )?.user.id,
      ).toBe(user.id);
    },
  );
  it("F03 actual callback provider exception exposes no raw console/application payload", async () => {
    const logLines: string[] = [];
    const consoleCalls: unknown[][] = [];
    const base = fixture(prisma);
    const logger = authLogging.createLogger(
      { ...base.config, logLevel: "info" },
      {
        write: (line) => {
          logLines.push(line);
        },
      },
    );
    vi.spyOn(authLogging, "createLogger").mockReturnValue(logger);
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      consoleCalls.push(args);
    });
    const f = fixture(prisma);
    const provider = (await f.auth.$context).socialProviders.find(
      (entry) => entry.id === "google",
    )!;
    vi.spyOn(provider, "validateAuthorizationCode").mockResolvedValue({
      accessToken: "synthetic",
      scopes: ["email", "profile", "openid"],
    });
    vi.spyOn(provider, "getUserInfo").mockRejectedValue(
      new Error("PRIVATE_PROVIDER_CALLBACK_CANARY", {
        cause: new Error("PRIVATE_PROVIDER_CAUSE_CANARY"),
      }),
    );
    const flow = await googleStart(f.auth, "INSTRUCTOR");
    const callback = new URL(flow.callback);
    callback.searchParams.set("callbackURL", "https://evil.example");
    const result = await f.auth.handler(
      new Request(callback, {
        headers: { cookie: flow.cookie, "x-forwarded-host": "evil.example" },
      }),
    );
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe(
      `${f.config.appOrigin}/auth/error`,
    );
    expect(
      result.headers
        .getSetCookie()
        .some((value) => value.includes("session_token")),
    ).toBe(false);
    expect(
      await f.auth.api.getSession({
        headers: new Headers({ cookie: cookies(result) }),
      }),
    ).toBeNull();
    expect(await result.text()).not.toContain("PRIVATE_");
    expect(inspect(consoleCalls)).not.toContain("PRIVATE_");
    expect(logLines.join("\n")).not.toContain("PRIVATE_");
    expect(logLines.join("\n")).toContain("auth_handler_failure");
  });
});
