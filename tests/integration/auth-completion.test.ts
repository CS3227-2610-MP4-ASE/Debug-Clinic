import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { createDebugClinicAuth } from "../../apps/backend/src/auth/auth.js";
import type { DebugClinicPrisma } from "../../apps/backend/src/db/client.js";
import {
  createIntentStore,
  INTENT_NAMESPACE,
} from "../../apps/backend/src/auth/policy.js";
import { normalizeIdentities } from "../../scripts/normalize-auth-identities.js";
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
const identities: string[] = [];
const owned = () => {
  const value = email();
  identities.push(value);
  return value;
};
afterEach(() => vi.restoreAllMocks());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: identities } } });
  await prisma.$disconnect();
});

async function registered(role: "LEARNER" | "INSTRUCTOR" = "LEARNER") {
  const f = fixture(prisma);
  const recipient = owned();
  expect(
    (
      await post(f.auth, "/sign-up/email", {
        name: "Synthetic",
        email: recipient,
        password,
        registrationRole: role,
      })
    ).status,
  ).toBe(200);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: recipient },
  });
  return { ...f, recipient, user };
}

describe("approved authentication acceptance on real PostgreSQL", () => {
  it("G03 claim rejects value/namespace/expiry changes between read and atomic delete", async () => {
    for (const mutation of ["value", "identifier", "expiresAt"] as const) {
      const store = createIntentStore(prisma, "origin", "auth");
      const id = await store.start({ mode: "register", role: "INSTRUCTOR" });
      const changed = prisma.$extends({
        query: {
          verification: {
            findUnique: async ({ args, query }) => {
              const row = await query(args);
              if (args.where.id === id)
                await prisma.verification.update({
                  where: { id },
                  data:
                    mutation === "value"
                      ? { value: "{}" }
                      : mutation === "identifier"
                        ? { identifier: "different-namespace" }
                        : { expiresAt: new Date(0) },
                });
              return row;
            },
          },
        },
      }) as unknown as DebugClinicPrisma;
      try {
        expect(
          await createIntentStore(changed, "origin", "auth").claim(id, id),
        ).toBeNull();
      } finally {
        await prisma.verification.deleteMany({ where: { id } });
      }
    }
  });
  it("G02 bounds expired-intent housekeeping without touching live or unrelated artifacts", async () => {
    const ids = Array.from({ length: 105 }, () => crypto.randomUUID());
    const unrelated = crypto.randomUUID();
    const live = crypto.randomUUID();
    await prisma.verification.createMany({
      data: [
        ...ids.map((id) => ({
          id,
          identifier: `${INTENT_NAMESPACE}${id}`,
          value: "{}",
          expiresAt: new Date(0),
        })),
        {
          id: unrelated,
          identifier: "unrelated",
          value: "{}",
          expiresAt: new Date(0),
        },
        {
          id: live,
          identifier: `${INTENT_NAMESPACE}${live}`,
          value: "{}",
          expiresAt: new Date(Date.now() + 60_000),
        },
      ],
    });
    let started: string | undefined;
    try {
      const beforeExpired = await prisma.verification.count({
        where: {
          identifier: { startsWith: INTENT_NAMESPACE },
          expiresAt: { lte: new Date() },
        },
      });
      started = await createIntentStore(prisma, "origin", "auth").start({
        mode: "sign-in",
      });
      expect(
        await prisma.verification.count({
          where: {
            identifier: { startsWith: INTENT_NAMESPACE },
            expiresAt: { lte: new Date() },
          },
        }),
      ).toBe(beforeExpired - 100);
      expect(
        await prisma.verification.count({
          where: { id: { in: [unrelated, live] } },
        }),
      ).toBe(2);
    } finally {
      await prisma.verification.deleteMany({
        where: {
          id: { in: [...ids, unrelated, live, ...(started ? [started] : [])] },
        },
      });
    }
  });
  it.each([undefined, null, "ADMIN", [], {}, ""])(
    "P01 rejects missing/forged role %j without provisioning",
    async (role) => {
      const f = fixture(prisma);
      const recipient = owned();
      expect(
        (
          await post(f.auth, "/sign-up/email", {
            name: "Synthetic",
            email: recipient,
            password,
            ...(role === undefined ? {} : { registrationRole: role }),
          })
        ).status,
      ).toBe(400);
      expect(await prisma.user.count({ where: { email: recipient } })).toBe(0);
    },
  );
  it.each(["LEARNER", "INSTRUCTOR"] as const)(
    "P02/N02/P03 admits %s, canonicalizes all ingress, preserves identity and role",
    async (role) => {
      const f = fixture(prisma);
      const recipient = owned();
      expect(
        (
          await post(f.auth, "/sign-up/email", {
            name: " Synthetic ",
            email: ` \u00a0${recipient.toUpperCase()}\u2003 `,
            password,
            registrationRole: role,
          })
        ).status,
      ).toBe(200);
      const before = await prisma.user.findUniqueOrThrow({
        where: { email: recipient },
        include: { accounts: true },
      });
      expect(before).toMatchObject({
        role,
        name: "Synthetic",
        emailVerified: false,
      });
      expect(
        (
          await post(f.auth, "/sign-in/email", {
            email: ` ${recipient.toUpperCase()} `,
            password,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await post(f.auth, "/send-verification-email", {
            email: ` ${recipient.toUpperCase()} `,
          })
        ).status,
      ).toBe(200);
      expect((await verify(f.auth, f.outbox, recipient)).status).toBe(302);
      const login = await post(f.auth, "/sign-in/email", {
        email: ` ${recipient.toUpperCase()} `,
        password,
        role: role === "LEARNER" ? "INSTRUCTOR" : "LEARNER",
      });
      expect(login.status).toBe(200);
      const cookie = cookies(login);
      expect(
        (await post(f.auth, "/update-user", { role: "INSTRUCTOR" }, cookie))
          .status,
      ).toBe(403);
      expect(
        (await post(f.auth, "/update-user", { name: "Updated" }, cookie))
          .status,
      ).toBe(200);
      await post(f.auth, "/sign-up/email", {
        name: "Attacker",
        email: recipient.toUpperCase(),
        password: `${password}-other`,
        registrationRole: role === "LEARNER" ? "INSTRUCTOR" : "LEARNER",
      });
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: before.id },
        include: { accounts: true },
      });
      expect(after.role).toBe(role);
      expect(after.accounts[0]?.password).toBe(before.accounts[0]?.password);
      expect(after.accounts[0]?.userId).toBe(before.id);
      expect(
        (await post(f.auth, "/sign-in/email", { email: recipient, password }))
          .status,
      ).toBe(200);
      expect(
        (
          await post(f.auth, "/sign-in/email", {
            email: recipient,
            password: `${password}-other`,
          })
        ).status,
      ).toBe(401);
    },
  );
  it.each([11, 129])(
    "P02 rejects password boundary %i without orphan",
    async (length) => {
      const f = fixture(prisma);
      const recipient = owned();
      expect(
        (
          await post(f.auth, "/sign-up/email", {
            name: "Synthetic",
            email: recipient,
            password: "x".repeat(length),
            registrationRole: "INSTRUCTOR",
          })
        ).status,
      ).toBe(400);
      expect(await prisma.user.count({ where: { email: recipient } })).toBe(0);
    },
  );
  it("V03/R01 equalizes resend/recovery across pending, unknown, verified and delivery failure", async () => {
    const pending = await registered();
    const verified = await registered("INSTRUCTOR");
    await verify(verified.auth, verified.outbox, verified.recipient);
    const f = fixture(prisma, async () => {
      throw new Error("PRIVATE_DELIVERY_CANARY");
    });
    const login = await post(verified.auth, "/sign-in/email", {
      email: verified.recipient,
      password,
    });
    for (const cookie of [undefined, cookies(login)])
      for (const recipient of [
        pending.recipient,
        owned(),
        verified.recipient,
      ]) {
        const result = await post(
          f.auth,
          "/send-verification-email",
          { email: ` ${recipient.toUpperCase()} ` },
          cookie,
        );
        expect(result.status).toBe(200);
        expect(await result.json()).toEqual({ status: true });
        const recovery = await post(
          f.auth,
          "/request-password-reset",
          { email: ` ${recipient.toUpperCase()} ` },
          cookie,
        );
        expect(recovery.status).toBe(200);
        expect(await recovery.json()).toMatchObject({ status: true });
      }
    const disabledConfig = { ...f.config };
    delete disabledConfig.smtp;
    delete disabledConfig.emailFrom;
    const disabled = createDebugClinicAuth(disabledConfig, prisma);
    for (const recipient of [pending.recipient, owned(), verified.recipient])
      for (const path of [
        "/send-verification-email",
        "/request-password-reset",
      ]) {
        const response = await post(disabled, path, { email: recipient });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
          code: "EMAIL_UNAVAILABLE",
          message: "Email service is unavailable. Try again later.",
        });
      }
  });
  it.each(["LEARNER", "INSTRUCTOR"] as const)(
    "G01/L02 Google-first %s establishes password via captured recovery and keeps Google",
    async (role) => {
      const f = fixture(prisma);
      const recipient = owned();
      const remote = await googleDouble(f.auth, recipient);
      const first = await googleFinish(f.auth, await googleStart(f.auth, role));
      expect(first.headers.get("location")).toBe(
        `${f.config.appOrigin}/auth/complete`,
      );
      const user = await prisma.user.findUniqueOrThrow({
        where: { email: recipient },
        include: { accounts: true },
      });
      expect(user.role).toBe(role);
      expect(user.accounts.map((account) => account.providerId)).toEqual([
        "google",
      ]);
      expect(user.accounts[0]?.accountId).toBe(remote.subject);
      expect(
        (await post(f.auth, "/sign-in/email", { email: recipient, password }))
          .status,
      ).toBe(401);
      await post(f.auth, "/request-password-reset", {
        email: ` ${recipient.toUpperCase()} `,
      });
      const token = link(f.outbox, recipient, "Reset")
        .pathname.split("/")
        .at(-1);
      expect(
        (
          await post(f.auth, "/reset-password", {
            token,
            newPassword: password,
            role: "ADMIN",
          })
        ).status,
      ).toBe(200);
      expect(
        (await post(f.auth, "/sign-in/email", { email: recipient, password }))
          .status,
      ).toBe(200);
      const again = await googleFinish(
        f.auth,
        await googleStart(
          f.auth,
          role === "LEARNER" ? "INSTRUCTOR" : "LEARNER",
        ),
      );
      expect(again.headers.get("location")).toBe(
        `${f.config.appOrigin}/auth/complete`,
      );
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { accounts: true, sessions: true },
      });
      expect(after.role).toBe(role);
      expect(after.accounts).toHaveLength(2);
      expect(
        after.accounts.every((account) => account.userId === user.id),
      ).toBe(true);
    },
  );
  it("L01/L03 verifies both identities before implicit linking and rejects bypass routes", async () => {
    const f = await registered("INSTRUCTOR");
    await googleDouble(f.auth, f.recipient);
    const denied = await googleFinish(f.auth, await googleStart(f.auth));
    expect(denied.headers.get("location")).toContain("/auth/error");
    expect(
      await prisma.account.count({
        where: { userId: f.user.id, providerId: "google" },
      }),
    ).toBe(0);
    await verify(f.auth, f.outbox, f.recipient);
    const linked = await googleFinish(f.auth, await googleStart(f.auth));
    expect(linked.headers.get("location")).toContain("/auth/complete");
    expect(await prisma.user.count({ where: { email: f.recipient } })).toBe(1);
    expect(await prisma.account.count({ where: { userId: f.user.id } })).toBe(
      2,
    );
    for (const route of ["/link-social", "/unlink-account", "/set-password"])
      expect(
        (
          await post(
            f.auth,
            route,
            { provider: "google", newPassword: password },
            cookies(linked),
          )
        ).status,
      ).toBeGreaterThanOrEqual(400);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).role,
    ).toBe("INSTRUCTOR");
  });
  it("G02 rejects cross-origin/malformed intent, shortcut, unknown signin and unverified Google", async () => {
    const f = fixture(prisma);
    const recipient = owned();
    await googleDouble(f.auth, recipient, undefined, false);
    for (const body of [
      { provider: "github", requestSignUp: true },
      {
        provider: "google",
        requestSignUp: true,
        additionalData: { registrationRole: "ADMIN" },
      },
      {
        provider: "google",
        idToken: { token: "forged" },
        requestSignUp: false,
      },
    ])
      expect(
        (await post(f.auth, "/sign-in/social", body)).status,
      ).toBeGreaterThanOrEqual(400);
    expect(
      (
        await post(
          f.auth,
          "/sign-in/social",
          { provider: "google", requestSignUp: false },
          undefined,
          "https://evil.example",
        )
      ).status,
    ).toBe(403);
    const denied = await googleFinish(
      f.auth,
      await googleStart(f.auth, "INSTRUCTOR"),
    );
    expect(denied.headers.get("location")).toContain("/auth/error");
    expect(await prisma.user.count({ where: { email: recipient } })).toBe(0);
    vi.restoreAllMocks();
    await googleDouble(f.auth, recipient);
    const unknown = await googleFinish(f.auth, await googleStart(f.auth));
    expect(unknown.headers.get("location")).toContain("/auth/error");
    const flow = await googleStart(f.auth, "LEARNER");
    const copied = await googleFinish(f.auth, flow, "");
    expect(copied.headers.get("location")).toContain("/auth/error");
    expect(await prisma.user.count({ where: { email: recipient } })).toBe(0);
  });
  it("N03 gates canonical signup inserts across independent real connections", async () => {
    const recipient = owned();
    const gate = barrier();
    const clients = [database(), database()];
    try {
      const fixtures = clients.map((client) =>
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
      const results = await Promise.all(
        fixtures.map((contender, index) =>
          post(contender.auth, "/sign-up/email", {
            name: "Race",
            email: index ? recipient.toUpperCase() : ` ${recipient} `,
            password: index ? `${password}-other` : password,
            registrationRole: index ? "INSTRUCTOR" : "LEARNER",
          }),
        ),
      );
      expect(
        results.filter((response) => response.status === 200),
      ).toHaveLength(1);
      const winnerIndex = results.findIndex(
        (response) => response.status === 200,
      );
      const loserIndex = winnerIndex === 0 ? 1 : 0;
      const winner = fixtures[winnerIndex]!;
      const users = await prisma.user.findMany({
        where: { email: recipient },
        include: { accounts: true },
      });
      expect(users).toHaveLength(1);
      expect(users[0]?.accounts).toHaveLength(1);
      expect(users[0]?.accounts[0]?.userId).toBe(users[0]?.id);
      expect(users[0]?.role).toBe(winnerIndex === 0 ? "LEARNER" : "INSTRUCTOR");
      expect(users[0]?.accounts[0]?.providerId).toBe("credential");
      expect(users[0]?.accounts[0]?.accountId).toBe(users[0]?.id);
      expect(
        fixtures[loserIndex]!.outbox.filter(
          (message) => message.to === recipient,
        ),
      ).toHaveLength(0);
      expect((await verify(winner.auth, winner.outbox, recipient)).status).toBe(
        302,
      );
      const winningPassword =
        winnerIndex === 0 ? password : `${password}-other`;
      const losingPassword = loserIndex === 0 ? password : `${password}-other`;
      const login = await post(winner.auth, "/sign-in/email", {
        email: recipient,
        password: winningPassword,
      });
      expect(login.status).toBe(200);
      const session = await winner.auth.api.getSession({
        headers: new Headers({ cookie: cookies(login) }),
      });
      expect(session?.user.id).toBe(users[0]!.id);
      expect(session?.session.userId).toBe(users[0]!.id);
      expect(
        (
          await post(winner.auth, "/sign-in/email", {
            email: recipient,
            password: losingPassword,
          })
        ).status,
      ).toBe(401);
      expect(await prisma.user.count({ where: { email: recipient } })).toBe(1);
      expect(
        await prisma.account.count({ where: { userId: users[0]!.id } }),
      ).toBe(1);
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });
  it("X01 rolls user creation back after real credential insert failure", async () => {
    const recipient = owned();
    const fault = prisma.$extends({
      query: {
        account: {
          create: async () => {
            throw new Error("PRIVATE_STORAGE_CANARY");
          },
        },
      },
    }) as unknown as DebugClinicPrisma;
    const f = fixture(fault);
    expect(
      (
        await post(f.auth, "/sign-up/email", {
          name: "Rollback",
          email: recipient,
          password,
          registrationRole: "INSTRUCTOR",
        })
      ).status,
    ).toBeGreaterThanOrEqual(400);
    expect(await prisma.user.count({ where: { email: recipient } })).toBe(0);
  });
  it("G03 uses an atomic independent intent claim with exact-value/expiry validation", async () => {
    const gate = barrier();
    const clients = [database(), database()];
    try {
      const stores = clients.map((client) =>
        createIntentStore(
          client.$extends({
            query: {
              verification: {
                deleteMany: async ({ args, query }) => {
                  if (args.where?.value) await gate();
                  return query(args);
                },
              },
            },
          }) as unknown as DebugClinicPrisma,
          "origin",
          "auth",
        ),
      );
      const id = await stores[0]!.start({
        mode: "register",
        role: "INSTRUCTOR",
      });
      const results = await Promise.all(
        stores.map((store) => store.claim(id, id)),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(
        await prisma.verification.findUnique({ where: { id } }),
      ).toBeNull();
      expect(await stores[0]!.claim(id, id)).toBeNull();
      const plain = createIntentStore(prisma, "origin", "auth");
      for (const value of [
        "{}",
        '{"mode":"register","role":"ADMIN"}',
        JSON.stringify({
          mode: "register",
          role: "LEARNER",
          origin: "evil",
          authOrigin: "auth",
        }),
      ]) {
        const invalid = await plain.start({
          mode: "register",
          role: "LEARNER",
        });
        await prisma.verification.update({
          where: { id: invalid },
          data: { value },
        });
        expect(await plain.claim(invalid, invalid)).toBeNull();
        await prisma.verification.delete({ where: { id: invalid } });
      }
      const expired = await plain.start({ mode: "sign-in" });
      await prisma.verification.update({
        where: { id: expired },
        data: { expiresAt: new Date(0) },
      });
      expect(await plain.claim(expired, expired)).toBeNull();
      await prisma.verification.delete({ where: { id: expired } });
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });
  it("R03/R04 races atomic reset consumption and rolls token/session/hash back on storage failure", async () => {
    const f = await registered();
    await verify(f.auth, f.outbox, f.recipient);
    const sessions = await Promise.all([
      post(f.auth, "/sign-in/email", { email: f.recipient, password }),
      post(f.auth, "/sign-in/email", { email: f.recipient, password }),
    ]);
    await post(f.auth, "/request-password-reset", { email: f.recipient });
    const token = link(f.outbox, f.recipient, "Reset")
      .pathname.split("/")
      .at(-1)!;
    const before = await prisma.account.findFirstOrThrow({
      where: { userId: f.user.id },
    });
    const fault = fixture(
      prisma.$extends({
        query: {
          account: {
            updateMany: async () => {
              throw new Error("PRIVATE_RESET_CANARY");
            },
          },
        },
      }) as unknown as DebugClinicPrisma,
    );
    const failed = await post(fault.auth, "/reset-password", {
      token,
      newPassword: `${password}-new`,
    });
    expect(failed.status).toBeGreaterThanOrEqual(400);
    expect(
      (await prisma.account.findUniqueOrThrow({ where: { id: before.id } }))
        .password,
    ).toBe(before.password);
    expect(await prisma.session.count({ where: { userId: f.user.id } })).toBe(
      2,
    );
    expect(
      await prisma.verification.findFirst({
        where: { identifier: `reset-password:${token}` },
      }),
    ).not.toBeNull();
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
      expect(await prisma.session.count({ where: { userId: f.user.id } })).toBe(
        0,
      );
      expect(
        (
          await post(f.auth, "/reset-password", {
            token,
            newPassword: password,
          })
        ).status,
      ).toBe(400);
      for (const session of sessions)
        expect(
          await f.auth.api.getSession({
            headers: new Headers({ cookie: cookies(session) }),
          }),
        ).toBeNull();
      expect(
        (await post(f.auth, "/sign-in/email", { email: f.recipient, password }))
          .status,
      ).toBe(401);
      const logins = await Promise.all(
        [0, 1].map((index) =>
          post(f.auth, "/sign-in/email", {
            email: f.recipient,
            password: `${password}-${index}`,
          }),
        ),
      );
      expect(logins.filter((response) => response.status === 200)).toHaveLength(
        1,
      );
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });
  it("N04 collision preflight aborts all changes and apply preserves owners while invalidating DB artifacts", async () => {
    const recipient = owned();
    const alternate = ` ${recipient.toUpperCase()} `;
    identities.push(alternate);
    const one = await prisma.user.create({
      data: { name: "Legacy", email: recipient, role: "INSTRUCTOR" },
    });
    const two = await prisma.user.create({
      data: { name: "Legacy duplicate", email: alternate, role: "LEARNER" },
    });
    const changedEmail = owned();
    const legacy = `\u2003${changedEmail.toUpperCase()}\ufeff`;
    identities.push(legacy);
    const changed = await prisma.user.create({
      data: {
        name: "Legacy distinct",
        email: legacy,
        role: "INSTRUCTOR",
        accounts: {
          create: { accountId: "legacy-subject", providerId: "google" },
        },
      },
    });
    await expect(
      normalizeIdentities(prisma, true, async () => {}),
    ).rejects.toThrow("collision");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: changed.id } }))
        .email,
    ).toBe(legacy);
    await prisma.user.delete({ where: { id: two.id } });
    const account = await prisma.account.findFirstOrThrow({
      where: { userId: changed.id },
    });
    const artifact = await prisma.verification.create({
      data: {
        identifier: `${INTENT_NAMESPACE}legacy`,
        value: "legacy",
        expiresAt: new Date(Date.now() + 100000),
      },
    });
    const fault = prisma.$extends({
      query: {
        session: {
          deleteMany: async () => {
            throw new Error("Synthetic transition fault");
          },
        },
      },
    }) as unknown as DebugClinicPrisma;
    await expect(
      normalizeIdentities(fault, true, async () => {}),
    ).rejects.toThrow("Synthetic transition fault");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: changed.id } }))
        .email,
    ).toBe(legacy);
    expect(
      await prisma.verification.findUnique({ where: { id: artifact.id } }),
    ).not.toBeNull();
    const map: unknown[] = [];
    await expect(
      normalizeIdentities(prisma, true, async (changes) => {
        map.push(...changes);
      }),
    ).resolves.toMatchObject({ applied: true });
    expect(map).toContainEqual({
      id: changed.id,
      before: legacy,
      after: changedEmail,
    });
    expect(
      await prisma.user.findUnique({ where: { id: changed.id } }),
    ).toMatchObject({ email: changedEmail, role: "INSTRUCTOR" });
    expect(
      await prisma.account.findUnique({ where: { id: account.id } }),
    ).toMatchObject({ userId: changed.id, accountId: "legacy-subject" });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: one.id } })).role,
    ).toBe("INSTRUCTOR");
    expect(await prisma.verification.count()).toBe(0);
    expect(await prisma.session.count()).toBe(0);
  });
});
