/**
 * Provider Field Categories API
 *
 * Get field categories with counts for the field picker.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Category metadata
const CATEGORY_META: Record<string, { label: string; description: string }> = {
  personal: {
    label: "Personal Information",
    description: "Basic personal details like name, date of birth, etc.",
  },
  identity: {
    label: "Identity Documents",
    description: "ID numbers, passport, driver's license, etc.",
  },
  contact: {
    label: "Contact Details",
    description: "Phone numbers, email addresses, etc.",
  },
  address: {
    label: "Address Information",
    description: "Physical and postal addresses",
  },
  emergency: {
    label: "Emergency Contacts",
    description: "Emergency contact information",
  },
  responsible: {
    label: "Responsible Party",
    description: "Guardian or responsible person details",
  },
  preferences: {
    label: "Preferences",
    description: "Communication and other preferences",
  },
  medical: {
    label: "Medical Information",
    description: "Health and medical details",
  },
  insurance: {
    label: "Insurance",
    description: "Medical aid and insurance information",
  },
  education: {
    label: "Education",
    description: "Educational background and qualifications",
  },
  employment: {
    label: "Employment",
    description: "Work and employment details",
  },
  events: {
    label: "Events & Hospitality",
    description: "Event registration and hospitality fields",
  },
  membership: {
    label: "Membership",
    description: "Membership and subscription details",
  },
  legal: {
    label: "Legal & Business",
    description: "Legal and business-related fields",
  },
  financial: {
    label: "Financial Compliance",
    description: "Financial and compliance fields",
  },
  consent: {
    label: "Consent & Signatures",
    description: "Consent fields and digital signatures",
  },
};

export async function GET() {
  try {
    // Verify user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user has a provider organization
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 }
      );
    }

    // Get category counts (only active fields)
    const categoryCounts = await prisma.fieldDefinition.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { category: true },
    });

    // Build response with metadata
    const categories = categoryCounts.map((cat) => ({
      name: cat.category,
      label: CATEGORY_META[cat.category]?.label || cat.category,
      description: CATEGORY_META[cat.category]?.description || "",
      count: cat._count.category,
    }));

    // Sort categories: core first, then industry
    const coreCategories = ["personal", "identity", "contact", "address", "emergency", "responsible", "preferences"];
    categories.sort((a, b) => {
      const aIsCore = coreCategories.includes(a.name);
      const bIsCore = coreCategories.includes(b.name);
      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;
      return a.label.localeCompare(b.label);
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("List categories error:", error);
    return NextResponse.json(
      { error: "Failed to list categories" },
      { status: 500 }
    );
  }
}
