import nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vitest";
import {
  createAuthEmailSender,
  type MailTransportFactory,
} from "../src/auth/email.js";
import { readEnv } from "../src/config/env.js";

const config = readEnv({
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:5173",
  CORS_ORIGINS: "http://localhost:5173",
  DATABASE_URL: "postgresql://localhost/test",
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: "test-secret-at-least-thirty-two-characters",
  SMTP_USER: "sender@gmail.com",
  SMTP_PASSWORD: "synthetic-app-password",
});
const email = {
  to: "learner@example.test",
  subject: "Verify your email",
  text: "Verify: https://example.test/verify?token=test",
};

describe("SMTP authentication email", () => {
  it("creates a real MIME message with the sender, recipient, and verification link", async () => {
    const stream = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
    let rendered = "";
    const factory = vi.fn<MailTransportFactory>().mockImplementation(() => ({
      sendMail: async (message) => {
        const result = await stream.sendMail(message);
        rendered = result.message.toString();
        return { accepted: [message.to], rejected: [] };
      },
    }));
    await createAuthEmailSender(config, factory)(email);
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        tls: { rejectUnauthorized: true },
        logger: false,
        debug: false,
      }),
    );
    expect(rendered).toContain("From: sender@gmail.com");
    expect(rendered).toContain("To: learner@example.test");
    expect(rendered).toContain(email.text);
  });
  it("requires STARTTLS for port 587", async () => {
    const factory = vi.fn<MailTransportFactory>().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ accepted: [email.to] }),
    });
    await createAuthEmailSender(
      { ...config, smtp: { ...config.smtp!, port: 587, secure: false } },
      factory,
    )(email);
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, requireTLS: true }),
    );
  });
  it.each([
    { accepted: [], rejected: [email.to] },
    { accepted: [email.to], rejected: [email.to] },
  ])("treats rejected delivery as failure", async (result) => {
    const factory = vi
      .fn<MailTransportFactory>()
      .mockReturnValue({ sendMail: vi.fn().mockResolvedValue(result) });
    await expect(createAuthEmailSender(config, factory)(email)).rejects.toThrow(
      "temporarily unavailable",
    );
  });
  it("does not expose SMTP credentials or provider errors", async () => {
    const factory = vi.fn<MailTransportFactory>().mockReturnValue({
      sendMail: vi
        .fn()
        .mockRejectedValue(new Error(`private ${config.smtp!.password}`)),
    });
    await expect(createAuthEmailSender(config, factory)(email)).rejects.toThrow(
      "Email delivery is temporarily unavailable",
    );
  });
  it("does not initialize a transport when email is unconfigured", async () => {
    const factory = vi.fn<MailTransportFactory>();
    const withoutEmail = { ...config };
    delete withoutEmail.smtp;
    delete withoutEmail.emailFrom;
    await expect(
      createAuthEmailSender(withoutEmail, factory)(email),
    ).rejects.toThrow("not configured");
    expect(factory).not.toHaveBeenCalled();
  });
});
