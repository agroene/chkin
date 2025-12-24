/**
 * Consent Expiry Notifications Cron Job
 *
 * This endpoint processes consent expiry notifications.
 * Call it daily via a cron job (e.g., Vercel Cron, GitHub Actions, or external service).
 *
 * Notification schedule:
 * - 30 days before expiry: First warning
 * - 14 days before expiry: Second warning
 * - 7 days before expiry: Urgent warning
 * - 1 day before expiry: Final warning
 *
 * GET /api/cron/consent-expiry - Process and send notifications
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET> (required in production)
 *
 * Query params:
 * - dryRun=true: Log what would be sent without actually sending emails
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendConsentExpiryEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/network";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for processing

// Notification thresholds (days before expiry)
const NOTIFICATION_DAYS = [30, 14, 7, 1];

interface NotificationRecord {
  submissionId: string;
  patientEmail: string;
  daysRemaining: number;
  sent: boolean;
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

    console.log(`[Cron] Starting consent expiry notification job (dryRun: ${dryRun})`);

    const now = new Date();
    const notifications: NotificationRecord[] = [];

    // Process each notification threshold
    for (const daysThreshold of NOTIFICATION_DAYS) {
      // Calculate the target date range for this threshold
      // We want submissions expiring exactly X days from now (±12 hours to account for timing)
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysThreshold);

      const rangeStart = new Date(targetDate);
      rangeStart.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(targetDate);
      rangeEnd.setHours(23, 59, 59, 999);

      // Find submissions with consent expiring in this window
      // that haven't already been notified for this threshold
      const expiringSubmissions = await prisma.submission.findMany({
        where: {
          consentGiven: true,
          consentWithdrawnAt: null,
          consentExpiresAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
          // Only include submissions with users (we need email addresses)
          userId: { not: null },
        },
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
      });

      console.log(
        `[Cron] Found ${expiringSubmissions.length} submissions expiring in ~${daysThreshold} days`
      );

      // Get user IDs to fetch user data
      const userIds = expiringSubmissions
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

      // Check notification history to avoid duplicate sends
      for (const submission of expiringSubmissions) {
        const user = submission.userId ? userMap.get(submission.userId) : null;
        if (!user?.email) continue;

        // Check if we already sent this notification
        const notificationKey = `expiry_${daysThreshold}d`;
        const existingNotification = await prisma.emailNotification.findFirst({
          where: {
            submissionId: submission.id,
            notificationType: notificationKey,
          },
        });

        if (existingNotification) {
          console.log(
            `[Cron] Skipping ${submission.id} - ${daysThreshold}-day notification already sent`
          );
          continue;
        }

        const appBaseUrl = getAppBaseUrl();
        const renewalUrl = `${appBaseUrl}/patient/submissions/${submission.id}`;

        if (dryRun) {
          console.log(
            `[Cron DryRun] Would send ${daysThreshold}-day warning to ${user.email} for submission ${submission.id}`
          );
          notifications.push({
            submissionId: submission.id,
            patientEmail: user.email,
            daysRemaining: daysThreshold,
            sent: false,
          });
          continue;
        }

        // Send the email
        const result = await sendConsentExpiryEmail({
          patientName: user.name || "Patient",
          patientEmail: user.email,
          organizationName: submission.formTemplate.organization.name,
          formTitle: submission.formTemplate.title,
          expiresAt: submission.consentExpiresAt!,
          daysRemaining: daysThreshold,
          renewalUrl,
          submissionId: submission.id,
        });

        if (result.success) {
          // Record that we sent this notification
          await prisma.emailNotification.create({
            data: {
              submissionId: submission.id,
              notificationType: notificationKey,
              recipientEmail: user.email,
              subject: `Consent expiry warning (${daysThreshold} days)`,
              sentAt: new Date(),
              messageId: result.messageId || null,
            },
          });

          notifications.push({
            submissionId: submission.id,
            patientEmail: user.email,
            daysRemaining: daysThreshold,
            sent: true,
          });
        } else {
          console.error(
            `[Cron] Failed to send email to ${user.email}:`,
            result.error
          );
          notifications.push({
            submissionId: submission.id,
            patientEmail: user.email,
            daysRemaining: daysThreshold,
            sent: false,
            error: result.error,
          });
        }
      }
    }

    const sentCount = notifications.filter((n) => n.sent).length;
    const failedCount = notifications.filter((n) => !n.sent && !dryRun).length;

    console.log(
      `[Cron] Consent expiry job complete. Sent: ${sentCount}, Failed: ${failedCount}, DryRun: ${
        dryRun ? notifications.length : 0
      }`
    );

    return NextResponse.json({
      success: true,
      dryRun,
      processed: notifications.length,
      sent: sentCount,
      failed: failedCount,
      notifications: dryRun ? notifications : undefined,
    });
  } catch (error) {
    console.error("[Cron] Consent expiry job error:", error);
    return NextResponse.json(
      { error: "Failed to process consent expiry notifications" },
      { status: 500 }
    );
  }
}
