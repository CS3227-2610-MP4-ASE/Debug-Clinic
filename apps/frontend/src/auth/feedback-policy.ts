const messages: Record<string, string> = {
  EMAIL_NOT_VERIFIED:
    "Verify your email before signing in. You can request another verification message.",
  INVALID_EMAIL_OR_PASSWORD:
    "Sign-in failed. Check your details or reset your password.",
  USER_ALREADY_EXISTS:
    "Sign in or reset your password to continue with your existing account.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Sign in or reset your password to continue with your existing account.",
  REGISTRATION_ROLE_REQUIRED:
    "Choose Learner or Instructor before registering.",
  INVALID_NAME: "Enter a name up to 100 characters.",
  PASSWORD_TOO_SHORT: "Use a password with 12 to 128 characters.",
  PASSWORD_TOO_LONG: "Use a password with 12 to 128 characters.",
  INVALID_TOKEN: "This link is invalid or expired. Request a new link.",
  TOKEN_EXPIRED: "This link has expired. Request a new link.",
  EMAIL_UNAVAILABLE: "Email service is unavailable. Try again later.",
};
export function safeAuthMessage(code: unknown, fallback: string): string {
  return typeof code === "string" && Object.hasOwn(messages, code)
    ? messages[code]!
    : fallback;
}
