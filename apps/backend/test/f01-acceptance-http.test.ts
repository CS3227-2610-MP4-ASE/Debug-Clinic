import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp, type CreateAppOptions } from "../src/app.js";
import { readEnv } from "../src/config/env.js";
import {
  f01Draft,
  f01Generation,
  f01Learner,
  f01Origin,
  f01Owner,
  f01Saved,
  f01Topic,
} from "../../../tests/support/f01-fixtures.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: f01Origin,
  CORS_ORIGINS: f01Origin,
  DATABASE_URL:
    "postgresql://synthetic:synthetic@127.0.0.1:55441/debugclinic_f01_test",
  BETTER_AUTH_URL: f01Origin,
  BETTER_AUTH_SECRET: "f01-synthetic-secret-at-least-thirty-two-characters",
  AI_PROVIDER: "fake",
  LOG_LEVEL: "silent",
});
function setup(inject = true, productionLimit = false) {
  // Module injection is a declared public boundary, not a persistence substitute.
  const module = {
    generate: vi.fn().mockResolvedValue({
      topic: f01Topic,
      draft: f01Draft,
      generation: f01Generation,
    }),
    save: vi.fn().mockResolvedValue({ draft: f01Saved }),
    list: vi.fn().mockResolvedValue({ drafts: [], nextOffset: null }),
    get: vi.fn().mockResolvedValue({ draft: f01Saved }),
  };
  const options = {
    config: productionLimit
      ? { ...config, nodeEnv: "production" as const }
      : config,
    database: { $queryRawUnsafe: vi.fn().mockResolvedValue([]) },
    sessionResolver: async (
      req: Parameters<NonNullable<CreateAppOptions["sessionResolver"]>>[0],
    ) =>
      req.header("authorization") === "Bearer owner"
        ? f01Owner
        : req.header("authorization") === "Bearer learner"
          ? f01Learner
          : null,
    profileUpdater: async () => f01Owner,
    ...(inject ? { instructorDrafts: module } : {}),
  };
  return { app: createApp(options), module };
}
const operations = [
  ["post", "/api/v1/instructor/questions/generate", { topic: f01Topic }],
  [
    "post",
    "/api/v1/instructor/drafts",
    { topic: f01Topic, draft: f01Draft, generationId: f01Generation.id },
  ],
  ["get", "/api/v1/instructor/drafts", undefined],
  ["get", "/api/v1/instructor/drafts/f01-saved", undefined],
] as const;

