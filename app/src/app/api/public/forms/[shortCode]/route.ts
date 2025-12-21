/**
 * Public Form API - Form Resolution
 *
 * Resolve a QR code short code to get form data for rendering.
 * This is a PUBLIC endpoint - no authentication required.
 * If the user is authenticated, includes profile data for pre-fill.
 *
 * GET /api/public/forms/[shortCode]
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ shortCode: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { shortCode } = await params;

    // Find QR code by short code
    const qrCode = await prisma.qRCode.findUnique({
      where: { shortCode },
      include: {
        formTemplate: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
            fields: {
              include: {
                fieldDefinition: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    // QR code not found
    if (!qrCode) {
      return NextResponse.json(
        {
          error: "Invalid QR code",
          code: "QR_NOT_FOUND",
          message: "This QR code is not valid. Please scan a valid chkin QR code.",
        },
        { status: 404 }
      );
    }

    // QR code is deactivated
    if (!qrCode.isActive) {
      return NextResponse.json(
        {
          error: "QR code deactivated",
          code: "QR_INACTIVE",
          message: "This QR code has been deactivated and is no longer accepting submissions.",
        },
        { status: 410 }
      );
    }

    // Form is deactivated
    if (!qrCode.formTemplate.isActive) {
      return NextResponse.json(
        {
          error: "Form deactivated",
          code: "FORM_INACTIVE",
          message: "This form is no longer accepting submissions.",
        },
        { status: 410 }
      );
    }

    const form = qrCode.formTemplate;

    // Check if user is authenticated (optional - for pre-fill)
    let prefillData: Record<string, unknown> | null = null;
    let isAuthenticated = false;

    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session?.user) {
        isAuthenticated = true;

        // Get user's patient profile for pre-fill
        const profile = await prisma.patientProfile.findUnique({
          where: { userId: session.user.id },
        });

        if (profile?.data) {
          const profileData = JSON.parse(profile.data);

          // Extract only the fields that are in this form
          const formFieldNames = form.fields.map(
            (f) => f.fieldDefinition.name
          );
          prefillData = {};

          for (const fieldName of formFieldNames) {
            if (profileData[fieldName] !== undefined) {
              prefillData[fieldName] = profileData[fieldName];
            }
          }

          // Only include if we have at least some data
          if (Object.keys(prefillData).length === 0) {
            prefillData = null;
          }
        }
      }
    } catch {
      // Auth check failed - continue as anonymous
    }

    // Transform fields for response
    const fields = form.fields.map((field) => ({
      id: field.id,
      fieldDefinitionId: field.fieldDefinitionId,
      fieldDefinition: {
        id: field.fieldDefinition.id,
        name: field.fieldDefinition.name,
        label: field.fieldDefinition.label,
        description: field.fieldDefinition.description,
        fieldType: field.fieldDefinition.fieldType,
        config: field.fieldDefinition.config,
        category: field.fieldDefinition.category,
        specialPersonalInfo: field.fieldDefinition.specialPersonalInfo,
        requiresExplicitConsent: field.fieldDefinition.requiresExplicitConsent,
      },
      labelOverride: field.labelOverride,
      helpText: field.helpText,
      isRequired: field.isRequired,
      sortOrder: field.sortOrder,
      section: field.section,
      columnSpan: field.columnSpan,
    }));

    // Get unique sections
    const sections = [...new Set(fields.map((f) => f.section).filter(Boolean))];
    if (sections.length === 0) {
      sections.push("Default");
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        consentClause: form.consentClause,
        fields,
        sections,
        organization: {
          id: form.organization.id,
          name: form.organization.name,
          logo: form.organization.logo,
        },
      },
      isAuthenticated,
      prefillData,
    });
  } catch (error) {
    console.error("Get public form error:", error);
    return NextResponse.json(
      { error: "Failed to load form" },
      { status: 500 }
    );
  }
}
