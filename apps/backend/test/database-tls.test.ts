import { X509Certificate } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { databasePoolConfig } from "../src/db/client.js";

describe("Supabase runtime TLS", () => {
  it.each([
    "aws-0-ap-northeast-1.pooler.supabase.com",
    "db.synthetic.supabase.co",
  ])("passes verified provider trust through pg URL parsing for %s", (host) => {
    const options = databasePoolConfig(
      `postgresql://synthetic:synthetic@${host}:6543/postgres?sslmode=require&application_name=diagnostic`,
    );
    const client = new Client(options);
    // @types/pg declares Client.ssl as boolean, although pg stores TLS options.
    const ssl: unknown = Reflect.get(client, "ssl");
    expect(ssl).toEqual(expect.objectContaining({ rejectUnauthorized: true }));
    if (
      !ssl ||
      typeof ssl !== "object" ||
      !("ca" in ssl) ||
      typeof ssl.ca !== "string"
    )
      throw new Error("Expected explicit trusted CA");
    const cert = new X509Certificate(ssl.ca);
    expect(cert.ca).toBe(true);
    expect(cert.fingerprint256).toBe(
      "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
    );
    expect(options.connectionString).toContain("application_name=diagnostic");
  });

  it.each([
    "postgresql://synthetic@127.0.0.1:55434/auth_test",
    "postgresql://synthetic@ep-synthetic.neon.tech/neondb?sslmode=require",
    "postgresql://synthetic@pooler.supabase.com.attacker.test/postgres?sslmode=require",
    "postgresql://synthetic@aws-0-test.pooler.supabase.com/postgres?sslmode=verify-full&sslrootcert=custom.crt",
  ])("preserves non-provider and explicit certificate configuration", (url) => {
    expect(databasePoolConfig(url)).toEqual({ connectionString: url });
  });
});
