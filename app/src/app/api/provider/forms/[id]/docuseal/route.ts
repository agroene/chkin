/**
 * DocuSeal Configuration API for Forms
 *
 * PUT /api/provider/forms/[id]/docuseal
 * Updates the DocuSeal PDF configuration for a form template.
 *
 * GET /api/provider/forms/[id]/docuseal
 * Gets the current DocuSeal configuration for a form.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";
import { getDocuSealTemplateFields } from "@/lib/docuseal";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify form ownership
async function verifyFormOwnership(userId: string, formId: string) {
  const membership = await prisma.member.findFirst({
    where: { userId },
    include: {
      organization: {
        select: { id: true, status: true },
      },
    },
  });

  if (!membership) {
    return { error: "No organization found", status: 404 };
  }

  if (membership.organization.status !== "approved") {
    return { error: "Organization must be approved", status: 403 };
  }

  const form = await prisma.formTemplate.findUnique({
    where: { id: formId },
    select: { organizationId: true },
  });

  if (!form) {
    return { error: "Form not found", status: 404 };
  }

  if (form.organizationId !== membership.organization.id) {
    return { error: "Forbidden", status: 403 };
  }

  return { organizationId: membership.organization.id };
}

// GET: Get DocuSeal configuration for a form
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Get form with DocuSeal config
    const form = await prisma.formTemplate.findUnique({
      where: { id },
      select: {
        id: true,
        pdfEnabled: true,
        docusealTemplateId: true,
        pdfFieldMappings: true,
        fields: {
          select: {
            fieldDefinition: {
              select: {
                name: true,
                label: true,
              },
            },
            labelOverride: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Parse field mappings
    let fieldMappings: Record<string, string> = {};
    if (form.pdfFieldMappings) {
      try {
        fieldMappings = JSON.parse(form.pdfFieldMappings);
      } catch {
        fieldMappings = {};
      }
    }

    // Get DocuSeal template fields if template exists
    let docusealFields: Array<{ name: string; type: string; required: boolean }> = [];
    if (form.docusealTemplateId) {
      try {
        docusealFields = await getDocuSealTemplateFields(form.docusealTemplateId);
      } catch (error) {
        console.error("Failed to fetch DocuSeal template fields:", error);
      }
    }

    // Build list of Chkin fields available for mapping
    const chkinFields = form.fields.map((f) => ({
      name: f.fieldDefinition.name,
      label: f.labelOverride || f.fieldDefinition.label,
    }));

    return NextResponse.json({
      pdfEnabled: form.pdfEnabled,
      docusealTemplateId: form.docusealTemplateId,
      fieldMappings,
      chkinFields,
      docusealFields,
    });
  } catch (error) {
    console.error("Get DocuSeal config error:", error);
    return NextResponse.json(
      { error: "Failed to get DocuSeal configuration" },
      { status: 500 }
    );
  }
}

// PUT: Update DocuSeal configuration for a form
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership = await verifyFormOwnership(session.user.id, id);
    if ("error" in ownership) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const body = await request.json();
    const { pdfEnabled, docusealTemplateId, fieldMappings } = body;

    // Validate inputs
    if (pdfEnabled !== undefined && typeof pdfEnabled !== "boolean") {
      return NextResponse.json(
        { error: "pdfEnabled must be a boolean" },
        { status: 400 }
      );
    }

    if (docusealTemplateId !== undefined && docusealTemplateId !== null) {
      if (typeof docusealTemplateId !== "number" || docusealTemplateId <= 0) {
        return NextResponse.json(
          { error: "docusealTemplateId must be a positive number" },
          { status: 400 }
        );
      }
    }

    if (fieldMappings !== undefined && fieldMappings !== null) {
      if (typeof fieldMappings !== "object" || Array.isArray(fieldMappings)) {
        return NextResponse.json(
          { error: "fieldMappings must be an object" },
          { status: 400 }
        );
      }
    }

    // Update form
    const updateData: Record<string, unknown> = {};

    if (pdfEnabled !== undefined) {
      updateData.pdfEnabled = pdfEnabled;
    }

    if (docusealTemplateId !== undefined) {
      updateData.docusealTemplateId = docusealTemplateId;
    }

    if (fieldMappings !== undefined) {
      updateData.pdfFieldMappings = fieldMappings
        ? JSON.stringify(fieldMappings)
        : null;
    }

    const form = await prisma.formTemplate.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        pdfEnabled: true,
        docusealTemplateId: true,
        pdfFieldMappings: true,
      },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: session.user.id,
      organizationId: ownership.organizationId,
      action: "UPDATE_DOCUSEAL_CONFIG",
      resourceType: "FormTemplate",
      resourceId: id,
      metadata: {
        pdfEnabled: form.pdfEnabled,
        docusealTemplateId: form.docusealTemplateId,
      },
    });

    // Parse field mappings for response
    let parsedMappings: Record<string, string> = {};
    if (form.pdfFieldMappings) {
      try {
        parsedMappings = JSON.parse(form.pdfFieldMappings);
      } catch {
        parsedMappings = {};
      }
    }

    return NextResponse.json({
      success: true,
      pdfEnabled: form.pdfEnabled,
      docusealTemplateId: form.docusealTemplateId,
      fieldMappings: parsedMappings,
    });
  } catch (error) {
    console.error("Update DocuSeal config error:", error);
    return NextResponse.json(
      { error: "Failed to update DocuSeal configuration" },
      { status: 500 }
    );
  }
}
