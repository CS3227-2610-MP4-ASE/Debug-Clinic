/** Keep opt-in browser verification local without taking over other servers. */
export function browserTestOrigin(): string {
  const raw = process.env["E2E_APP_ORIGIN"] ?? "http://127.0.0.1:5173";
  const target = new URL(raw);
  if (
    target.protocol !== "http:" ||
    target.hostname !== "127.0.0.1" ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.search ||
    target.hash ||
    target.origin !== raw
  )
    throw new Error("E2E_APP_ORIGIN must be a bare HTTP loopback origin");
  return target.origin;
}

export function browserTestBackendPort(): string {
  const raw = process.env["E2E_BACKEND_PORT"] ?? "3001";
  if (!/^[1-9]\d{0,4}$/.test(raw) || Number(raw) > 65_535)
    throw new Error("E2E_BACKEND_PORT must be an integer port from 1 to 65535");
  return raw;
}
