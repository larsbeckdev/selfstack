import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Selfstack";

/**
 * Generate a fresh base32 secret for TOTP enrollment.
 */
export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

/**
 * Build an otpauth:// URL for the given user/secret.
 */
export function buildOtpAuthUrl(label: string, secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.toString();
}

/**
 * Render the otpauth URL as a data-URL QR code (PNG).
 */
export async function renderQrCodeDataUrl(
  label: string,
  secret: string,
): Promise<string> {
  const url = buildOtpAuthUrl(label, secret);
  return QRCode.toDataURL(url, { margin: 1, width: 240 });
}

/**
 * Verify a 6-digit TOTP token against a base32 secret.
 * Allows ±1 step drift.
 */
export function verifyTotp(secret: string, token: string): boolean {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token: clean, window: 1 });
  return delta !== null;
}
