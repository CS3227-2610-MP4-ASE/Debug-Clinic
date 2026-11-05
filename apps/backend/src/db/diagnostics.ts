type DatabaseFailure =
  "tls" | "credentials" | "connectivity" | "target" | "capacity" | "unknown";

const failureCodes: Record<string, DatabaseFailure> = {
  TlsConnectionError: "tls",
  SELF_SIGNED_CERT_IN_CHAIN: "tls",
  DEPTH_ZERO_SELF_SIGNED_CERT: "tls",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "tls",
  CERT_HAS_EXPIRED: "tls",
  ERR_TLS_CERT_ALTNAME_INVALID: "tls",
  P1011: "tls",
  AuthenticationFailed: "credentials",
  DatabaseAccessDenied: "credentials",
  "28P01": "credentials",
  "28000": "credentials",
  P1000: "credentials",
  DatabaseNotReachable: "connectivity",
  ConnectionClosed: "connectivity",
  SocketTimeout: "connectivity",
  ENOTFOUND: "connectivity",
  EAI_AGAIN: "connectivity",
  ECONNREFUSED: "connectivity",
  ECONNRESET: "connectivity",
  ETIMEDOUT: "connectivity",
  P1001: "connectivity",
  P1002: "connectivity",
  P1017: "connectivity",
  DatabaseDoesNotExist: "target",
  "3D000": "target",
  P1003: "target",
  TooManyConnections: "capacity",
  "53300": "capacity",
  P2037: "capacity",
};

/** Inspect structured driver codes only; never return exception text or values. */
export function classifyDatabaseFailure(
  error: unknown,
  depth = 0,
): DatabaseFailure {
  if (depth > 6 || !error || typeof error !== "object") return "unknown";
  const record = error as Record<string, unknown>;
  for (const key of ["kind", "originalCode", "code"]) {
    const value = record[key];
    if (typeof value === "string" && Object.hasOwn(failureCodes, value))
      return failureCodes[value]!;
  }
  for (const key of ["cause", "meta", "driverAdapterError", "originalError"]) {
    const result = classifyDatabaseFailure(record[key], depth + 1);
    if (result !== "unknown") return result;
  }
  return "unknown";
}
