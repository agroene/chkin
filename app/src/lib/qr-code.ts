/**
 * QR Code Utilities
 *
 * Generate QR codes and short codes for form access.
 */

import QRCode from "qrcode";
import { nanoid } from "nanoid";

/**
 * Generate a unique short code for QR codes
 * Uses nanoid for cryptographically secure random strings
 * Length of 8 gives ~35 trillion combinations
 */
export function generateShortCode(): string {
  return nanoid(8);
}

/**
 * Generate a QR code as a data URL (base64 PNG)
 */
export async function generateQRCodeDataURL(
  url: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    width: options?.width ?? 300,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color?.dark ?? "#000000",
      light: options?.color?.light ?? "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  };

  return QRCode.toDataURL(url, qrOptions);
}

/**
 * Generate a QR code as SVG string
 */
export async function generateQRCodeSVG(
  url: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  const qrOptions: QRCode.QRCodeToStringOptions = {
    type: "svg",
    width: options?.width ?? 300,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color?.dark ?? "#000000",
      light: options?.color?.light ?? "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  };

  return QRCode.toString(url, qrOptions);
}

/**
 * Build the public form URL from a short code
 */
export function buildFormUrl(shortCode: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/c/${shortCode}`;
}
