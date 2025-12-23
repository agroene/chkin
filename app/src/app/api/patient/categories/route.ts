/**
 * Patient Categories API
 *
 * Returns all active categories with their field definitions for the patient vault.
 *
 * GET /api/patient/categories - Get all categories with fields
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active categories ordered by sortOrder
    const categories = await prisma.categoryMeta.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    // Get all active field definitions
    const fields = await prisma.fieldDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    // Group fields by category
    const fieldsByCategory: Record<string, typeof fields> = {};
    for (const field of fields) {
      if (!fieldsByCategory[field.category]) {
        fieldsByCategory[field.category] = [];
      }
      fieldsByCategory[field.category].push(field);
    }

    // Build response with categories and their fields
    const categoriesWithFields = categories.map((category) => ({
      id: category.id,
      name: category.name,
      label: category.label,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      color: category.color,
      isProtected: category.isProtected,
      previewFields: category.previewFields,
      fields: (fieldsByCategory[category.name] || []).map((field) => ({
        id: field.id,
        name: field.name,
        label: field.label,
        description: field.description,
        fieldType: field.fieldType,
        config: field.config ? JSON.parse(field.config) : null,
        validation: field.validation ? JSON.parse(field.validation) : null,
        sortOrder: field.sortOrder,
        specialPersonalInfo: field.specialPersonalInfo,
        requiresExplicitConsent: field.requiresExplicitConsent,
      })),
    }));

    return NextResponse.json({
      categories: categoriesWithFields,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Failed to get categories" },
      { status: 500 }
    );
  }
}
