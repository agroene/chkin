/**
 * Patient Consents API
 *
 * Returns consent status grouped by organization.
 * Each organization shows their consent status across all submissions.
 *
 * GET /api/patient/consents - List consents by organization
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { calculateConsentStatus, type ConsentStatus } from "@/lib/consent-status";

export const dynamic = "force-dynamic";

interface OrganizationConsent {
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  industryType: string | null;
  // Consent status
  hasActiveConsent: boolean;
  hasWithdrawnConsent: boolean;
  hasExpiringConsent: boolean; // Any consent expiring soon?
  hasExpiredConsent: boolean; // Any consent in grace/expired?
  // Time-bound consent summary
  consentStatuses: {
    status: ConsentStatus;
    count: number;
  }[];
  earliestExpiry: string | null; // Earliest expiring consent
  urgentRenewals: number; // Count needing renewal attention
  // Dates
  firstConsentAt: string | null;
  lastConsentAt: string | null;
  withdrawnAt: string | null;
  // Submissions
  totalSubmissions: number;
  activeSubmissions: number;
  withdrawnSubmissions: number;
  expiringSubmissions: number;
  expiredSubmissions: number;
  // Data categories consented to
  dataCategories: string[];
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all submissions for this user grouped by organization
    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        consentGiven: true, // Only include submissions where consent was given
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        consentGiven: true,
        consentAt: true,
        consentWithdrawnAt: true,
        consentExpiresAt: true,
        consentDurationMonths: true,
        autoRenew: true,
        formTemplate: {
          select: {
            gracePeriodDays: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                industryType: true,
              },
            },
            fields: {
              select: {
                fieldDefinition: {
                  select: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Group by organization
    const orgMap = new Map<string, {
      organization: typeof submissions[0]["formTemplate"]["organization"];
      submissions: typeof submissions;
    }>();

    for (const submission of submissions) {
      const orgId = submission.formTemplate.organization.id;
      if (!orgMap.has(orgId)) {
        orgMap.set(orgId, {
          organization: submission.formTemplate.organization,
          submissions: [],
        });
      }
      orgMap.get(orgId)!.submissions.push(submission);
    }

    // Build consent list
    const consents: OrganizationConsent[] = [];

    for (const [orgId, { organization, submissions: orgSubmissions }] of orgMap) {
      // Calculate consent status for each submission
      const submissionStatuses = orgSubmissions.map(s => ({
        submission: s,
        status: calculateConsentStatus({
          consentGiven: s.consentGiven,
          consentAt: s.consentAt,
          consentExpiresAt: s.consentExpiresAt,
          consentWithdrawnAt: s.consentWithdrawnAt,
          gracePeriodDays: s.formTemplate.gracePeriodDays,
        }),
      }));

      // Group by status
      const statusCounts = new Map<ConsentStatus, number>();
      for (const { status } of submissionStatuses) {
        const count = statusCounts.get(status.status) || 0;
        statusCounts.set(status.status, count + 1);
      }

      const consentStatuses = Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      // Count by category
      const activeSubmissions = submissionStatuses.filter(s =>
        s.status.status === "ACTIVE" || s.status.status === "EXPIRING"
      );
      const withdrawnSubmissions = submissionStatuses.filter(s => s.status.status === "WITHDRAWN");
      const expiringSubmissions = submissionStatuses.filter(s => s.status.status === "EXPIRING");
      const expiredSubmissions = submissionStatuses.filter(s =>
        s.status.status === "EXPIRED" || s.status.status === "GRACE"
      );

      // Find urgent renewals (high/critical urgency)
      const urgentRenewals = submissionStatuses.filter(s =>
        s.status.renewalUrgency === "high" || s.status.renewalUrgency === "critical"
      ).length;

      // Find earliest expiry among accessible consents
      const accessibleWithExpiry = submissionStatuses
        .filter(s => s.status.isAccessible && s.status.expiresAt)
        .map(s => s.status.expiresAt!.getTime());

      const earliestExpiry = accessibleWithExpiry.length > 0
        ? new Date(Math.min(...accessibleWithExpiry)).toISOString()
        : null;

      // Get all unique data categories
      const categories = new Set<string>();
      for (const submission of orgSubmissions) {
        for (const field of submission.formTemplate.fields) {
          categories.add(field.fieldDefinition.category);
        }
      }

      // Find dates
      const consentDates = orgSubmissions
        .filter(s => s.consentAt)
        .map(s => new Date(s.consentAt!).getTime());

      const withdrawnDates = withdrawnSubmissions
        .map(s => s.submission.consentWithdrawnAt)
        .filter((d): d is Date => d !== null)
        .map(d => new Date(d).getTime());

      consents.push({
        organizationId: orgId,
        organizationName: organization.name,
        organizationLogo: organization.logo,
        industryType: organization.industryType,
        hasActiveConsent: activeSubmissions.length > 0,
        hasWithdrawnConsent: withdrawnSubmissions.length > 0,
        hasExpiringConsent: expiringSubmissions.length > 0,
        hasExpiredConsent: expiredSubmissions.length > 0,
        consentStatuses,
        earliestExpiry,
        urgentRenewals,
        firstConsentAt: consentDates.length > 0
          ? new Date(Math.min(...consentDates)).toISOString()
          : null,
        lastConsentAt: consentDates.length > 0
          ? new Date(Math.max(...consentDates)).toISOString()
          : null,
        withdrawnAt: withdrawnDates.length > 0
          ? new Date(Math.max(...withdrawnDates)).toISOString()
          : null,
        totalSubmissions: orgSubmissions.length,
        activeSubmissions: activeSubmissions.length,
        withdrawnSubmissions: withdrawnSubmissions.length,
        expiringSubmissions: expiringSubmissions.length,
        expiredSubmissions: expiredSubmissions.length,
        dataCategories: Array.from(categories),
      });
    }

    // Sort by most recent activity
    consents.sort((a, b) => {
      const dateA = a.lastConsentAt || a.withdrawnAt || "";
      const dateB = b.lastConsentAt || b.withdrawnAt || "";
      return dateB.localeCompare(dateA);
    });

    // Calculate summary stats
    const activeCount = consents.filter(c => c.hasActiveConsent).length;
    const withdrawnCount = consents.filter(c => !c.hasActiveConsent && c.hasWithdrawnConsent).length;
    const expiringCount = consents.filter(c => c.hasExpiringConsent).length;
    const expiredCount = consents.filter(c => c.hasExpiredConsent).length;
    const totalUrgentRenewals = consents.reduce((sum, c) => sum + c.urgentRenewals, 0);

    return NextResponse.json({
      consents,
      summary: {
        totalOrganizations: consents.length,
        activeConsents: activeCount,
        withdrawnConsents: withdrawnCount,
        expiringConsents: expiringCount,
        expiredConsents: expiredCount,
        urgentRenewals: totalUrgentRenewals,
      },
    });
  } catch (error) {
    console.error("Get patient consents error:", error);
    return NextResponse.json(
      { error: "Failed to get consents" },
      { status: 500 }
    );
  }
}
