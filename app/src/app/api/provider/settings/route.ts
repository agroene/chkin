/**
 * Provider Settings API
 *
 * Get and update organization settings for the authenticated provider.
 *
 * GET /api/provider/settings - Get organization details
 * PATCH /api/provider/settings - Update organization details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// String fields that providers can update (nullable)
const NULLABLE_STRING_FIELDS = [
  "phone",
  "website",
  "practiceNumber",
  "industryType",
  // Address fields
  "complexName",
  "unitNumber",
  "streetAddress",
  "suburb",
  "city",
  "province",
  "postalCode",
  "country",
] as const;

// Numeric fields (lat/lng for GPS coordinates)
const NULLABLE_FLOAT_FIELDS = ["lat", "lng"] as const;

type NullableStringField = (typeof NULLABLE_STRING_FIELDS)[number];
type NullableFloatField = (typeof NULLABLE_FLOAT_FIELDS)[number];

interface OrganizationUpdateData {
  name?: string;
  phone?: string | null;
  website?: string | null;
  practiceNumber?: string | null;
  industryType?: string | null;
  // Address fields
  complexName?: string | null;
  unitNumber?: string | null;
  streetAddress?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
}

// Fields to select for organization queries
const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  status: true,
  phone: true,
  website: true,
  practiceNumber: true,
  industryType: true,
  // Address fields
  complexName: true,
  unitNumber: true,
  streetAddress: true,
  suburb: true,
  city: true,
  province: true,
  postalCode: true,
  country: true,
  lat: true,
  lng: true,
  createdAt: true,
} as const;

// GET: Get organization details
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's organization with membership role
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        role: true,
        organization: {
          select: ORGANIZATION_SELECT,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: membership.organization,
      role: membership.role,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

// PATCH: Update organization details
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's organization with role check
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        role: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Only owners can update organization settings
    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only organization owners can update settings" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate and filter allowed fields
    const updateData: OrganizationUpdateData = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Get current values for audit log
    const currentOrg = await prisma.organization.findUnique({
      where: { id: membership.organizationId },
      select: ORGANIZATION_SELECT,
    });

    // Handle name field separately (required, non-nullable)
    if ("name" in body) {
      const value = body.name;
      if (typeof value !== "string" || value.trim().length === 0) {
        return NextResponse.json(
          { error: "Organization name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = value.trim();
      if (currentOrg && currentOrg.name !== updateData.name) {
        changes.name = { from: currentOrg.name, to: updateData.name };
      }
    }

    // Handle nullable string fields
    for (const field of NULLABLE_STRING_FIELDS) {
      if (field in body) {
        const value = body[field];
        const newValue =
          typeof value === "string" && value.trim().length > 0
            ? value.trim()
            : null;
        updateData[field] = newValue;

        // Track changes for audit
        if (currentOrg && currentOrg[field] !== newValue) {
          changes[field] = { from: currentOrg[field], to: newValue };
        }
      }
    }

    // Handle nullable float fields (lat/lng)
    for (const field of NULLABLE_FLOAT_FIELDS) {
      if (field in body) {
        const value = body[field];
        let newValue: number | null = null;

        if (typeof value === "number" && !isNaN(value)) {
          newValue = value;
        } else if (typeof value === "string" && value.trim().length > 0) {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            newValue = parsed;
          }
        }

        updateData[field] = newValue;

        // Track changes for audit
        if (currentOrg && currentOrg[field] !== newValue) {
          changes[field] = { from: currentOrg[field], to: newValue };
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id: membership.organizationId },
      data: updateData,
      select: ORGANIZATION_SELECT,
    });

    // Log audit event with changes
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: membership.organizationId,
      action: "UPDATE_ORGANIZATION",
      resourceType: "Organization",
      resourceId: membership.organizationId,
      metadata: {
        changes,
        fieldsUpdated: Object.keys(updateData),
      },
    });

    return NextResponse.json({ organization: updatedOrg });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
