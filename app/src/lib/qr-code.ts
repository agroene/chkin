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
 * Prioritizes physical network adapters (Wi-Fi, Ethernet) over virtual ones (WSL, VPN, etc.)
 */
function getLocalNetworkIP(): string | null {
  const nets = networkInterfaces();
  const candidates: { name: string; address: string; priority: number }[] = [];

  for (const name of Object.keys(nets)) {
    const netInterfaces = nets[name];
    if (!netInterfaces) continue;

    for (const net of netInterfaces) {
      // Skip internal and non-IPv4 addresses
      if (net.family !== "IPv4" || net.internal) continue;

      // Determine priority based on interface name
      // Lower number = higher priority
      let priority = 50; // Default priority

      const lowerName = name.toLowerCase();

      // Highest priority: Wi-Fi and standard Ethernet
      if (lowerName.includes("wi-fi") || lowerName.includes("wifi")) {
        priority = 10;
      } else if (lowerName === "ethernet" || lowerName.match(/^ethernet \d*$/i)) {
        priority = 15;
      }
      // Lower priority: Virtual adapters (WSL, Hyper-V, VPN, etc.)
      else if (
        lowerName.includes("vethernet") ||
        lowerName.includes("wsl") ||
        lowerName.includes("hyper-v") ||
        lowerName.includes("virtual") ||
        lowerName.includes("vpn") ||
        lowerName.includes("tailscale")
      ) {
        priority = 90;
      }
      // Medium priority: Mobile broadband, Bluetooth
      else if (lowerName.includes("cellular") || lowerName.includes("mobile")) {
        priority = 70;
      } else if (lowerName.includes("bluetooth")) {
        priority = 80;
      }

      candidates.push({ name, address: net.address, priority });
    }
  }

  // Sort by priority and return the best candidate
  candidates.sort((a, b) => a.priority - b.priority);

  if (candidates.length > 0) {
    return candidates[0].address;
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
