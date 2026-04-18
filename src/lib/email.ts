import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  ...(process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {}),
});

const FROM = process.env.SMTP_FROM || "Selfstack <noreply@selfstack.local>";

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
      <p>Diese E-Mail wurde automatisch von Selfstack versendet.</p>
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
    <p>Hallo <strong>${escapeHtml(name)}</strong>,</p>
    <p>Ein Konto wurde für dich auf Selfstack erstellt. Hier sind deine Zugangsdaten:</p>
    <div class="code-box">
      <div class="label">E-Mail</div>
      <div class="value">${escapeHtml(to)}</div>
    </div>
    <div class="code-box">
      <div class="label">Einmalpasswort</div>
      <div class="value">${escapeHtml(password)}</div>
    </div>
    <p>Du wirst bei der ersten Anmeldung aufgefordert, dein Passwort zu ändern.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${escapeHtml(loginUrl)}" class="btn">Jetzt anmelden</a>
    </p>
    <p class="muted">Falls du diese E-Mail nicht erwartet hast, kannst du sie ignorieren.</p>
  `);

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Dein Selfstack-Konto wurde erstellt",
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
    <p>Hallo <strong>${escapeHtml(name)}</strong>,</p>
    <p>Dein Passwort wurde von einem Administrator zurückgesetzt. Hier ist dein neues Passwort:</p>
    <div class="code-box">
      <div class="label">Neues Passwort</div>
      <div class="value">${escapeHtml(newPassword)}</div>
    </div>
    <p>Du wirst bei der nächsten Anmeldung aufgefordert, dein Passwort zu ändern.</p>
    <p style="text-align: center; margin: 28px 0;">
      <a href="${escapeHtml(loginUrl)}" class="btn">Jetzt anmelden</a>
    </p>
  `);

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Dein Selfstack-Passwort wurde zurückgesetzt",
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
