/**
 * Admin Consent Statistics API
 *
 * GET /api/admin/consent-stats
 * Returns aggregate consent statistics across all organizations.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const now = new Date();

    // Calculate date thresholds
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Get all submissions with consent data
    const [
      totalSubmissions,
      activeConsents,
      expiringIn7Days,
      expiringIn30Days,
      expiredConsents,
      withdrawnConsents,
      autoRenewalEnabled,
      submissionsByOrg,
      recentRenewals,
      recentWithdrawals,
    ] = await Promise.all([
      // Total submissions with consent given
      prisma.submission.count({
        where: { consentGiven: true },
      }),

      // Active consents (not expired, not withdrawn)
      prisma.submission.count({
        where: {
          consentGiven: true,
          consentWithdrawnAt: null,
          OR: [
            { consentExpiresAt: null },
            { consentExpiresAt: { gt: now } },
          ],
        },
      }),

      // Expiring in 7 days
      prisma.submission.count({
        where: {
          consentGiven: true,
          consentWithdrawnAt: null,
          consentExpiresAt: {
            gt: now,
            lte: sevenDaysFromNow,
          },
        },
      }),

      // Expiring in 30 days
      prisma.submission.count({
        where: {
          consentGiven: true,
          consentWithdrawnAt: null,
          consentExpiresAt: {
            gt: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),

      // Expired consents (past expiry, not withdrawn)
      prisma.submission.count({
        where: {
          consentGiven: true,
          consentWithdrawnAt: null,
          consentExpiresAt: { lte: now },
        },
      }),

      // Withdrawn consents
      prisma.submission.count({
        where: {
          consentGiven: true,
          consentWithdrawnAt: { not: null },
        },
      }),

      // Auto-renewal enabled
      prisma.submission.count({
        where: {
          consentGiven: true,
          autoRenew: true,
          consentWithdrawnAt: null,
        },
      }),

      // Submissions grouped by organization
      prisma.submission.groupBy({
        by: ["organizationId"],
        where: { consentGiven: true },
        _count: { id: true },
      }),

      // Recent renewals (last 30 days)
      prisma.submission.count({
        where: {
          renewedAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Recent withdrawals (last 30 days)
      prisma.submission.count({
        where: {
          consentWithdrawnAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Get organization details for the breakdown
    const orgIds = submissionsByOrg.map((s) => s.organizationId);
    const organizations = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true, status: true },
    });

    const orgMap = new Map(organizations.map((o) => [o.id, o]));

    // Build organization breakdown with consent stats
    const organizationBreakdown = await Promise.all(
      submissionsByOrg.map(async (item) => {
        const org = orgMap.get(item.organizationId);

        const [orgActive, orgExpiring, orgExpired, orgWithdrawn] = await Promise.all([
          prisma.submission.count({
            where: {
              organizationId: item.organizationId,
              consentGiven: true,
              consentWithdrawnAt: null,
              OR: [
                { consentExpiresAt: null },
                { consentExpiresAt: { gt: now } },
              ],
            },
          }),
          prisma.submission.count({
            where: {
              organizationId: item.organizationId,
              consentGiven: true,
              consentWithdrawnAt: null,
              consentExpiresAt: {
                gt: now,
                lte: thirtyDaysFromNow,
              },
            },
          }),
          prisma.submission.count({
            where: {
              organizationId: item.organizationId,
              consentGiven: true,
              consentWithdrawnAt: null,
              consentExpiresAt: { lte: now },
            },
          }),
          prisma.submission.count({
            where: {
              organizationId: item.organizationId,
              consentGiven: true,
              consentWithdrawnAt: { not: null },
            },
          }),
        ]);

        return {
          organizationId: item.organizationId,
          organizationName: org?.name || "Unknown",
          organizationStatus: org?.status || "unknown",
          total: item._count.id,
          active: orgActive,
          expiringSoon: orgExpiring,
          expired: orgExpired,
          withdrawn: orgWithdrawn,
        };
      })
    );

    // Sort by total submissions descending
    organizationBreakdown.sort((a, b) => b.total - a.total);

    // Calculate rates
    const withdrawalRate = totalSubmissions > 0
      ? ((withdrawnConsents / totalSubmissions) * 100).toFixed(1)
      : "0";

    const autoRenewalRate = activeConsents > 0
      ? ((autoRenewalEnabled / activeConsents) * 100).toFixed(1)
      : "0";

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalSubmissions,
          activeConsents,
          expiringIn7Days,
          expiringIn30Days,
          expiredConsents,
          withdrawnConsents,
          autoRenewalEnabled,
          withdrawalRate: `${withdrawalRate}%`,
          autoRenewalRate: `${autoRenewalRate}%`,
        },
        activity: {
          recentRenewals,
          recentWithdrawals,
        },
        organizationBreakdown,
      },
    });
  } catch (error) {
    console.error("Get consent stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch consent statistics" },
      { status: 500 }
    );
  }
}
