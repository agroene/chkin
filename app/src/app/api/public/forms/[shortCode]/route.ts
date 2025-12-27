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
import { getAllSavedDoctors, getAutopopulateData, type SavedReferralDoctor } from "@/lib/referral-doctors";

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

    // Increment scan count (fire and forget - don't block response)
    prisma.qRCode
      .update({
        where: { shortCode },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      })
      .catch((err) => {
        console.error("Failed to update scan count:", err);
      });

    const form = qrCode.formTemplate;

    // Check if user is authenticated (optional - for pre-fill)
    let prefillData: Record<string, unknown> | null = null;
    let isAuthenticated = false;
    let savedReferralDoctors: SavedReferralDoctor[] = [];

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

          // Get saved referral doctors for autopopulation
          // This includes doctors from both _savedReferralDoctors array AND individual profile fields
          savedReferralDoctors = getAllSavedDoctors(profileData);

          // Check if form has a referral-doctor field and autopopulate from saved doctors
          const hasReferralDoctorField = form.fields.some(
            (f) => f.fieldDefinition.fieldType === "referral-doctor"
          );
          if (hasReferralDoctorField && savedReferralDoctors.length > 0) {
            // Add primary doctor's fields to prefill if not already set
            const doctorAutofill = getAutopopulateData(savedReferralDoctors);
            for (const [key, value] of Object.entries(doctorAutofill)) {
              if (prefillData[key] === undefined) {
                prefillData[key] = value;
              }
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

    // Use saved section ordering from form template, fallback to extracting from fields
    let sections: string[];
    if (form.sections && form.sections.length > 0) {
      // Use the saved section order
      sections = form.sections;
    } else {
      // Fallback: extract unique sections from fields (legacy forms without saved sections)
      sections = [...new Set(fields.map((f) => f.section).filter(Boolean))] as string[];
      if (sections.length === 0) {
        sections.push("Default");
      }
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        consentClause: form.consentClause,
        // Time-bound consent configuration
        consentConfig: {
          defaultDuration: form.defaultConsentDuration,
          minDuration: form.minConsentDuration,
          maxDuration: form.maxConsentDuration,
          allowAutoRenewal: form.allowAutoRenewal,
          gracePeriodDays: form.gracePeriodDays,
        },
        // PDF signing configuration
        pdfEnabled: form.pdfEnabled,
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
      // Saved referral doctors for selection (only for authenticated users)
      savedReferralDoctors: isAuthenticated ? savedReferralDoctors : [],
    });
  } catch (error) {
    console.error("Get public form error:", error);
    return NextResponse.json(
      { error: "Failed to load form" },
      { status: 500 }
    );
  }
}
