/**
 * Consent Auto-Renewal Cron Job
 *
 * This endpoint processes automatic consent renewals for submissions
 * where the patient has opted in to auto-renewal.
 *
 * Call it daily via a cron job (e.g., Vercel Cron, GitHub Actions, or external service).
 *
 * Auto-renewal happens when:
 * - autoRenew is true
 * - Consent expires within the next 7 days
 * - Consent hasn't been withdrawn
 * - Form template still allows auto-renewal
 *
 * GET /api/cron/consent-auto-renew - Process auto-renewals
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (required in production)
 *
 * Query params:
 * - dryRun=true: Log what would be renewed without actually renewing
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendConsentRenewedEmail } from "@/lib/email";
import { calculateRenewalExpiry, createRenewalEntry, type RenewalHistoryEntry } from "@/lib/consent-status";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Auto-renew consents expiring within this many days
const AUTO_RENEW_THRESHOLD_DAYS = 7;

interface RenewalRecord {
  submissionId: string;
  patientEmail: string;
  previousExpiresAt: Date;
  newExpiresAt: Date;
  renewed: boolean;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization in production
    if (process.env.NODE_ENV === "production") {
      const authHeader = request.headers.get("authorization");
      const expectedToken = process.env.CRON_SECRET;

      if (!expectedToken) {
        console.error("[Cron] CRON_SECRET not configured");
        return NextResponse.json(
          { error: "Cron job not configured" },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get("dryRun") === "true";

    console.log(`[Cron] Starting consent auto-renewal job (dryRun: ${dryRun})`);

    const now = new Date();
    const renewals: RenewalRecord[] = [];

    // Calculate the threshold date (7 days from now)
    const thresholdDate = new Date(now);
    thresholdDate.setDate(thresholdDate.getDate() + AUTO_RENEW_THRESHOLD_DAYS);

    // Find submissions eligible for auto-renewal:
    // - autoRenew is true
    // - consentGiven is true
    // - not withdrawn
    // - expires within threshold (but not already expired beyond grace)
    // - has a user (so we can send email)
    const eligibleSubmissions = await prisma.submission.findMany({
      where: {
        autoRenew: true,
        consentGiven: true,
        consentWithdrawnAt: null,
        consentExpiresAt: {
          gte: now, // Not already expired
          lte: thresholdDate, // Expires within threshold
        },
        userId: { not: null },
      },
      include: {
        formTemplate: {
          select: {
            id: true,
            title: true,
            allowAutoRenewal: true,
            defaultConsentDuration: true,
            minConsentDuration: true,
            maxConsentDuration: true,
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    console.log(
      `[Cron] Found ${eligibleSubmissions.length} submissions eligible for auto-renewal`
    );

    // Get user IDs to fetch user data
    const userIds = eligibleSubmissions
      .map((s) => s.userId)
      .filter((id): id is string => id !== null);

    // Fetch users in batch
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Process each eligible submission
    for (const submission of eligibleSubmissions) {
      const user = submission.userId ? userMap.get(submission.userId) : null;
      if (!user?.email) continue;

      // Double-check form template still allows auto-renewal
      if (!submission.formTemplate.allowAutoRenewal) {
        console.log(
          `[Cron] Skipping ${submission.id} - form template no longer allows auto-renewal`
        );
        continue;
      }

      const currentExpiresAt = submission.consentExpiresAt!;
      const renewalDuration = submission.consentDurationMonths || submission.formTemplate.defaultConsentDuration;
      const newExpiresAt = calculateRenewalExpiry(currentExpiresAt, renewalDuration);

      if (dryRun) {
        console.log(
          `[Cron DryRun] Would auto-renew ${submission.id} for ${user.email}: ${currentExpiresAt.toISOString()} -> ${newExpiresAt.toISOString()}`
        );
        renewals.push({
          submissionId: submission.id,
          patientEmail: user.email,
          previousExpiresAt: currentExpiresAt,
          newExpiresAt,
          renewed: false,
        });
        continue;
      }

      try {
        // Build renewal history entry
        const renewalEntry = createRenewalEntry(
          currentExpiresAt,
          newExpiresAt,
          "auto",
          renewalDuration
        );

        // Get existing renewal history
        const existingHistory: RenewalHistoryEntry[] = submission.renewalHistory
          ? JSON.parse(submission.renewalHistory)
          : [];
        existingHistory.push(renewalEntry);

        // Update submission with new expiry
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            consentExpiresAt: newExpiresAt,
            renewedAt: new Date(),
            renewalCount: (submission.renewalCount || 0) + 1,
            renewalHistory: JSON.stringify(existingHistory),
          },
        });

        // Send confirmation email
        await sendConsentRenewedEmail({
          patientName: user.name || "Patient",
          patientEmail: user.email,
          organizationName: submission.formTemplate.organization.name,
          formTitle: submission.formTemplate.title,
          newExpiresAt,
          durationMonths: renewalDuration,
          isAutoRenewal: true,
        });

        // Record the notification
        await prisma.emailNotification.create({
          data: {
            submissionId: submission.id,
            notificationType: "auto_renewal",
            recipientEmail: user.email,
            subject: "Your consent has been automatically renewed",
            sentAt: new Date(),
          },
        });

        console.log(
          `[Cron] Auto-renewed consent for ${submission.id}: ${currentExpiresAt.toISOString()} -> ${newExpiresAt.toISOString()}`
        );

        renewals.push({
          submissionId: submission.id,
          patientEmail: user.email,
          previousExpiresAt: currentExpiresAt,
          newExpiresAt,
          renewed: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Cron] Failed to auto-renew ${submission.id}:`,
          errorMessage
        );
        renewals.push({
          submissionId: submission.id,
          patientEmail: user.email,
          previousExpiresAt: currentExpiresAt,
          newExpiresAt,
          renewed: false,
          error: errorMessage,
        });
      }
    }

    const renewedCount = renewals.filter((r) => r.renewed).length;
    const failedCount = renewals.filter((r) => !r.renewed && !dryRun).length;

    console.log(
      `[Cron] Auto-renewal job complete. Renewed: ${renewedCount}, Failed: ${failedCount}, DryRun: ${
        dryRun ? renewals.length : 0
      }`
    );

    return NextResponse.json({
      success: true,
      dryRun,
      processed: renewals.length,
      renewed: renewedCount,
      failed: failedCount,
      renewals: dryRun ? renewals : undefined,
    });
  } catch (error) {
    console.error("[Cron] Auto-renewal job error:", error);
    return NextResponse.json(
      { error: "Failed to process auto-renewals" },
      { status: 500 }
    );
  }
}