describe("F01 independent public HTTP policy", () => {
  for (const path of [
    "/api/v1/instructor/questions/generate",
    "/api/v1/instructor/drafts",
  ]) {
    for (const bytes of [65535, 65536, 65537]) {
      it(`B04 ${path} UTF8 and escaped JSON overhead at${bytes} bytes`, async () => {
        const { app } = setup();
        const prefix = '{"topic":"界\\n';
        const suffix = '"}';
        const raw =
          prefix +
          "x".repeat(bytes - Buffer.byteLength(prefix + suffix)) +
          suffix;
        expect(Buffer.byteLength(raw)).toBe(bytes);
        const response = await request(app)
          .post(path)
          .set("authorization", "Bearer owner")
          .set("origin", f01Origin)
          .set("content-type", "application/json")
          .send(raw);
        if (bytes > 65536) expect(response.status).toBe(413);
        else expect(response.status).not.toBe(413);
      });
    }
  }
  it("B04 unexpected injected module fault retains safe500 envelope", async () => {
    const { app, module } = setup();
    module.list.mockRejectedValue(new Error("f01-private-module-stack"));
    const response = await request(app)
      .get("/api/v1/instructor/drafts")
      .set("authorization", "Bearer owner")
      .expect(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(response.body)).not.toMatch(
      /f01-private-module-stack|Error:|stack/,
    );
  });
  it("B19 no saved-edit/delete/publication mutation routes exist", async () => {
    const { app } = setup();
    await request(app)
      .patch("/api/v1/instructor/drafts/f01-saved")
      .set("authorization", "Bearer owner")
      .set("origin", f01Origin)
      .send({ title: "edit saved" })
      .expect(404);
    await request(app)
      .delete("/api/v1/instructor/drafts/f01-saved")
      .set("authorization", "Bearer owner")
      .set("origin", f01Origin)
      .expect(404);
    for (const action of ["publish", "verify", "regenerate"])
      await request(app)
        .post(`/api/v1/instructor/drafts/f01-saved/${action}`)
        .set("authorization", "Bearer owner")
        .set("origin", f01Origin)
        .send({})
        .expect(404);
  });
  for (const [method, path, body] of operations) {
    for (const [token, status] of [
      ["", 401],
      ["learner", 403],
    ] as const) {
      it(`B01 ${method} ${path} denies ${token || "no session"} before module work`, async () => {
        const { app, module } = setup();
        let call = request(app)[method](path).set("origin", f01Origin);
        if (token) call = call.set("authorization", `Bearer ${token}`);
        if (body) call = call.send(body);
        const response = await call.expect(status);
        expect(response.body.error.code).toBe(
          status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        );
        expect(response.body.error.requestId).toEqual(expect.any(String));
        for (const operation of Object.values(module))
          expect(operation).not.toHaveBeenCalled();
      });
    }
  }
  for (const path of [
    "/api/v1/instructor/questions/generate",
    "/api/v1/instructor/drafts",
  ]) {
    for (const origin of [
      undefined,
      "null",
      "https://foreign.example.test",
      `${f01Origin}.evil.test`,
    ]) {
      it(`B02 ${path} rejects origin ${origin ?? "missing"} without module work`, async () => {
        const { app, module } = setup();
        let call = request(app).post(path).set("authorization", "Bearer owner");
        if (origin) call = call.set("origin", origin);
        const response = await call.send({ topic: f01Topic }).expect(403);
        expect(response.body.error.code).toBe("FORBIDDEN");
        for (const operation of Object.values(module))
          expect(operation).not.toHaveBeenCalled();
      });
    }
    it(`B02 ${path} rejects non-JSON without mutation`, async () => {
      const { app, module } = setup();
      const response = await request(app)
        .post(path)
        .set("authorization", "Bearer owner")
        .set("origin", f01Origin)
        .set("content-type", "text/plain")
        .send("topic=Python lists");
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      for (const operation of Object.values(module))
        expect(operation).not.toHaveBeenCalled();
    });
    it(`B04 ${path} malformed JSON is safe400`, async () => {
      const { app, module } = setup();
      const response = await request(app)
        .post(path)
        .set("authorization", "Bearer owner")
        .set("origin", f01Origin)
        .set("content-type", "application/json")
        .send('{"topic":"f01-parser-secret", invalid}')
        .expect(400);
      expect(response.body.error.code).toBe("BAD_REQUEST");
      expect(JSON.stringify(response.body)).not.toMatch(
        /f01-parser-secret|stack|SyntaxError/,
      );
      for (const operation of Object.values(module))
        expect(operation).not.toHaveBeenCalled();
    });
    for (const bytes of [65535, 65536, 65537]) {
      it(`B04 ${path} raw encoded JSON ${bytes} byte boundary`, async () => {
        const { app } = setup();
        const prefix = '{"topic":"';
        const suffix = '"}';
        const raw =
          prefix +
          "x".repeat(bytes - Buffer.byteLength(prefix + suffix)) +
          suffix;
        expect(Buffer.byteLength(raw)).toBe(bytes);
        const response = await request(app)
          .post(path)
          .set("authorization", "Bearer owner")
          .set("origin", f01Origin)
          .set("content-type", "application/json")
          .send(raw);
        // Under-cap input can still fail topic validation, but must not be413.
        if (bytes > 65536) expect(response.status).toBe(413);
        else expect(response.status).not.toBe(413);
      });
    }
  }
  it("B05/B27 missing optional module gives503 only for F01", async () => {
    const { app } = setup(false);
    await request(app).get("/api/health").expect(200);
    await request(app)
      .get("/api/v1/instructor/ping")
      .set("authorization", "Bearer owner")
      .expect(200);
    for (const [method, path, body] of operations) {
      let call = request(app)
        [method](path)
        .set("authorization", "Bearer owner")
        .set("origin", f01Origin);
      if (body) call = call.send(body);
      const response = await call.expect(503);
      expect(response.body.error.code).toBe("DEPENDENCY_UNAVAILABLE");
    }
  });
  it("B04/B27 retains actual production120 requests per60seconds", async () => {
    const { app } = setup(false, true);
    for (let n = 1; n <= 120; n++)
      await request(app).get("/api/health").expect(200);
    const response = await request(app).get("/api/health").expect(429);
    expect(response.body.error.code).toBe("RATE_LIMITED");
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(Date.now() + 60001);
      await request(app).get("/api/health").expect(200);
    } finally {
      vi.useRealTimers();
    }
  });
});
