/**
 * DocuSeal Integration Library
 *
 * Utilities for interacting with the self-hosted DocuSeal instance
 * for PDF form population and e-signatures.
 *
 * @module lib/docuseal
 */

import * as jose from "jose";
import crypto from "crypto";
import { getDocuSealUrl as getNetworkDocuSealUrl } from "./network";

// Internal server-to-server URL (can use localhost)
const DOCUSEAL_URL = process.env.DOCUSEAL_URL || "http://localhost:3001";
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY || "";

/**
 * Generate a JWT token for embedding DocuSeal components
 *
 * Used for both Builder (provider) and Form (patient) embeds
 */
export async function generateDocuSealToken(payload: {
  userEmail: string;
  templateId?: number;
  submissionId?: number;
  expiresIn?: string;
}): Promise<string> {
  if (!DOCUSEAL_API_KEY) {
    throw new Error("DOCUSEAL_API_KEY is not configured");
  }

  const secret = new TextEncoder().encode(DOCUSEAL_API_KEY);

  const tokenPayload: Record<string, unknown> = {
    user_email: payload.userEmail,
    integration_email: payload.userEmail,
  };

  if (payload.templateId) {
    tokenPayload.template_id = payload.templateId;
  }

  if (payload.submissionId) {
    tokenPayload.submission_id = payload.submissionId;
  }

  return await new jose.SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.expiresIn || "1h")
    .sign(secret);
}

/**
 * Get DocuSeal template details
 */
export async function getDocuSealTemplate(templateId: number): Promise<{
  id: number;
  name: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
} | null> {
  if (!DOCUSEAL_API_KEY) {
    throw new Error("DOCUSEAL_API_KEY is not configured");
  }

  const response = await fetch(`${DOCUSEAL_URL}/api/templates/${templateId}`, {
    headers: {
      "X-Auth-Token": DOCUSEAL_API_KEY,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch DocuSeal template: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get fields from a DocuSeal template for mapping UI
 */
export async function getDocuSealTemplateFields(templateId: number): Promise<
  Array<{
    name: string;
    type: string;
    required: boolean;
  }>
> {
  const template = await getDocuSealTemplate(templateId);
  return template?.fields || [];
}

/**
 * Create a DocuSeal submission with pre-filled values
 *
 * Returns the submission ID and embed URL for the patient to sign
 */
export async function createDocuSealSubmission(params: {
  templateId: number;
  email: string;
  name?: string;
  fieldValues: Record<string, string>;
  externalId?: string;
  webhookUrl?: string;
  completedRedirectUrl?: string;
}): Promise<{
  submissionId: number;
  embedUrl: string;
}> {
  if (!DOCUSEAL_API_KEY) {
    throw new Error("DOCUSEAL_API_KEY is not configured");
  }

  const response = await fetch(`${DOCUSEAL_URL}/api/submissions`, {
    method: "POST",
    headers: {
      "X-Auth-Token": DOCUSEAL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: params.templateId,
      send_email: false, // We handle our own notifications
      // Global redirect URL after signing
      ...(params.completedRedirectUrl && {
        completed_redirect_url: params.completedRedirectUrl,
      }),
      submitters: [
        {
          email: params.email,
          name: params.name,
          external_id: params.externalId,
          // Submitter-specific redirect URL (takes precedence)
          ...(params.completedRedirectUrl && {
            completed_redirect_url: params.completedRedirectUrl,
          }),
          fields: Object.entries(params.fieldValues).map(([name, value]) => ({
            name,
            default_value: value,
          })),
        },
      ],
      ...(params.webhookUrl && {
        preferences: {
          webhook_url: params.webhookUrl,
        },
      }),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create DocuSeal submission: ${errorText}`);
  }

  const data = await response.json();

  // DocuSeal returns an array of submitters
  const submitter = data[0];

  return {
    submissionId: submitter.submission_id,
    embedUrl: submitter.embed_src,
  };
}

/**
 * Get a DocuSeal submission by ID
 */
export async function getDocuSealSubmission(submissionId: number): Promise<{
  id: number;
  status: string;
  completedAt: string | null;
  documents: Array<{
    name: string;
    url: string;
  }>;
} | null> {
  if (!DOCUSEAL_API_KEY) {
    throw new Error("DOCUSEAL_API_KEY is not configured");
  }

  const response = await fetch(
    `${DOCUSEAL_URL}/api/submissions/${submissionId}`,
    {
      headers: {
        "X-Auth-Token": DOCUSEAL_API_KEY,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch DocuSeal submission: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    status: data.status,
    completedAt: data.completed_at,
    documents: data.documents || [],
  };
}

/**
 * Verify DocuSeal webhook signature
 */
export function verifyDocuSealWebhook(
  payload: string,
  signature: string
): boolean {
  const webhookSecret = process.env.DOCUSEAL_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("DOCUSEAL_WEBHOOK_SECRET is not configured, skipping verification");
    return true; // Allow in development
  }

  // DocuSeal uses HMAC-SHA256 for webhook signatures
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Map Chkin form values to DocuSeal field values based on field mappings
 */
export function mapFieldValues(
  chkinData: Record<string, unknown>,
  fieldMappings: Record<string, string>
): Record<string, string> {
  const docusealValues: Record<string, string> = {};

  for (const [chkinField, docusealField] of Object.entries(fieldMappings)) {
    const value = chkinData[chkinField];
    if (value !== undefined && value !== null) {
      // Convert to string for DocuSeal
      docusealValues[docusealField] = String(value);
    }
  }

  return docusealValues;
}

/**
 * Get the DocuSeal base URL for client-side components
 * Uses the network-aware URL that works on mobile devices
 */
export function getDocuSealBaseUrl(): string {
  return getNetworkDocuSealUrl();
}
