import express from "express";
import serverless from "serverless-http";
import { describe, expect, it } from "vitest";
import { toWebHandler } from "../src/lib/web-handler.js";

describe("Netlify Web/Express adapter", () => {
  const app = express();
  app.use(express.json());
  app.post("/api/echo", (req, res) =>
    res.json({ body: req.body, query: req.query, cookie: req.headers.cookie }),
  );
  app.get("/api/login", (_req, res) =>
    res
      .cookie("session", "one", { httpOnly: true, secure: true })
      .cookie("state", "two", { httpOnly: true })
      .redirect("/learner"),
  );
  app.get("/api/empty", (_req, res) => res.sendStatus(204));
  app.get("/api/binary", (_req, res) =>
    res.type("image/png").send(Buffer.from([0, 255, 128])),
  );
  const handler = toWebHandler(serverless(app, { binary: true }));

  it("preserves JSON, repeated queries, and inbound cookies", async () => {
    const response = await handler(
      new Request("https://preview.example/api/echo?key=1&key=2", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "session=one; state=two",
        },
        body: JSON.stringify({ name: "Learner ✓" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      body: { name: "Learner ✓" },
      query: { key: ["1", "2"] },
      cookie: "session=one; state=two",
    });
  });
  it("preserves redirects and separate authentication cookies", async () => {
    const response = await handler(
      new Request("https://preview.example/api/login"),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/learner");
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.getSetCookie()[0]).toContain("Secure");
    expect(response.headers.getSetCookie()[0]).toContain("HttpOnly");
  });
  it("supports bodyless statuses and HEAD", async () => {
    expect(
      (await handler(new Request("https://preview.example/api/empty"))).status,
    ).toBe(204);
    expect(
      await (
        await handler(
          new Request("https://preview.example/api/login", { method: "HEAD" }),
        )
      ).text(),
    ).toBe("");
  });
  it("preserves binary response bytes", async () => {
    const response = await handler(
      new Request("https://preview.example/api/binary"),
    );
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
      0, 255, 128,
    ]);
  });
});
