import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

const SMTP_KEYS = {
  host: "smtp_host",
  port: "smtp_port",
  secure: "smtp_secure",
  user: "smtp_user",
  pass: "smtp_pass",
  from: "smtp_from",
} as const;

async function readSetting(key: string): Promise<string | null> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/**
 * Load SMTP configuration from the database, falling back to environment
 * variables (legacy deployments). Includes the password — server-only.
 */
export async function loadSmtpConfig(): Promise<SmtpConfig> {
  const [host, port, secure, user, pass, from] = await Promise.all([
    readSetting(SMTP_KEYS.host),
    readSetting(SMTP_KEYS.port),
    readSetting(SMTP_KEYS.secure),
    readSetting(SMTP_KEYS.user),
    readSetting(SMTP_KEYS.pass),
    readSetting(SMTP_KEYS.from),
  ]);

  return {
    host: host || process.env.SMTP_HOST || "localhost",
    port: Number(port ?? process.env.SMTP_PORT ?? 587),
    secure: (secure ?? process.env.SMTP_SECURE) === "true",
    user: user || process.env.SMTP_USER || "",
    pass: pass || process.env.SMTP_PASS || "",
    from:
      from || process.env.SMTP_FROM || "Selfstack <noreply@selfstack.local>",
  };
}

async function getTransporter(): Promise<{
  transporter: Transporter;
  from: string;
}> {
  const cfg = await loadSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    ...(cfg.user && cfg.pass
      ? { auth: { user: cfg.user, pass: cfg.pass } }
      : {}),
  });
  return { transporter, from: cfg.from };
}

export async function verifySmtpConfig(): Promise<void> {
  const { transporter } = await getTransporter();
  await transporter.verify();
}

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #18181b; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; }
    .body { padding: 32px; }
    .body p { color: #3f3f46; line-height: 1.6; margin: 0 0 16px; }
    .code-box { background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px 20px; margin: 20px 0; text-align: center; }
    .code-box .label { font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .code-box .value { font-size: 22px; font-weight: 700; color: #18181b; font-family: monospace; letter-spacing: 0.1em; }
    .btn { display: inline-block; background: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 14px; }
    .footer { padding: 20px 32px; border-top: 1px solid #e4e4e7; }
    .footer p { color: #a1a1aa; font-size: 12px; margin: 0; }
    .muted { color: #71717a; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Selfstack</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>This email was sent automatically by Selfstack.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  password: string,
  loginUrl: string,
) {
  const html = baseLayout(`
    <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p>An account has been created for you on Selfstack. Here are your credentials:</p>
    <div class="code-box">
      <div class="label">Email</div>
      <div class="value">${escapeHtml(to)}</div>
    </div>
    <div class="code-box">
      <div class="label">One-time password</div>
      <div class="value">${escapeHtml(password)}</div>
    </div>
    <p>You will be prompted to change your password on first sign-in.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${escapeHtml(loginUrl)}" class="btn">Sign in now</a>
    </p>
    <p class="muted">If you did not expect this email, you can safely ignore it.</p>
  `);

  const { transporter, from } = await getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: "Your Selfstack account has been created",
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  newPassword: string,
  loginUrl: string,
) {
  const html = baseLayout(`
    <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
    <p>Your password has been reset by an administrator. Here is your new password:</p>
    <div class="code-box">
      <div class="label">New password</div>
      <div class="value">${escapeHtml(newPassword)}</div>
    </div>
    <p>You will be prompted to change your password on next sign-in.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${escapeHtml(loginUrl)}" class="btn">Sign in now</a>
    </p>
  `);

  const { transporter, from } = await getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: "Your Selfstack password has been reset",
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generatePassword(length = 12): string {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

export async function sendTestEmail(to: string): Promise<void> {
  const { transporter, from } = await getTransporter();
  const html = baseLayout(`
    <p>This is a <strong>test email</strong> from Selfstack.</p>
    <p class="muted">If you receive this message, the SMTP configuration is correct.</p>
  `);
  await transporter.sendMail({
    from,
    to,
    subject: "Selfstack SMTP test",
    html,
  });
}
