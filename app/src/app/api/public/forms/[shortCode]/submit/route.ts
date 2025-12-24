/**
 * Public Form API - Form Submission
 *
 * Submit a form accessed via QR code.
 * Handles both anonymous and authenticated submissions.
 *
 * POST /api/public/forms/[shortCode]/submit
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { logAuditEvent } from "@/lib/audit-log";
import { calculateConsentExpiry } from "@/lib/consent-status";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ shortCode: string }>;
}

interface SubmissionBody {
  data: Record<string, unknown>;
  consentGiven: boolean;
  consentDurationMonths?: number; // Optional: patient-selected duration
  autoRenew?: boolean; // Optional: patient preference for auto-renewal
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { shortCode } = await params;
    const body: SubmissionBody = await request.json();

    // Validate request body
    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json(
        { error: "Form data is required" },
        { status: 400 }
      );
    }

    // Find QR code and validate
    const qrCode = await prisma.qRCode.findUnique({
      where: { shortCode },
      include: {
        formTemplate: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
            fields: {
              include: { fieldDefinition: true },
            },
          },
        },
      },
    });

    if (!qrCode) {
      return NextResponse.json(
        { error: "Invalid QR code", code: "QR_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!qrCode.isActive) {
      return NextResponse.json(
        { error: "QR code deactivated", code: "QR_INACTIVE" },
        { status: 410 }
      );
    }

    if (!qrCode.formTemplate.isActive) {
      return NextResponse.json(
        { error: "Form deactivated", code: "FORM_INACTIVE" },
        { status: 410 }
      );
    }

    const form = qrCode.formTemplate;

    // Validate required fields
    const requiredFields = form.fields.filter((f) => f.isRequired);
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = body.data[field.fieldDefinition.name];
      if (value === undefined || value === null || value === "") {
        missingFields.push(field.labelOverride || field.fieldDefinition.label);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          code: "VALIDATION_ERROR",
          missingFields,
        },
        { status: 400 }
      );
    }

    // Check if user is authenticated
    let userId: string | null = null;
    let isAuthenticated = false;
    let profileDiff: Array<{
      fieldName: string;
      fieldLabel: string;
      currentValue: unknown;
      submittedValue: unknown;
    }> | null = null;

    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session?.user) {
        userId = session.user.id;
        isAuthenticated = true;

        // Get user's profile to check for differences
        const profile = await prisma.patientProfile.findUnique({
          where: { userId: session.user.id },
        });

        if (profile?.data) {
          const profileData = JSON.parse(profile.data);
          profileDiff = [];

          // Compare submitted data with profile data
          for (const field of form.fields) {
            const fieldName = field.fieldDefinition.name;
            const submittedValue = body.data[fieldName];
            const currentValue = profileData[fieldName];

            // Only flag as different if both have values and they differ
            if (
              submittedValue !== undefined &&
              submittedValue !== "" &&
              currentValue !== undefined &&
              currentValue !== "" &&
              submittedValue !== currentValue
            ) {
              profileDiff.push({
                fieldName,
                fieldLabel: field.labelOverride || field.fieldDefinition.label,
                currentValue,
                submittedValue,
              });
            }
          }

          // Only include if there are actual differences
          if (profileDiff.length === 0) {
            profileDiff = null;
          }
        }
      }
    } catch {
      // Auth check failed - continue as anonymous
    }

    // Generate anonymous token for unauthenticated users
    const anonymousToken = !isAuthenticated ? nanoid(32) : null;

    // Get client info
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      null;
    const userAgent = headersList.get("user-agent") || null;

    // Calculate consent expiry date if consent is given
    const consentAt = body.consentGiven ? new Date() : null;

    // Determine consent duration: use patient-selected, or fall back to form default
    let consentDuration = form.defaultConsentDuration;
    if (body.consentGiven && body.consentDurationMonths !== undefined) {
      // Validate the duration is within allowed range
      if (
        body.consentDurationMonths < form.minConsentDuration ||
        body.consentDurationMonths > form.maxConsentDuration
      ) {
        return NextResponse.json(
          {
            error: `Consent duration must be between ${form.minConsentDuration} and ${form.maxConsentDuration} months`,
            code: "INVALID_CONSENT_DURATION",
          },
          { status: 400 }
        );
      }
      consentDuration = body.consentDurationMonths;
    }

    const consentExpiresAt = consentAt
      ? calculateConsentExpiry(consentAt, consentDuration)
      : null;

    // Determine auto-renewal preference: use patient choice if allowed, otherwise form default
    const autoRenew = form.allowAutoRenewal
      ? (body.autoRenew ?? form.allowAutoRenewal)
      : false;

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        formTemplateId: form.id,
        organizationId: form.organization.id,
        userId,
        data: JSON.stringify(body.data),
        consentGiven: Boolean(body.consentGiven),
        consentAt,
        consentToken: body.consentGiven ? nanoid(32) : null,
        consentExpiresAt,
        consentDurationMonths: body.consentGiven ? consentDuration : null,
        autoRenew,
        status: "completed",
        source: "web",
        ipAddress,
        userAgent,
        anonymousToken,
      },
    });

    // Log audit event
    await logAuditEvent({
      request,
      userId: userId || undefined,
      organizationId: form.organization.id,
      action: "SUBMIT_FORM",
      resourceType: "Submission",
      resourceId: submission.id,
      metadata: {
        formTemplateId: form.id,
        formTitle: form.title,
        isAuthenticated,
        consentGiven: body.consentGiven,
        consentDurationMonths: body.consentGiven ? consentDuration : null,
        consentExpiresAt: consentExpiresAt?.toISOString() || null,
        autoRenew: body.consentGiven ? autoRenew : null,
      },
    });

    // Build response based on authentication status
    if (isAuthenticated) {
      return NextResponse.json({
        success: true,
        submission: {
          id: submission.id,
          createdAt: submission.createdAt,
        },
        profileDiff,
        promptProfileUpdate: profileDiff !== null && profileDiff.length > 0,
      });
    } else {
      return NextResponse.json({
        success: true,
        submission: {
          id: submission.id,
          createdAt: submission.createdAt,
        },
        anonymousToken,
        promptRegistration: true,
      });
    }
  } catch (error) {
    console.error("Submit form error:", error);
    // Log more details in development
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    return NextResponse.json(
      { error: "Failed to submit form", details: process.env.NODE_ENV === "development" ? String(error) : undefined },
      { status: 500 }
    );
  }
}
