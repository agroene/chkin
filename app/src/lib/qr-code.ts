/**
 * QR Code Utilities
 *
 * Generate QR codes and short codes for form access.
 */

import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { networkInterfaces } from "os";

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
 * Get the local network IP address for mobile device testing
 * Returns the first non-internal IPv4 address found
 */
function getLocalNetworkIP(): string | null {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    const netInterfaces = nets[name];
    if (!netInterfaces) continue;

    for (const net of netInterfaces) {
      // Skip internal and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

/**
 * Build the public form URL from a short code
 * In development, uses local network IP for mobile device testing
 */
export function buildFormUrl(shortCode: string, baseUrl?: string): string {
  // If explicit base URL provided, use it
  if (baseUrl) {
    return `${baseUrl}/c/${shortCode}`;
  }

  // Use configured app URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/c/${shortCode}`;
  }

  // In development, try to use local network IP for mobile testing
  if (process.env.NODE_ENV === "development") {
    const localIP = getLocalNetworkIP();
    if (localIP) {
      return `http://${localIP}:3000/c/${shortCode}`;
    }
  }

  // Fallback to localhost
  return `http://localhost:3000/c/${shortCode}`;
}
