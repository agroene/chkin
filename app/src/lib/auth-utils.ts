/**
 * Authorization Utilities
 *
 * Helper functions for checking user permissions and logging audit events.
 * Used across API routes and server components.
 *
 * @module lib/auth-utils
 */

import { auth } from "./auth";
import { prisma } from "./db";
import { headers } from "next/headers";

/**
 * Standard user roles in the system.
 * Maps to Member.role in the database.
 */
export type UserRole = "platform_admin" | "provider_admin" | "provider_staff" | "patient";

/**
 * Get current user session from headers (for API routes and server components).
 * Returns null if no valid session exists.
 *
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session?.user || null;
  } catch {
    // Session retrieval can fail during SSR or with invalid cookies
    return null;
  }
}

/**
 * Check if user has access to a specific organization.
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns True if user is a member of the organization
 */
export async function hasOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const member = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
    return !!member;
  } catch {
    // Database errors should not grant access
    return false;
  }
}

/**
 * Get user's role in an organization.
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @returns The role string or null if not a member
 */
export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string
): Promise<string | null> {
  try {
    const member = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
    return member?.role || null;
  } catch {
    // Database errors should return null (no role)
    return null;
  }
}

/**
 * Check if user has a specific permission in an organization.
 * Looks up the OrganizationRole to check the permissions array.
 *
 * @param userId - The user's ID
 * @param organizationId - The organization's ID
 * @param permission - The permission string to check
 * @returns True if the user has the permission
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: string
): Promise<boolean> {
  try {
    const member = await prisma.member.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!member) return false;

    const orgRole = await prisma.organizationRole.findUnique({
      where: {
        organizationId_role: {
          organizationId,
          role: member.role,
        },
      },
    });

    if (!orgRole) return false;

    try {
      const permissions = JSON.parse(orgRole.permissions);
      return Array.isArray(permissions) && permissions.includes(permission);
    } catch {
      // Malformed permissions JSON should deny access
      return false;
    }
  } catch {
    // Database errors should not grant permissions
    return false;
  }
}

/**
 * Audit event parameters for logging.
 */
interface AuditEventParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an action to the audit log for POPIA compliance.
 * Failures are logged but do not block the calling operation.
 *
 * @param params - The audit event parameters
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void>;
/**
 * @deprecated Use object parameter form instead
 */
export async function logAuditEvent(
  action: string,
  resourceType: string,
  resourceId?: string,
  userId?: string,
  organizationId?: string,
  metadata?: Record<string, unknown>
): Promise<void>;
export async function logAuditEvent(
  actionOrParams: string | AuditEventParams,
  resourceType?: string,
  resourceId?: string,
  userId?: string,
  organizationId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Normalize parameters to object form
  const params: AuditEventParams =
    typeof actionOrParams === "string"
      ? {
          action: actionOrParams,
          resourceType: resourceType!,
          resourceId,
          userId,
          organizationId,
          metadata,
        }
      : actionOrParams;

  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: params.userId,
        organizationId: params.organizationId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Audit failures must not block operations, but should be logged
    // TODO: Replace with structured logging when available
    console.error("[AUDIT] Failed to log event:", {
      action: params.action,
      resourceType: params.resourceType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get all organizations a user is a member of.
 *
 * @param userId - The user's ID
 * @returns Array of organizations with user's role in each
 */
export async function getUserOrganizations(userId: string) {
  try {
    const members = await prisma.member.findMany({
      where: { userId },
      include: { organization: true },
    });
    return members.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    }));
  } catch {
    // Return empty array on database errors
    return [];
  }
}
