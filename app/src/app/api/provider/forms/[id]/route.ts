/**
 * Provider Form API - Individual Form Operations
 *
 * Get, update, and delete individual form templates.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify form ownership
async function verifyFormOwnership(userId: string, formId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!membership) {
    return { error: "No organization found", status: 404 };
  }

  const form = await prisma.formTemplate.findUnique({
    where: { id: formId },
    select: { organizationId: true },
  });

  if (!form) {
    return { error: "Form not found", status: 404 };
  }

  if (form.organizationId !== membership.organizationId) {
    return { error: "Forbidden", status: 403 };
  }

  return { organizationId: membership.organizationId };
}

// GET: Get form details with fields
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Get form with all details
    const form = await prisma.formTemplate.findUnique({
      where: { id },
      include: {
        fields: {
          include: {
            fieldDefinition: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        qrCodes: {
          where: { isActive: true },
          select: {
            id: true,
            shortCode: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Get form error:", error);
    return NextResponse.json(
      { error: "Failed to get form" },
      { status: 500 }
    );
  }
}

// PATCH: Update form
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      consentClause,
      isActive,
      fields,
      // Consent duration settings
      defaultConsentDuration,
      minConsentDuration,
      maxConsentDuration,
      allowAutoRenewal,
      gracePeriodDays,
      // PDF settings
      pdfEnabled,
      docusealTemplateId,
      pdfFieldMappings,
    } = body;

    // Update form in transaction
    const form = await prisma.$transaction(async (tx) => {
      // Update form template
      const updateData: Record<string, unknown> = {};

      if (title !== undefined) {
        if (typeof title !== "string" || title.trim().length === 0) {
          throw new Error("Title cannot be empty");
        }
        updateData.title = title.trim();
      }
      if (description !== undefined) {
        updateData.description = description?.trim() || null;
      }
      if (consentClause !== undefined) {
        updateData.consentClause = consentClause?.trim() || null;
      }
      if (isActive !== undefined) {
        updateData.isActive = Boolean(isActive);
      }

      // Consent duration settings
      if (defaultConsentDuration !== undefined) {
        updateData.defaultConsentDuration = Number(defaultConsentDuration);
      }
      if (minConsentDuration !== undefined) {
        updateData.minConsentDuration = Number(minConsentDuration);
      }
      if (maxConsentDuration !== undefined) {
        updateData.maxConsentDuration = Number(maxConsentDuration);
      }
      if (allowAutoRenewal !== undefined) {
        updateData.allowAutoRenewal = Boolean(allowAutoRenewal);
      }
      if (gracePeriodDays !== undefined) {
        updateData.gracePeriodDays = Number(gracePeriodDays);
      }

      // PDF settings
      if (pdfEnabled !== undefined) {
        updateData.pdfEnabled = Boolean(pdfEnabled);
      }
      if (docusealTemplateId !== undefined) {
        updateData.docusealTemplateId = docusealTemplateId ? Number(docusealTemplateId) : null;
      }
      if (pdfFieldMappings !== undefined) {
        updateData.pdfFieldMappings = pdfFieldMappings || null;
      }

      // Increment version if structural changes
      if (fields !== undefined) {
        const current = await tx.formTemplate.findUnique({
          where: { id },
          select: { version: true },
        });
        updateData.version = (current?.version || 1) + 1;
      }

      await tx.formTemplate.update({
        where: { id },
        data: updateData,
      });

      // Update fields if provided
      if (fields !== undefined && Array.isArray(fields)) {
        // Delete existing fields
        await tx.formField.deleteMany({
          where: { formTemplateId: id },
        });

        // Create new fields
        if (fields.length > 0) {
          await tx.formField.createMany({
            data: fields.map((field: {
              fieldDefinitionId: string;
              labelOverride?: string;
              helpText?: string;
              isRequired?: boolean;
              sortOrder?: number;
              section?: string;
              columnSpan?: number;
              visibilityRules?: string;
            }, index: number) => ({
              formTemplateId: id,
              fieldDefinitionId: field.fieldDefinitionId,
              labelOverride: field.labelOverride || null,
              helpText: field.helpText || null,
              isRequired: field.isRequired ?? false,
              sortOrder: field.sortOrder ?? index,
              section: field.section || null,
              columnSpan: field.columnSpan ?? 8,
              visibilityRules: field.visibilityRules || null,
            })),
          });
        }
      }

      // Return updated form
      return tx.formTemplate.findUnique({
        where: { id },
        include: {
          fields: {
            include: {
              fieldDefinition: true,
            },
            orderBy: { sortOrder: "asc" },
          },
          _count: {
            select: {
              submissions: true,
              qrCodes: true,
            },
          },
        },
      });
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: ownership.organizationId,
      action: "UPDATE_FORM",
      resourceType: "FormTemplate",
      resourceId: id,
      metadata: { title: form?.title },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Update form error:", error);
    const message = error instanceof Error ? error.message : "Failed to update form";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE: Delete form (soft delete - deactivate)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Check for submissions - if any exist, soft delete
    const submissionCount = await prisma.submission.count({
      where: { formTemplateId: id },
    });

    if (submissionCount > 0) {
      // Soft delete - just deactivate
      await prisma.formTemplate.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete - no submissions yet
      await prisma.formTemplate.delete({
        where: { id },
      });
    }

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: ownership.organizationId,
      action: submissionCount > 0 ? "DEACTIVATE_FORM" : "DELETE_FORM",
      resourceType: "FormTemplate",
      resourceId: id,
      metadata: { hadSubmissions: submissionCount > 0 },
    });

    return NextResponse.json({
      success: true,
      deleted: submissionCount === 0,
      deactivated: submissionCount > 0,
    });
  } catch (error) {
    console.error("Delete form error:", error);
    return NextResponse.json(
      { error: "Failed to delete form" },
      { status: 500 }
    );
  }
}
