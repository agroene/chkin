/**
 * Admin Field Library Categories API
 *
 * GET /api/admin/fields/categories
 * Returns list of categories with their field counts and metadata.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// Category metadata with display names and descriptions
const CATEGORY_META: Record<string, { displayName: string; description: string; tier: "core" | "industry" }> = {
  personal: {
    displayName: "Personal Information",
    description: "Basic personal details like name, date of birth, gender",
    tier: "core",
  },
  identity: {
    displayName: "Identity Documents",
    description: "ID numbers, passports, driver's licenses, visas",
    tier: "core",
  },
  contact: {
    displayName: "Contact Details",
    description: "Phone numbers, email addresses, contact preferences",
    tier: "core",
  },
  address: {
    displayName: "Address Information",
    description: "Residential, postal, and business addresses",
    tier: "core",
  },
  emergency: {
    displayName: "Emergency Contacts",
    description: "Emergency contact persons and their details",
    tier: "core",
  },
  responsible: {
    displayName: "Responsible Party",
    description: "Account holder or responsible person information",
    tier: "core",
  },
  preferences: {
    displayName: "Preferences",
    description: "Dietary, accessibility, and communication preferences",
    tier: "core",
  },
  medical: {
    displayName: "Medical Information",
    description: "Medical aid, health history, medications, allergies",
    tier: "industry",
  },
  insurance: {
    displayName: "Insurance",
    description: "Insurance policies and coverage details",
    tier: "industry",
  },
  education: {
    displayName: "Education",
    description: "Student information, school details, guardian info",
    tier: "industry",
  },
  employment: {
    displayName: "Employment",
    description: "Employee details, banking, tax information",
    tier: "industry",
  },
  events: {
    displayName: "Events & Hospitality",
    description: "Bookings, room preferences, event registration",
    tier: "industry",
  },
  membership: {
    displayName: "Membership",
    description: "Gym, club, organization memberships",
    tier: "industry",
  },
  legal: {
    displayName: "Legal & Business",
    description: "Client information, company details, billing",
    tier: "industry",
  },
  financial: {
    displayName: "Financial Compliance",
    description: "KYC, FICA, source of funds, AML information",
    tier: "industry",
  },
  consent: {
    displayName: "Consent & Signatures",
    description: "Terms acceptance, signatures, waivers",
    tier: "industry",
  },
};

export async function GET() {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    // Get field counts by category
    const categoryCounts = await prisma.fieldDefinition.groupBy({
      by: ["category"],
      _count: { _all: true },
    });

    // Get active field counts by category
    const activeCounts = await prisma.fieldDefinition.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { _all: true },
    });

    // Get special personal info counts by category
    const specialInfoCounts = await prisma.fieldDefinition.groupBy({
      by: ["category"],
      where: { specialPersonalInfo: true },
      _count: { _all: true },
    });

    // Build category list with counts
    const categoryCountMap = categoryCounts.reduce(
      (acc, c) => {
        acc[c.category] = c._count._all;
        return acc;
      },
      {} as Record<string, number>
    );

    const activeCountMap = activeCounts.reduce(
      (acc, c) => {
        acc[c.category] = c._count._all;
        return acc;
      },
      {} as Record<string, number>
    );

    const specialInfoCountMap = specialInfoCounts.reduce(
      (acc, c) => {
        acc[c.category] = c._count._all;
        return acc;
      },
      {} as Record<string, number>
    );

    const categories = Object.entries(CATEGORY_META).map(([key, meta]) => ({
      key,
      ...meta,
      fieldCount: categoryCountMap[key] || 0,
      activeFieldCount: activeCountMap[key] || 0,
      specialInfoCount: specialInfoCountMap[key] || 0,
    }));

    // Sort by tier (core first) then by display name
    categories.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier === "core" ? -1 : 1;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    // Summary stats
    const totalFields = categoryCounts.reduce((sum, c) => sum + c._count._all, 0);
    const totalActiveFields = activeCounts.reduce((sum, c) => sum + c._count._all, 0);
    const totalSpecialInfoFields = specialInfoCounts.reduce((sum, c) => sum + c._count._all, 0);

    return NextResponse.json({
      success: true,
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          coreCategories: categories.filter((c) => c.tier === "core").length,
          industryCategories: categories.filter((c) => c.tier === "industry").length,
          totalFields,
          totalActiveFields,
          totalInactiveFields: totalFields - totalActiveFields,
          totalSpecialInfoFields,
        },
      },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
