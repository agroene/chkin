/**
 * Network Utilities
 *
 * Provides functions for detecting local network IPs and building URLs
 * that work across devices on the same network during development.
 *
 * @module lib/network
 */

import { networkInterfaces } from "os";

/**
 * Get the local network IP address for mobile device testing
 * Prioritizes physical network adapters (Wi-Fi, Ethernet) over virtual ones (WSL, VPN, etc.)
 */
export function getLocalNetworkIP(): string | null {
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
 * Get all local network IPs (for trusted origins)
 */
export function getAllLocalNetworkIPs(): string[] {
  const nets = networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(nets)) {
    const netInterfaces = nets[name];
    if (!netInterfaces) continue;

    for (const net of netInterfaces) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}

/**
 * Get the base URL for the application
 * In non-production without NEXT_PUBLIC_APP_URL, uses the best local network IP
 */
export function getAppBaseUrl(): string {
  // Use configured app URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // In non-production (development or undefined NODE_ENV), try to use local network IP for mobile testing
  if (process.env.NODE_ENV !== "production") {
    const localIP = getLocalNetworkIP();
    if (localIP) {
      return `http://${localIP}:3000`;
    }
  }

  // Fallback to localhost
  return "http://localhost:3000";
}

/**
 * Get the DocuSeal URL for the application
 * In non-production without explicit DOCUSEAL_URL with a real IP, uses the local network IP
 */
export function getDocuSealUrl(): string {
  const configuredUrl = process.env.DOCUSEAL_URL;

  // If URL is configured and not using localhost/127.0.0.1, use it as-is
  if (configuredUrl &&
      !configuredUrl.includes("localhost") &&
      !configuredUrl.includes("127.0.0.1")) {
    return configuredUrl;
  }

  // In non-production, replace localhost/127.0.0.1 with local network IP
  if (process.env.NODE_ENV !== "production") {
    const localIP = getLocalNetworkIP();
    if (localIP && configuredUrl) {
      // Replace localhost or 127.0.0.1 with the actual IP
      return configuredUrl
        .replace("localhost", localIP)
        .replace("127.0.0.1", localIP);
    }
  }

  // Fallback to configured URL or default
  return configuredUrl || "http://localhost:3001";
}

/**
 * Get all trusted origins for authentication
 * In non-production, includes localhost and all local network IPs
 */
export function getTrustedOrigins(): string[] {
  const origins: string[] = [];

  // Add configured app URL if set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Always include localhost
  origins.push("http://localhost:3000");

  // In non-production, add all local network IPs
  if (process.env.NODE_ENV !== "production") {
    const ips = getAllLocalNetworkIPs();
    for (const ip of ips) {
      origins.push(`http://${ip}:3000`);
    }
  }

  return origins;
}
