import { auth, prisma } from "@/lib/auth";
import { headers } from "next/headers";

export type UserRole = "platform_admin" | "provider_admin" | "provider_staff" | "patient";

/**
 * Authorization utility functions for checking user permissions
 * Supports both session-based (browser) and header-based (API) authentication
 */

/**
 * Get current user session from headers (for API routes)
 * Returns null if no valid session
 */
export async function getCurrentUser() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });
    return session?.user || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has access to a specific organization
 * Returns true if user is member of organization with any role
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
    return false;
  }
}

/**
 * Get user's role in an organization
 * Returns the role string (admin, provider, staff, etc.)
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
    return null;
  }
}

/**
 * Check if user has specific permission in organization
 * Looks up OrganizationRole to check permissions array
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
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Log an action to the audit log for POPIA compliance
 * Used to track all sensitive operations
 */
export async function logAuditEvent(
  action: string,
  resourceType: string,
  resourceId?: string,
  userId?: string,
  organizationId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType,
        resourceId,
        userId,
        organizationId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        // These would come from the request in actual implementation
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
  } catch (error) {
    // Log audit failures but don't throw (don't block operations on audit failure)
    console.error("Failed to log audit event:", error);
  }
}

/**
 * Get all organizations a user is member of
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
    return [];
  }
}
