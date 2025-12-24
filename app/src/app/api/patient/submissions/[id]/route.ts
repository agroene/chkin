/**
 * Patient Submission Detail API
 *
 * Returns full details of a specific submission including all data.
 * Also supports consent withdrawal.
 *
 * GET /api/patient/submissions/[id] - Get submission details
 * POST /api/patient/submissions/[id] - Withdraw consent
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { logAuditEvent } from "@/lib/audit-log";
import { calculateConsentStatus, getConsentStatusBadge, calculateRenewalExpiry, createRenewalEntry, type RenewalHistoryEntry } from "@/lib/consent-status";
import { sendConsentRenewedEmail, sendConsentWithdrawnEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get submission details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Get submission with full details
    const submission = await prisma.submission.findFirst({
      where: {
        id,
        userId: session.user.id, // Ensure user owns this submission
      },
      include: {
        formTemplate: {
          select: {
            id: true,
            title: true,
            description: true,
            consentClause: true,
            defaultConsentDuration: true,
            gracePeriodDays: true,
            allowAutoRenewal: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                industryType: true,
                phone: true,
                streetAddress: true,
                city: true,
                province: true,
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

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Parse the submission data
    const submissionData = JSON.parse(submission.data);

    // Build field list with values, organized by section
    const fields: Array<{
      name: string;
      label: string;
      value: unknown;
      fieldType: string;
      section: string | null;
      specialPersonalInfo: boolean;
    }> = [];

    for (const formField of submission.formTemplate.fields) {
      const fieldDef = formField.fieldDefinition;
      const value = submissionData[fieldDef.name];

      fields.push({
        name: fieldDef.name,
        label: formField.labelOverride || fieldDef.label,
        value: value ?? null,
        fieldType: fieldDef.fieldType,
        section: formField.section,
        specialPersonalInfo: fieldDef.specialPersonalInfo,
      });
    }

    // Log audit event for viewing submission
    await logAuditEvent({
      request,
      userId: session.user.id,
      action: "VIEW_OWN_SUBMISSION",
      resourceType: "Submission",
      resourceId: submission.id,
      metadata: {
        formTitle: submission.formTemplate.title,
        organizationId: submission.organizationId,
      },
    });

    // Calculate consent status
    const consentStatusResult = calculateConsentStatus({
      consentGiven: submission.consentGiven,
      consentAt: submission.consentAt,
      consentExpiresAt: submission.consentExpiresAt,
      consentWithdrawnAt: submission.consentWithdrawnAt,
      gracePeriodDays: submission.formTemplate.gracePeriodDays,
    });

    const statusBadge = getConsentStatusBadge(consentStatusResult.status);

    return NextResponse.json({
      id: submission.id,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      status: submission.status,
      // Consent info - enhanced with time-bound status
      consent: {
        given: submission.consentGiven,
        givenAt: submission.consentAt,
        token: submission.consentToken,
        clause: submission.formTemplate.consentClause,
        withdrawnAt: submission.consentWithdrawnAt,
        withdrawalReason: submission.withdrawalReason,
        // Time-bound consent fields
        expiresAt: submission.consentExpiresAt,
        durationMonths: submission.consentDurationMonths,
        autoRenew: submission.autoRenew,
        renewedAt: submission.renewedAt,
        renewalCount: submission.renewalCount,
        // Computed status
        status: consentStatusResult.status,
        statusLabel: statusBadge.label,
        statusColor: statusBadge.color,
        isAccessible: consentStatusResult.isAccessible,
        daysRemaining: consentStatusResult.daysRemaining,
        gracePeriodEndsAt: consentStatusResult.gracePeriodEndsAt,
        canRenew: consentStatusResult.canRenew,
        renewalUrgency: consentStatusResult.renewalUrgency,
        message: consentStatusResult.message,
        // Legacy isActive for backwards compatibility
        isActive: consentStatusResult.isAccessible && consentStatusResult.status !== "WITHDRAWN",
      },
      // Form info
      form: {
        id: submission.formTemplate.id,
        title: submission.formTemplate.title,
        description: submission.formTemplate.description,
        defaultConsentDuration: submission.formTemplate.defaultConsentDuration,
        gracePeriodDays: submission.formTemplate.gracePeriodDays,
        allowAutoRenewal: submission.formTemplate.allowAutoRenewal,
      },
      // Organization info
      organization: submission.formTemplate.organization,
      // All submitted fields with values
      fields,
      // Raw field count
      fieldCount: fields.length,
    });
  } catch (error) {
    console.error("Get submission detail error:", error);
    return NextResponse.json(
      { error: "Failed to get submission" },
      { status: 500 }
    );
  }
}

// POST - Withdraw consent or renew consent
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action, reason, durationMonths } = body;

    if (action !== "withdraw_consent" && action !== "renew_consent") {
      return NextResponse.json(
        { error: "Invalid action. Use 'withdraw_consent' or 'renew_consent'" },
        { status: 400 }
      );
    }

    // Get submission and verify ownership
    const submission = await prisma.submission.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        formTemplate: {
          select: {
            id: true,
            title: true,
            defaultConsentDuration: true,
            minConsentDuration: true,
            maxConsentDuration: true,
            gracePeriodDays: true,
            allowAutoRenewal: true,
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Handle WITHDRAW CONSENT action
    if (action === "withdraw_consent") {
      // Check if consent was given
      if (!submission.consentGiven) {
        return NextResponse.json(
          { error: "No consent to withdraw" },
          { status: 400 }
        );
      }

      // Check if already withdrawn
      if (submission.consentWithdrawnAt) {
        return NextResponse.json(
          { error: "Consent already withdrawn" },
          { status: 400 }
        );
      }

      // Withdraw consent
      const updatedSubmission = await prisma.submission.update({
        where: { id },
        data: {
          consentWithdrawnAt: new Date(),
          withdrawalReason: reason || null,
        },
      });

      // Log audit event
      await logAuditEvent({
        request,
        userId: session.user.id,
        organizationId: submission.organizationId,
        action: "WITHDRAW_CONSENT",
        resourceType: "Submission",
        resourceId: submission.id,
        metadata: {
          formTitle: submission.formTemplate.title,
          organizationName: submission.formTemplate.organization.name,
          reason: reason || "No reason provided",
          originalConsentAt: submission.consentAt?.toISOString(),
        },
      });

      // Send confirmation email (fire and forget - don't block response)
      sendConsentWithdrawnEmail({
        patientName: session.user.name || "Patient",
        patientEmail: session.user.email,
        organizationName: submission.formTemplate.organization.name,
        formTitle: submission.formTemplate.title,
        withdrawnAt: updatedSubmission.consentWithdrawnAt!,
      }).catch((err) => {
        console.error("[Email] Failed to send withdrawal confirmation:", err);
      });

      return NextResponse.json({
        success: true,
        message: "Consent withdrawn successfully",
        withdrawnAt: updatedSubmission.consentWithdrawnAt,
      });
    }

    // Handle RENEW CONSENT action
    if (action === "renew_consent") {
      // Check if consent was given
      if (!submission.consentGiven) {
        return NextResponse.json(
          { error: "No consent to renew - consent was never given" },
          { status: 400 }
        );
      }

      // Cannot renew if withdrawn
      if (submission.consentWithdrawnAt) {
        return NextResponse.json(
          { error: "Cannot renew withdrawn consent. Please submit a new form." },
          { status: 400 }
        );
      }

      // Calculate consent status to check if renewal is allowed
      const currentStatus = calculateConsentStatus({
        consentGiven: submission.consentGiven,
        consentAt: submission.consentAt,
        consentExpiresAt: submission.consentExpiresAt,
        consentWithdrawnAt: submission.consentWithdrawnAt,
        gracePeriodDays: submission.formTemplate.gracePeriodDays,
      });

      if (!currentStatus.canRenew) {
        return NextResponse.json(
          { error: "Consent cannot be renewed at this time" },
          { status: 400 }
        );
      }

      // Validate duration if provided
      const renewalDuration = durationMonths || submission.consentDurationMonths || submission.formTemplate.defaultConsentDuration;
      const minDuration = submission.formTemplate.minConsentDuration;
      const maxDuration = submission.formTemplate.maxConsentDuration;

      if (renewalDuration < minDuration || renewalDuration > maxDuration) {
        return NextResponse.json(
          { error: `Consent duration must be between ${minDuration} and ${maxDuration} months` },
          { status: 400 }
        );
      }

      // Calculate new expiry date (from current expiry, not today)
      const currentExpiresAt = submission.consentExpiresAt || new Date();
      const newExpiresAt = calculateRenewalExpiry(currentExpiresAt, renewalDuration);

      // Build renewal history entry
      const renewalEntry = createRenewalEntry(
        currentExpiresAt,
        newExpiresAt,
        "patient",
        renewalDuration
      );

      // Get existing renewal history
      const existingHistory: RenewalHistoryEntry[] = submission.renewalHistory
        ? JSON.parse(submission.renewalHistory)
        : [];
      existingHistory.push(renewalEntry);

      // Update submission with new expiry
      const updatedSubmission = await prisma.submission.update({
        where: { id },
        data: {
          consentExpiresAt: newExpiresAt,
          consentDurationMonths: renewalDuration,
          renewedAt: new Date(),
          renewalCount: (submission.renewalCount || 0) + 1,
          renewalHistory: JSON.stringify(existingHistory),
        },
      });

      // Log audit event
      await logAuditEvent({
        request,
        userId: session.user.id,
        organizationId: submission.organizationId,
        action: "RENEW_CONSENT",
        resourceType: "Submission",
        resourceId: submission.id,
        metadata: {
          formTitle: submission.formTemplate.title,
          organizationName: submission.formTemplate.organization.name,
          previousExpiresAt: currentExpiresAt.toISOString(),
          newExpiresAt: newExpiresAt.toISOString(),
          durationMonths: renewalDuration,
          renewalCount: updatedSubmission.renewalCount,
        },
      });

      // Send confirmation email (fire and forget - don't block response)
      sendConsentRenewedEmail({
        patientName: session.user.name || "Patient",
        patientEmail: session.user.email,
        organizationName: submission.formTemplate.organization.name,
        formTitle: submission.formTemplate.title,
        newExpiresAt: newExpiresAt,
        durationMonths: renewalDuration,
      }).catch((err) => {
        console.error("[Email] Failed to send renewal confirmation:", err);
      });

      return NextResponse.json({
        success: true,
        message: "Consent renewed successfully",
        expiresAt: updatedSubmission.consentExpiresAt,
        renewedAt: updatedSubmission.renewedAt,
        renewalCount: updatedSubmission.renewalCount,
        durationMonths: renewalDuration,
      });
    }

    // Should never reach here due to earlier validation
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Consent action error:", error);
    return NextResponse.json(
      { error: "Failed to process consent action" },
      { status: 500 }
    );
  }
}
