/**
 * Provider Forms API
 *
 * List and create form templates for the authenticated provider's organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// GET: List forms for the organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find user's organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const organizationId = membership.organizationId;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get("status"); // "active", "inactive", or null for all
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId,
    };

    if (status === "active") {
      where.isActive = true;
    } else if (status === "inactive") {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get forms with counts
    const [forms, total] = await Promise.all([
      prisma.formTemplate.findMany({
        where,
        include: {
          _count: {
            select: {
              fields: true,
              submissions: true,
              qrCodes: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.formTemplate.count({ where }),
    ]);

    return NextResponse.json({
      forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List forms error:", error);
    return NextResponse.json(
      { error: "Failed to list forms" },
      { status: 500 }
    );
  }
}

// POST: Create a new form
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find user's organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, description, consentClause, fields } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create form with fields in a transaction
    const form = await prisma.$transaction(async (tx) => {
      // Create the form template
      const newForm = await tx.formTemplate.create({
        data: {
          organizationId: membership.organizationId,
          title: title.trim(),
          description: description?.trim() || null,
          consentClause: consentClause?.trim() || null,
          createdBy: session.user.id,
        },
      });

      // Add fields if provided
      if (fields && Array.isArray(fields) && fields.length > 0) {
        await tx.formField.createMany({
          data: fields.map((field: {
            fieldDefinitionId: string;
            labelOverride?: string;
            helpText?: string;
            isRequired?: boolean;
            sortOrder?: number;
            section?: string;
            visibilityRules?: string;
          }, index: number) => ({
            formTemplateId: newForm.id,
            fieldDefinitionId: field.fieldDefinitionId,
            labelOverride: field.labelOverride || null,
            helpText: field.helpText || null,
            isRequired: field.isRequired ?? false,
            sortOrder: field.sortOrder ?? index,
            section: field.section || null,
            visibilityRules: field.visibilityRules || null,
          })),
        });
      }

      // Return form with field count
      return tx.formTemplate.findUnique({
        where: { id: newForm.id },
        include: {
          _count: {
            select: {
              fields: true,
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
      organizationId: membership.organizationId,
      action: "CREATE_FORM",
      resourceType: "FormTemplate",
      resourceId: form?.id,
      metadata: { title },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error("Create form error:", error);
    return NextResponse.json(
      { error: "Failed to create form" },
      { status: 500 }
    );
  }
}
