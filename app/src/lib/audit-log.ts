/**
 * Audit Log Helper
 *
 * Provides a consistent interface for logging audit events.
 * All sensitive data access and modifications should be logged.
 *
 * @module lib/audit-log
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

interface LogAuditEventParams {
  userId?: string;
  organizationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: NextRequest;
}

/**
 * Log an audit event to the database.
 *
 * @param params - Audit event parameters
 * @param params.userId - ID of the user performing the action
 * @param params.organizationId - ID of the organization context (if applicable)
 * @param params.action - Action being performed (e.g., "CREATE_FIELD_DEFINITION")
 * @param params.resourceType - Type of resource being accessed (e.g., "FieldDefinition")
 * @param params.resourceId - ID of the specific resource
 * @param params.metadata - Additional context about the action
 * @param params.request - NextRequest object for extracting IP and user agent
 */
export async function logAuditEvent({
  userId,
  organizationId,
  action,
  resourceType,
  resourceId,
  metadata,
  request,
}: LogAuditEventParams): Promise<void> {
  try {
    // Extract request info
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      // Get IP address from various headers
      ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        undefined;

      userAgent = request.headers.get("user-agent") || undefined;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        organizationId,
        action,
        resourceType,
        resourceId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break main operations
    console.error("Failed to log audit event:", error);
  }
}

// Common action types for consistency
export const AuditActions = {
  // Field definitions
  CREATE_FIELD_DEFINITION: "CREATE_FIELD_DEFINITION",
  UPDATE_FIELD_DEFINITION: "UPDATE_FIELD_DEFINITION",
  DEACTIVATE_FIELD_DEFINITION: "DEACTIVATE_FIELD_DEFINITION",

  // Provider management
  APPROVE_PROVIDER: "APPROVE_PROVIDER",
  REJECT_PROVIDER: "REJECT_PROVIDER",

  // User management
  UPDATE_USER: "UPDATE_USER",
  REVOKE_SESSIONS: "REVOKE_SESSIONS",

  // Data access
  VIEW_PATIENT_DATA: "VIEW_PATIENT_DATA",
  EXPORT_DATA: "EXPORT_DATA",

  // Consent
  GRANT_CONSENT: "GRANT_CONSENT",
  REVOKE_CONSENT: "REVOKE_CONSENT",
} as const;
