/**
 * Patient Vault Stats API
 *
 * Returns statistics about the patient's vault completion.
 *
 * GET /api/patient/vault/stats - Get vault completion stats
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

interface CategoryCompletion {
  name: string;
  label: string;
  totalFields: number;
  filledFields: number;
  percentage: number;
  isComplete: boolean;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get patient profile data
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
    });

    const profileData: Record<string, unknown> = profile?.data
      ? JSON.parse(profile.data)
      : {};

    // Get all active categories
    const categories = await prisma.categoryMeta.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Get all active field definitions
    const fields = await prisma.fieldDefinition.findMany({
      where: { isActive: true },
    });

    // Group fields by category
    const fieldsByCategory: Record<string, typeof fields> = {};
    for (const field of fields) {
      if (!fieldsByCategory[field.category]) {
        fieldsByCategory[field.category] = [];
      }
      fieldsByCategory[field.category].push(field);
    }

    // Calculate completion for each category
    const categoryCompletions: CategoryCompletion[] = [];
    let totalFieldsCount = 0;
    let totalFilledCount = 0;

    for (const category of categories) {
      const categoryFields = fieldsByCategory[category.name] || [];
      const totalFields = categoryFields.length;

      // Count filled fields (non-empty values)
      const filledFields = categoryFields.filter((field) => {
        const value = profileData[field.name];
        if (value === undefined || value === null || value === "") {
          return false;
        }
        if (typeof value === "string" && value.trim() === "") {
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
        return true;
      }).length;

      const percentage = totalFields > 0
        ? Math.round((filledFields / totalFields) * 100)
        : 0;

      categoryCompletions.push({
        name: category.name,
        label: category.label,
        totalFields,
        filledFields,
        percentage,
        isComplete: filledFields === totalFields && totalFields > 0,
      });

      totalFieldsCount += totalFields;
      totalFilledCount += filledFields;
    }

    // Find the first incomplete category for the "next action" prompt
    const incompleteCategory = categoryCompletions.find(
      (c) => !c.isComplete && c.totalFields > 0
    );

    const overallPercentage = totalFieldsCount > 0
      ? Math.round((totalFilledCount / totalFieldsCount) * 100)
      : 0;

    return NextResponse.json({
      overall: {
        totalFields: totalFieldsCount,
        filledFields: totalFilledCount,
        percentage: overallPercentage,
      },
      categories: categoryCompletions,
      nextAction: incompleteCategory
        ? {
            category: incompleteCategory.name,
            message: `Add ${incompleteCategory.label.toLowerCase()} to reach ${
              overallPercentage + Math.round((1 / totalFieldsCount) * 100 * 5)
            }%`,
          }
        : null,
      lastUpdated: profile?.updatedAt || null,
    });
  } catch (error) {
    console.error("Get vault stats error:", error);
    return NextResponse.json(
      { error: "Failed to get vault stats" },
      { status: 500 }
    );
  }
}
