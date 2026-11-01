import "dotenv/config";
import nodemailer from "nodemailer";
import { smtpTransportOptions } from "../apps/backend/src/auth/email.js";
import { readEnv } from "../apps/backend/src/config/env.js";

try {
  const config = readEnv();
  const transport = nodemailer.createTransport(smtpTransportOptions(config));
  try {
    await transport.verify();
    console.log(
      "SMTP connection and authentication verified. No email was sent.",
    );
  } finally {
    transport.close();
  }
} catch {
  console.error(
    "SMTP verification failed. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, and SMTP_PASSWORD. For Gmail, use an app password with 2-Step Verification enabled. Secret values and server responses are omitted.",
  );
  process.exitCode = 1;
}
