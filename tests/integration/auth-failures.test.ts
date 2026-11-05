import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createEmailVerificationToken } from "better-auth/api";
import { normalizeIdentities } from "../../scripts/normalize-auth-identities.js";
import type { DebugClinicPrisma } from "../../apps/backend/src/db/client.js";
import {
  barrier,
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
describe("additional frozen authentication failure/race outcomes", () => {
  it.each(["password-google", "google-google"])(
    "N03 %s contenders preserve one canonical winner",
    async (kind) => {
      const address = recipient();
      const clients = [database(), database()];
      const gate = barrier();
      try {
        const fs = clients.map((client) =>
          fixture(
            client.$extends({
              query: {
                user: {
                  create: async ({ args, query }) => {
                    await gate();
                    return query(args);
                  },
                },
              },
            }) as unknown as DebugClinicPrisma,
          ),
        );
        await googleDouble(fs[1]!.auth, address);
        if (kind === "google-google") await googleDouble(fs[0]!.auth, address);
        const flow = await googleStart(fs[1]!.auth, "INSTRUCTOR");
        const other =
          kind === "google-google"
            ? await googleStart(fs[0]!.auth, "LEARNER")
            : null;
        const results = await Promise.all([
          other
            ? googleFinish(fs[0]!.auth, other)
            : post(fs[0]!.auth, "/sign-up/email", {
                name: "Race",
                email: address.toUpperCase(),
                password,
                registrationRole: "LEARNER",
              }),
          googleFinish(fs[1]!.auth, flow),
        ]);
        const users = await prisma.user.findMany({
          where: { email: address },
          include: { accounts: true },
        });
        expect(users).toHaveLength(1);
        expect(users[0]!.accounts).toHaveLength(1);
        const winner = users[0]!;
        expect(winner.accounts[0]!.userId).toBe(winner.id);
        if (winner.accounts[0]!.providerId === "credential") {
          expect(winner.role).toBe("LEARNER");
          await verify(fs[0]!.auth, fs[0]!.outbox, address);
          expect(
            (
              await post(fs[0]!.auth, "/sign-in/email", {
                email: address,
                password,
              })
            ).status,
          ).toBe(200);
        } else if (kind === "password-google")
          expect(winner.role).toBe("INSTRUCTOR");
        expect(
          results.filter(
            (response) =>
              response.status === 200 ||
              response.headers.get("location")?.endsWith("/auth/complete"),
          ),
        ).toHaveLength(1);
      } finally {
        await Promise.all(clients.map((client) => client.$disconnect()));
      }
    },
  );
  it("L04 concurrent same-subject association keeps one binding and cannot transfer it to another email", async () => {
    const address = recipient();
    const base = fixture(prisma);
    await post(base.auth, "/sign-up/email", {
      name: "Existing",
      email: address,
      password,
      registrationRole: "INSTRUCTOR",
    });
    await verify(base.auth, base.outbox, address);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: address },
    });
    const clients = [database(), database()];
    const gate = barrier();
    const subject = crypto.randomUUID();
    try {
      const fs = clients.map((client) =>
        fixture(
          client.$extends({
            query: {
              account: {
                create: async ({ args, query }) => {
                  await gate();
                  return query(args);
                },
              },
            },
          }) as unknown as DebugClinicPrisma,
        ),
      );
      for (const f of fs) await googleDouble(f.auth, address, subject);
      const flows = await Promise.all(fs.map((f) => googleStart(f.auth)));
      await Promise.all(
        fs.map((f, index) => googleFinish(f.auth, flows[index]!)),
      );
      expect(
        await prisma.account.count({
          where: { userId: user.id, providerId: "google" },
        }),
      ).toBe(1);
      const otherEmail = recipient();
      const other = await prisma.user.create({
        data: {
          email: otherEmail,
          name: "Other",
          role: "LEARNER",
          emailVerified: true,
        },
      });
      await googleDouble(base.auth, otherEmail, subject);
      const result = await googleFinish(
        base.auth,
        await googleStart(base.auth, "LEARNER"),
      );
      const session = await base.auth.api.getSession({
        headers: new Headers({ cookie: cookies(result) }),
      });
      expect(session?.user.id).toBe(user.id);
      expect(session?.user.id).not.toBe(other.id);
      expect(
        (
          await prisma.account.findFirstOrThrow({
            where: { accountId: subject, providerId: "google" },
          })
        ).userId,
      ).toBe(user.id);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role,
      ).toBe("INSTRUCTOR");
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });
  it("G03 races actual direct callbacks, preserves independent consumed intent after provisioning rollback", async () => {
    const address = recipient();
    const readGate = barrier();
    const claimGate = barrier();
    let racing = false;
    const extended = prisma.$extends({
      query: {
        verification: {
          findMany: async ({ args, query }) => {
            const result = await query(args);
            if (racing && JSON.stringify(args).includes("auth-state:"))
              await readGate();
            return result;
          },
          deleteMany: async ({ args, query }) => {
            if (racing && args.where?.value) await claimGate();
            return query(args);
          },
        },
      },
    }) as unknown as DebugClinicPrisma;
    const f = fixture(extended);
    await googleDouble(f.auth, address);
    const flow = await googleStart(f.auth, "INSTRUCTOR");
    racing = true;
    const results = await Promise.all([
      googleFinish(f.auth, flow),
      googleFinish(f.auth, flow),
    ]);
    racing = false;
    expect(
      results.filter((response) =>
        response.headers.get("location")?.endsWith("/auth/complete"),
      ),
    ).toHaveLength(1);
    expect(await prisma.user.count({ where: { email: address } })).toBe(1);
    expect(
      (await googleFinish(f.auth, flow)).headers
        .getSetCookie()
        .some((value) => value.includes("session_token")),
    ).toBe(false);
    const failedEmail = recipient();
    const fault = fixture(
      prisma.$extends({
        query: {
          account: {
            create: async () => {
              throw new Error("PRIVATE_PROVISION_CANARY");
            },
          },
        },
      }) as unknown as DebugClinicPrisma,
    );
    await googleDouble(fault.auth, failedEmail);
    const failedFlow = await googleStart(fault.auth, "LEARNER");
    const failed = await googleFinish(fault.auth, failedFlow);
    expect(failed.headers.get("location")).toContain("/auth/error");
    expect(await prisma.user.count({ where: { email: failedEmail } })).toBe(0);
    const intentCookie = failedFlow.cookie
      .split("; ")
      .find((value) => value.includes("debugclinic_intent"))!;
    const rawId = decodeURIComponent(intentCookie.split("=")[1]!).split(
      ".",
    )[0]!;
    expect(
      await prisma.verification.findUnique({ where: { id: rawId } }),
    ).toBeNull();
    expect(
      (await googleFinish(fault.auth, failedFlow)).headers
        .getSetCookie()
        .some((value) => value.includes("session_token")),
    ).toBe(false);
    const fresh = fixture(prisma);
    await googleDouble(fresh.auth, failedEmail);
    expect(
      (
        await googleFinish(fresh.auth, await googleStart(fresh.auth, "LEARNER"))
      ).headers.get("location"),
    ).toContain("/auth/complete");
  });
  it("G02 signed browser intent rejects altered cookies/rows, second-tab intent and callback role substitution", async () => {
    const f = fixture(prisma);
    const address = recipient();
    await googleDouble(f.auth, address);
    const old = await googleStart(f.auth, "LEARNER");
    const current = await googleStart(f.auth, "INSTRUCTOR");
    expect(
      (await googleFinish(f.auth, old, current.cookie)).headers.get("location"),
    ).toContain("/auth/error");
    const done = await googleFinish(f.auth, current);
    expect(done.headers.get("location")).toContain("/auth/complete");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { email: address } })).role,
    ).toBe("INSTRUCTOR");
    const another = recipient();
    vi.restoreAllMocks();
    await googleDouble(f.auth, another);
    const altered = await googleStart(f.auth, "LEARNER");
    const badCookie = altered.cookie.replace(
      /(debugclinic_intent=)[^;]+/,
      "$1invalid.signature",
    );
    expect(
      (await googleFinish(f.auth, altered, badCookie)).headers.get("location"),
    ).toContain("/auth/error");
    expect(await prisma.user.count({ where: { email: another } })).toBe(0);
  });
  it("V02/N04 stateless verification links are idempotent, expire and retain intended stable owner through canonical transition", async () => {
    const f = fixture(prisma);
    const address = recipient();
    await post(f.auth, "/sign-up/email", {
      name: "Token owner",
      email: address,
      password,
      registrationRole: "INSTRUCTOR",
    });
    const original = await prisma.user.findUniqueOrThrow({
      where: { email: address },
    });
    const url = link(f.outbox, address, "Verify");
    const wrong = new URL(url);
    wrong.searchParams.set("token", `${url.searchParams.get("token")}altered`);
    expect(
      (await f.auth.handler(new Request(wrong))).headers.get("location"),
    ).toContain("error=");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: original.id } }))
        .emailVerified,
    ).toBe(false);
    expect((await f.auth.handler(new Request(url))).status).toBe(302);
    expect((await f.auth.handler(new Request(url))).status).toBe(302);
    expect(await f.auth.api.getSession({ headers: new Headers() })).toBeNull();
    const legacyAddress = address.toUpperCase();
    owned.push(legacyAddress);
    await prisma.user.update({
      where: { id: original.id },
      data: { email: legacyAddress, emailVerified: false },
    });
    const legacyToken = await createEmailVerificationToken(
      f.config.betterAuthSecret,
      legacyAddress,
    );
    await normalizeIdentities(prisma, true, async () => {});
    const legacyLink = new URL(url);
    legacyLink.searchParams.set("token", legacyToken);
    await f.auth.handler(new Request(legacyLink));
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: original.id } }))
        .role,
    ).toBe("INSTRUCTOR");
    await f.auth.handler(new Request(url));
    expect(
      await prisma.user.findUnique({ where: { id: original.id } }),
    ).toMatchObject({ emailVerified: true, role: "INSTRUCTOR" });
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 2 * 3600_000);
      expect(
        (await f.auth.handler(new Request(url))).headers.get("location"),
      ).toContain("error=");
    } finally {
      vi.useRealTimers();
    }
    expect(await prisma.user.count({ where: { email: address } })).toBe(1);
  });
  it("R03 Google-first concurrent password establishment consumes once and expiry denies mutation", async () => {
    const f = fixture(prisma);
    const address = recipient();
    await googleDouble(f.auth, address);
    await googleFinish(f.auth, await googleStart(f.auth, "INSTRUCTOR"));
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: address },
    });
    await post(f.auth, "/request-password-reset", { email: address });
    const token = link(f.outbox, address, "Reset").pathname.split("/").at(-1)!;
    const gate = barrier();
    const clients = [database(), database()];
    try {
      const auths = clients.map(
        (client) =>
          fixture(
            client.$extends({
              query: {
                verification: {
                  deleteMany: async ({ args, query }) => {
                    await gate();
                    return query(args);
                  },
                },
              },
            }) as unknown as DebugClinicPrisma,
          ).auth,
      );
      const results = await Promise.all(
        auths.map((auth, index) =>
          post(auth, "/reset-password", {
            token,
            newPassword: `${password}-${index}`,
          }),
        ),
      );
      expect(
        results.filter((response) => response.status === 200),
      ).toHaveLength(1);
      expect(
        await prisma.account.count({
          where: { userId: user.id, providerId: "credential" },
        }),
      ).toBe(1);
      await post(f.auth, "/request-password-reset", { email: address });
      const expired = link(f.outbox, address, "Reset")
        .pathname.split("/")
        .at(-1)!;
      await prisma.verification.updateMany({
        where: { identifier: `reset-password:${expired}` },
        data: { expiresAt: new Date(0) },
      });
      expect(
        (
          await post(f.auth, "/reset-password", {
            token: expired,
            newPassword: password,
          })
        ).status,
      ).toBe(400);
      expect(
        (await googleFinish(f.auth, await googleStart(f.auth))).headers.get(
          "location",
        ),
      ).toContain("/auth/complete");
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });
});
