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

export const dynamic = "force-dynamic";

interface OrganizationConsent {
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  industryType: string | null;
  // Consent status
  hasActiveConsent: boolean;
  hasWithdrawnConsent: boolean;
  // Dates
  firstConsentAt: string | null;
  lastConsentAt: string | null;
  withdrawnAt: string | null;
  // Submissions
  totalSubmissions: number;
  activeSubmissions: number;
  withdrawnSubmissions: number;
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
      include: {
        formTemplate: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                industryType: true,
              },
            },
            fields: {
              include: {
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
      const activeSubmissions = orgSubmissions.filter(s => !s.consentWithdrawnAt);
      const withdrawnSubmissions = orgSubmissions.filter(s => s.consentWithdrawnAt);

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
        .filter(s => s.consentWithdrawnAt)
        .map(s => new Date(s.consentWithdrawnAt!).getTime());

      consents.push({
        organizationId: orgId,
        organizationName: organization.name,
        organizationLogo: organization.logo,
        industryType: organization.industryType,
        hasActiveConsent: activeSubmissions.length > 0,
        hasWithdrawnConsent: withdrawnSubmissions.length > 0,
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

    return NextResponse.json({
      consents,
      summary: {
        totalOrganizations: consents.length,
        activeConsents: activeCount,
        withdrawnConsents: withdrawnCount,
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
