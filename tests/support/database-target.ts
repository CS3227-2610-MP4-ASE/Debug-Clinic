/** Validate before creating a client: libpq query options can override URL hosts. */
export function testDatabaseUrl(
  raw = process.env["TEST_DATABASE_URL"],
): string {
  if (!raw) throw new Error("Explicit isolated database URL required");
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.endsWith("_test") ||
    url.search ||
    url.hash
  )
    throw new Error("Unsafe synthetic database target");
  return raw;
}

export function testRuntimeDatabaseTarget(config: {
  databaseUrl: string;
  runtimeDatabaseUrl: string;
}): string {
  const direct = testDatabaseUrl(config.databaseUrl);
  const runtime = testDatabaseUrl(config.runtimeDatabaseUrl);
  if (direct !== runtime)
    throw new Error(
      "Synthetic direct and runtime database targets must match exactly",
    );
  return runtime;
}
