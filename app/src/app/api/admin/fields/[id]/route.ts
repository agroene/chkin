/**
 * Admin Field Definition API - Individual Field
 *
 * GET /api/admin/fields/[id] - Get field details
 * PATCH /api/admin/fields/[id] - Update field
 * DELETE /api/admin/fields/[id] - Deactivate field (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// Valid categories
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

// Valid field types
const VALID_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "date",
  "datetime",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "textarea",
  "number",
  "file",
  "signature",
  "country",
  "currency",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  const { id } = await context.params;

  try {
    const field = await prisma.fieldDefinition.findUnique({
      where: { id },
      include: {
        formFields: {
          include: {
            formTemplate: {
              select: {
                id: true,
                title: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!field) {
      return NextResponse.json(
        { error: "Field not found" },
        { status: 404 }
      );
    }

    // Transform response
    const transformedField = {
      id: field.id,
      name: field.name,
      label: field.label,
      description: field.description,
      fieldType: field.fieldType,
      category: field.category,
      config: field.config ? JSON.parse(field.config) : null,
      validation: field.validation ? JSON.parse(field.validation) : null,
      sortOrder: field.sortOrder,
      isActive: field.isActive,
      specialPersonalInfo: field.specialPersonalInfo,
      requiresExplicitConsent: field.requiresExplicitConsent,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
      createdBy: field.createdBy,
      // Usage in forms
      usageCount: field.formFields.length,
      usedInForms: field.formFields.map((ff) => ({
        formFieldId: ff.id,
        formTemplateId: ff.formTemplate.id,
        formTitle: ff.formTemplate.title,
        organizationId: ff.formTemplate.organization.id,
        organizationName: ff.formTemplate.organization.name,
        labelOverride: ff.labelOverride,
        isRequired: ff.isRequired,
      })),
    };

    return NextResponse.json({
      success: true,
      data: transformedField,
    });
  } catch (error) {
    console.error("Get field error:", error);
    return NextResponse.json(
      { error: "Failed to fetch field" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  const { id } = await context.params;

  try {
    // Find field
    const existingField = await prisma.fieldDefinition.findUnique({
      where: { id },
    });

    if (!existingField) {
      return NextResponse.json(
        { error: "Field not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Build update data - only include provided fields
    interface UpdateData {
      label?: string;
      description?: string;
      fieldType?: string;
      category?: string;
      config?: string | null;
      validation?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      specialPersonalInfo?: boolean;
      requiresExplicitConsent?: boolean;
    }

    const updateData: UpdateData = {};

    // Label - required but can be updated
    if (body.label !== undefined) {
      if (typeof body.label !== "string" || body.label.trim().length === 0) {
        return NextResponse.json(
          { error: "Label cannot be empty" },
          { status: 400 }
        );
      }
      updateData.label = body.label.trim();
    }

    // Description - required but can be updated
    if (body.description !== undefined) {
      if (typeof body.description !== "string" || body.description.trim().length === 0) {
        return NextResponse.json(
          { error: "Description cannot be empty" },
          { status: 400 }
        );
      }
      updateData.description = body.description.trim();
    }

    // Field type - validate if provided
    if (body.fieldType !== undefined) {
      if (!VALID_FIELD_TYPES.includes(body.fieldType)) {
        return NextResponse.json(
          { error: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.fieldType = body.fieldType;
    }

    // Category - validate if provided
    if (body.category !== undefined) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.category = body.category;
    }

    // Config - JSON object
    if (body.config !== undefined) {
      updateData.config = body.config ? JSON.stringify(body.config) : null;
    }

    // Validation - JSON object
    if (body.validation !== undefined) {
      updateData.validation = body.validation ? JSON.stringify(body.validation) : null;
    }

    // Sort order
    if (body.sortOrder !== undefined) {
      if (typeof body.sortOrder !== "number" || body.sortOrder < 0) {
        return NextResponse.json(
          { error: "Sort order must be a non-negative number" },
          { status: 400 }
        );
      }
      updateData.sortOrder = body.sortOrder;
    }

    // Boolean flags
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    if (body.specialPersonalInfo !== undefined) {
      updateData.specialPersonalInfo = Boolean(body.specialPersonalInfo);
    }

    if (body.requiresExplicitConsent !== undefined) {
      updateData.requiresExplicitConsent = Boolean(body.requiresExplicitConsent);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Note: We intentionally don't allow updating the 'name' field
    // as it's the canonical identifier used for data mapping

    // Update field
    const updatedField = await prisma.fieldDefinition.update({
      where: { id },
      data: updateData,
    });

    // Log audit event
    await logAuditEvent({
      userId: adminCheck.user?.id,
      action: "UPDATE_FIELD_DEFINITION",
      resourceType: "FieldDefinition",
      resourceId: id,
      metadata: {
        name: existingField.name,
        changes: Object.keys(updateData),
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedField.id,
        name: updatedField.name,
        label: updatedField.label,
        description: updatedField.description,
        fieldType: updatedField.fieldType,
        category: updatedField.category,
        config: updatedField.config ? JSON.parse(updatedField.config) : null,
        validation: updatedField.validation ? JSON.parse(updatedField.validation) : null,
        sortOrder: updatedField.sortOrder,
        isActive: updatedField.isActive,
        specialPersonalInfo: updatedField.specialPersonalInfo,
        requiresExplicitConsent: updatedField.requiresExplicitConsent,
        createdAt: updatedField.createdAt,
        updatedAt: updatedField.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update field error:", error);
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  const { id } = await context.params;

  try {
    // Find field with usage count
    const field = await prisma.fieldDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { formFields: true },
        },
      },
    });

    if (!field) {
      return NextResponse.json(
        { error: "Field not found" },
        { status: 404 }
      );
    }

    // If field is used in forms, only deactivate it (soft delete)
    // If not used, we could hard delete, but for consistency we just deactivate
    if (field._count.formFields > 0) {
      // Soft delete - deactivate
      await prisma.fieldDefinition.update({
        where: { id },
        data: { isActive: false },
      });

      // Log audit event
      await logAuditEvent({
        userId: adminCheck.user?.id,
        action: "DEACTIVATE_FIELD_DEFINITION",
        resourceType: "FieldDefinition",
        resourceId: id,
        metadata: {
          name: field.name,
          reason: "Field is used in forms, soft deleted",
          formUsageCount: field._count.formFields,
        },
        request,
      });

      return NextResponse.json({
        success: true,
        message: `Field "${field.name}" has been deactivated. It is used in ${field._count.formFields} form(s) and cannot be permanently deleted.`,
        data: {
          id: field.id,
          name: field.name,
          isActive: false,
        },
      });
    }

    // If not used, deactivate (we don't hard delete to preserve history)
    await prisma.fieldDefinition.update({
      where: { id },
      data: { isActive: false },
    });

    // Log audit event
    await logAuditEvent({
      userId: adminCheck.user?.id,
      action: "DEACTIVATE_FIELD_DEFINITION",
      resourceType: "FieldDefinition",
      resourceId: id,
      metadata: {
        name: field.name,
        reason: "Admin request",
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: `Field "${field.name}" has been deactivated.`,
      data: {
        id: field.id,
        name: field.name,
        isActive: false,
      },
    });
  } catch (error) {
    console.error("Delete field error:", error);
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 }
    );
  }
}
