export function f01DatabaseUrl(): string {
  const raw = process.env["TEST_DATABASE_URL"];
  if (!raw)
    throw new Error("F01 acceptance requires explicit TEST_DATABASE_URL");
  const url = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "55441" ||
    url.pathname !== "/debugclinic_f01_test" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "F01 acceptance requires the assigned multi synthetic PostgreSQL target",
    );
  }
  return raw;
}
