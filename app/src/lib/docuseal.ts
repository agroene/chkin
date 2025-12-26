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
import { parsePhoneNumber } from "libphonenumber-js";
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

  console.log(`[DocuSeal API] Fetching submission ${submissionId} from ${DOCUSEAL_URL}/api/submissions/${submissionId}`);

  const response = await fetch(
    `${DOCUSEAL_URL}/api/submissions/${submissionId}`,
    {
      headers: {
        "X-Auth-Token": DOCUSEAL_API_KEY,
      },
    }
  );

  console.log(`[DocuSeal API] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    if (response.status === 404) {
      console.log(`[DocuSeal API] Submission ${submissionId} not found`);
      return null;
    }
    const errorText = await response.text();
    console.error(`[DocuSeal API] Error response:`, errorText);
    throw new Error(`Failed to fetch DocuSeal submission: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[DocuSeal API] Raw response:`, JSON.stringify(data, null, 2));

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
 * Field mapping types for complex mappings
 */
type MappingType = "simple" | "concatenate" | "conditional";

interface FieldMapping {
  type: MappingType;
  sourceFields: string[];
  separator?: string;
  conditions?: {
    value: string;
    result: string;
  }[];
}

/**
 * Check if a mapping is in the new format (object with type) vs legacy format (string)
 */
function isNewFormatMapping(
  mapping: string | FieldMapping
): mapping is FieldMapping {
  return typeof mapping === "object" && "type" in mapping;
}

/**
 * Field definition for resolving select values to labels
 */
export interface FieldDefinitionForMapping {
  name: string;
  fieldType: string;
  config?: {
    options?: Array<{ value: string; label: string }>;
  } | null;
}

/**
 * Resolve a select field value to its display label
 */
function resolveSelectLabel(
  fieldName: string,
  value: unknown,
  fieldDefinitions?: FieldDefinitionForMapping[]
): string {
  if (value === undefined || value === null) return "";

  const strValue = String(value);

  if (!fieldDefinitions) return strValue;

  // Find the field definition
  const fieldDef = fieldDefinitions.find(f => f.name === fieldName);
  if (!fieldDef || fieldDef.fieldType !== "select") return strValue;

  // Get options from config
  const options = fieldDef.config?.options;
  if (!options || !Array.isArray(options)) return strValue;

  // Find the matching option and return its label
  const option = options.find(opt => opt.value === strValue);
  return option?.label || strValue;
}

/**
 * Map Chkin form values to DocuSeal field values based on field mappings
 *
 * Supports three mapping formats:
 * 1. Legacy: Record<chkinField, docusealField> (old format, still supported)
 * 2. New simple: { type: "simple", sourceFields: [chkinField] }
 * 3. New concatenate: { type: "concatenate", sourceFields: [...], separator: " " }
 * 4. New conditional: { type: "conditional", sourceFields: [field], conditions: [...] }
 *
 * New format uses docusealField as the key, mapping TO chkin fields.
 *
 * @param chkinData - The form submission data
 * @param fieldMappings - Mapping configuration
 * @param fieldDefinitions - Optional field definitions for resolving select labels
 */
export function mapFieldValues(
  chkinData: Record<string, unknown>,
  fieldMappings: Record<string, string | FieldMapping>,
  fieldDefinitions?: FieldDefinitionForMapping[]
): Record<string, string> {
  const docusealValues: Record<string, string> = {};

  for (const [key, mapping] of Object.entries(fieldMappings)) {
    if (isNewFormatMapping(mapping)) {
      // New format: key is docusealField, mapping defines how to get value from chkin
      const docusealField = key;
      const value = processMapping(chkinData, mapping, fieldDefinitions);
      if (value !== null) {
        docusealValues[docusealField] = value;
      }
    } else {
      // Legacy format: key is chkinField, value is docusealField
      const chkinField = key;
      const docusealField = mapping;
      const value = chkinData[chkinField];
      if (value !== undefined && value !== null) {
        // First resolve select labels
        let result = resolveSelectLabel(chkinField, value, fieldDefinitions);
        // Then format phone numbers for better PDF display
        if (isPhoneField(chkinField)) {
          result = formatPhoneForPdf(result);
        }
        docusealValues[docusealField] = result;
      }
    }
  }

  return docusealValues;
}

/**
 * Format a phone number from E.164 format to display format
 * Input: +27845050046
 * Output: +27 (84) 505 0046
 */
function formatPhoneForPdf(value: string): string {
  if (!value || typeof value !== "string") return value;

  // Check if it looks like an E.164 phone number
  if (!value.startsWith("+")) return value;

  try {
    const parsed = parsePhoneNumber(value);
    if (parsed && parsed.isValid()) {
      // Format with country code and national number with spaces
      // parsePhoneNumber gives us formatInternational which produces "+27 84 505 0046"
      // We want "+27 (84) 505 0046" - add parentheses around area code
      const international = parsed.formatInternational();

      // International format is like "+27 84 505 0046"
      // We want to add parentheses: "+27 (84) 505 0046"
      // Find the country code and first number group
      const countryCode = "+" + parsed.countryCallingCode;
      const nationalPart = international.replace(countryCode, "").trim();

      // Split national part into groups
      const groups = nationalPart.split(" ");
      if (groups.length >= 2) {
        // Put parentheses around first group (area code)
        return `${countryCode} (${groups[0]}) ${groups.slice(1).join(" ")}`;
      }

      // Fallback to standard international format
      return international;
    }
  } catch {
    // If parsing fails, return original value
  }

  return value;
}

/**
 * Check if a field name suggests it's a phone number field
 */
function isPhoneField(fieldName: string): boolean {
  const phonePat = /phone|mobile|cell|tel|fax/i;
  return phonePat.test(fieldName);
}

/**
 * Process a single field mapping and return the resulting value
 */
function processMapping(
  chkinData: Record<string, unknown>,
  mapping: FieldMapping,
  fieldDefinitions?: FieldDefinitionForMapping[]
): string | null {
  switch (mapping.type) {
    case "simple": {
      // Simple: direct one-to-one mapping
      const fieldName = mapping.sourceFields[0];
      if (!fieldName) return null;

      const value = chkinData[fieldName];
      if (value === undefined || value === null) return null;

      // First resolve select labels
      let result = resolveSelectLabel(fieldName, value, fieldDefinitions);

      // Format phone numbers for better PDF display
      if (isPhoneField(fieldName)) {
        result = formatPhoneForPdf(result);
      }

      return result;
    }

    case "concatenate": {
      // Concatenate: combine multiple fields with separator
      const values: string[] = [];

      for (const fieldName of mapping.sourceFields) {
        const value = chkinData[fieldName];
        if (value !== undefined && value !== null && String(value).trim()) {
          // First resolve select labels
          let strValue = resolveSelectLabel(fieldName, value, fieldDefinitions);
          // Format phone numbers for better PDF display
          if (isPhoneField(fieldName)) {
            strValue = formatPhoneForPdf(strValue);
          }
          values.push(strValue);
        }
      }

      if (values.length === 0) return null;

      return values.join(mapping.separator || " ");
    }

    case "conditional": {
      // Conditional: check field value and return appropriate result
      const fieldName = mapping.sourceFields[0];
      if (!fieldName) return null;

      const value = chkinData[fieldName];
      const valueStr = value === undefined || value === null ? "" : String(value);

      // Check each condition
      for (const condition of mapping.conditions || []) {
        // Handle boolean comparisons
        if (condition.value === "true" && (value === true || valueStr === "true")) {
          return condition.result;
        }
        if (condition.value === "false" && (value === false || valueStr === "false" || valueStr === "")) {
          return condition.result;
        }
        // Exact string match
        if (valueStr === condition.value) {
          return condition.result;
        }
      }

      // No condition matched, return null (field won't be set)
      return null;
    }

    default:
      return null;
  }
}

/**
 * Get the DocuSeal base URL for client-side components
 * Uses the network-aware URL that works on mobile devices
 */
export function getDocuSealBaseUrl(): string {
  return getNetworkDocuSealUrl();
}
