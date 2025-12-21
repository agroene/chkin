/**
 * Admin Field Definition API - Reorder Fields
 *
 * POST /api/admin/fields/reorder - Reorder fields within a category
 * Body: { category: string, fieldIds: string[] }
 *
 * Updates sortOrder for all fields in the array (0, 1, 2, 3...)
 * Only operates within a single category
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// Valid categories (same as in main fields route)
const VALID_CATEGORIES = [
  "personal",
  "identity",
  "contact",
  "address",
  "emergency",
  "responsible",
  "preferences",
  "medical",
  "insurance",
  "education",
  "employment",
  "events",
  "membership",
  "legal",
  "financial",
  "consent",
];

export async function POST(request: NextRequest) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const body = await request.json();
    const { category, fieldIds } = body;

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate fieldIds
    if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
      return NextResponse.json(
        { error: "fieldIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify all fields exist and belong to the specified category
    const fields = await prisma.fieldDefinition.findMany({
      where: {
        id: { in: fieldIds },
        category: category,
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
      },
    });

    if (fields.length !== fieldIds.length) {
      const foundIds = new Set(fields.map((f) => f.id));
      const missingIds = fieldIds.filter((id: string) => !foundIds.has(id));
      return NextResponse.json(
        {
          error: "Some fields not found or do not belong to the specified category",
          missingIds,
        },
        { status: 400 }
      );
    }

    // Build update operations - assign sortOrder based on position in array
    const updates = fieldIds.map((fieldId: string, index: number) => {
      return prisma.fieldDefinition.update({
        where: { id: fieldId },
        data: { sortOrder: index },
      });
    });

    // Execute all updates in a transaction
    await prisma.$transaction(updates);

    // Build old order map for audit log
    const oldOrderMap = Object.fromEntries(
      fields.map((f) => [f.id, f.sortOrder])
    );

    // Log audit event
    await logAuditEvent({
      userId: adminCheck.user?.id,
      action: "REORDER_FIELD_DEFINITIONS",
      resourceType: "FieldDefinition",
      resourceId: category,
      metadata: {
        category,
        fieldCount: fieldIds.length,
        oldOrder: oldOrderMap,
        newOrder: Object.fromEntries(
          fieldIds.map((id: string, index: number) => [id, index])
        ),
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully reordered ${fieldIds.length} fields in category "${category}"`,
      data: {
        category,
        fieldIds,
      },
    });
  } catch (error) {
    console.error("Reorder fields error:", error);
    return NextResponse.json(
      { error: "Failed to reorder fields" },
      { status: 500 }
    );
  }
}
