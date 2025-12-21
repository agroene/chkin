/**
 * Admin Field Library API
 *
 * List and create field definitions.
 *
 * GET /api/admin/fields
 * Query params:
 *   - category: string (filter by category)
 *   - search: string (searches name, label, description)
 *   - isActive: "true" | "false" | "all" (default: "all")
 *   - specialPersonalInfo: "true" | "false" | "all" (default: "all")
 *   - fieldType: string (filter by field type)
 *   - page: number (default: 1)
 *   - limit: number (default: 50, max: 200)
 *   - sortBy: "name" | "label" | "category" | "sortOrder" | "createdAt" (default: "category")
 *   - sortOrder: "asc" | "desc" (default: "asc")
 *
 * POST /api/admin/fields
 * Creates a new field definition
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { logAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

// Valid categories
const VALID_CATEGORIES = [
  "personal",
  "identity",
  "contact",
  "address",
  "emergency",
  "responsible",
  "preferences",
  "medical",
  "insurance",
  "education",
  "employment",
  "events",
  "membership",
  "legal",
  "financial",
  "consent",
];

// Valid field types
const VALID_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "date",
  "datetime",
  "select",
  "multiselect",
  "checkbox",
  "radio",
  "textarea",
  "number",
  "file",
  "signature",
  "country",
  "currency",
  "address",
];

// Linked sub-fields that are auto-created with address fields
// These use a suffix pattern: {parentBaseName}ComplexName, {parentBaseName}UnitNumber, etc.
const ADDRESS_LINKED_FIELD_SUFFIXES = [
  { suffix: "ComplexName", label: "Building/Complex", fieldType: "text", description: "Building, complex, or estate name" },
  { suffix: "UnitNumber", label: "Unit/Suite", fieldType: "text", description: "Unit, suite, or floor number" },
  { suffix: "Suburb", label: "Suburb", fieldType: "text", description: "Suburb or neighborhood" },
  { suffix: "City", label: "City", fieldType: "text", description: "City or town" },
  { suffix: "Province", label: "Province", fieldType: "text", description: "State, province, or region" },
  { suffix: "PostalCode", label: "Postal Code", fieldType: "text", description: "Postal or ZIP code" },
  { suffix: "Country", label: "Country", fieldType: "country", description: "Country selection" },
];

export async function GET(request: NextRequest) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive") || "all";
    const specialPersonalInfo = searchParams.get("specialPersonalInfo") || "all";
    const fieldType = searchParams.get("fieldType");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const sortBy = searchParams.get("sortBy") || "category";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

    // Build where clause
    interface WhereClause {
      category?: string;
      fieldType?: string;
      isActive?: boolean;
      specialPersonalInfo?: boolean;
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        label?: { contains: string; mode: "insensitive" };
        description?: { contains: string; mode: "insensitive" };
      }>;
    }

    const where: WhereClause = {};

    // Filter by category
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    // Filter by field type
    if (fieldType && VALID_FIELD_TYPES.includes(fieldType)) {
      where.fieldType = fieldType;
    }

    // Filter by active status
    if (isActive === "true") {
      where.isActive = true;
    } else if (isActive === "false") {
      where.isActive = false;
    }

    // Filter by special personal info
    if (specialPersonalInfo === "true") {
      where.specialPersonalInfo = true;
    } else if (specialPersonalInfo === "false") {
      where.specialPersonalInfo = false;
    }

    // Search by name, label, or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { label: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy - use two-level sort: primary by chosen field, secondary by sortOrder
    type OrderByEntry = { [key: string]: "asc" | "desc" };
    const orderBy: OrderByEntry[] = [];

    if (sortBy === "name") {
      orderBy.push({ name: sortOrder });
    } else if (sortBy === "label") {
      orderBy.push({ label: sortOrder });
    } else if (sortBy === "sortOrder") {
      orderBy.push({ sortOrder: sortOrder });
    } else if (sortBy === "createdAt") {
      orderBy.push({ createdAt: sortOrder });
    } else {
      // Default: category, then sortOrder
      orderBy.push({ category: sortOrder });
      orderBy.push({ sortOrder: "asc" });
    }

    // Get total count
    const totalCount = await prisma.fieldDefinition.count({ where });

    // Get fields
    const fields = await prisma.fieldDefinition.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        label: true,
        description: true,
        fieldType: true,
        category: true,
        config: true,
        validation: true,
        sortOrder: true,
        isActive: true,
        specialPersonalInfo: true,
        requiresExplicitConsent: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { formFields: true },
        },
      },
    });

    // Transform response - parse JSON fields
    const transformedFields = fields.map((field) => ({
      id: field.id,
      name: field.name,
      label: field.label,
      description: field.description,
      fieldType: field.fieldType,
      category: field.category,
      config: field.config ? JSON.parse(field.config) : null,
      validation: field.validation ? JSON.parse(field.validation) : null,
      sortOrder: field.sortOrder,
      isActive: field.isActive,
      specialPersonalInfo: field.specialPersonalInfo,
      requiresExplicitConsent: field.requiresExplicitConsent,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt,
      usageCount: field._count.formFields,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    // Get category counts for filters
    const categoryCounts = await prisma.fieldDefinition.groupBy({
      by: ["category"],
      _count: { _all: true },
      where: isActive !== "all" ? { isActive: isActive === "true" } : undefined,
    });

    return NextResponse.json({
      success: true,
      data: transformedFields,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      meta: {
        categories: VALID_CATEGORIES,
        fieldTypes: VALID_FIELD_TYPES,
        categoryCounts: categoryCounts.reduce(
          (acc, c) => {
            acc[c.category] = c._count._all;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error("Get fields error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fields" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify admin access
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    const body = await request.json();

    // Validate required fields
    const { name, label, description, fieldType, category } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!fieldType || !VALID_FIELD_TYPES.includes(fieldType)) {
      return NextResponse.json(
        { error: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.fieldDefinition.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A field with this name already exists" },
        { status: 409 }
      );
    }

    // Validate name format (camelCase: start with lowercase, alphanumeric only)
    const nameRegex = /^[a-z][a-zA-Z0-9]*$/;
    if (!nameRegex.test(name.trim())) {
      return NextResponse.json(
        { error: "Name must be camelCase (start with lowercase letter, alphanumeric only)" },
        { status: 400 }
      );
    }

    // Get max sortOrder in category
    const maxSortOrder = await prisma.fieldDefinition.aggregate({
      where: { category },
      _max: { sortOrder: true },
    });

    // Calculate sortOrder based on insertAfterFieldId or provided sortOrder
    let newSortOrder: number;
    const insertAfterFieldId = body.insertAfterFieldId;

    if (insertAfterFieldId) {
      // Insert after a specific field - find that field's sortOrder
      const insertAfterField = await prisma.fieldDefinition.findUnique({
        where: { id: insertAfterFieldId },
        select: { sortOrder: true, category: true },
      });

      if (!insertAfterField || insertAfterField.category !== category) {
        return NextResponse.json(
          { error: "Insert after field not found or not in the same category" },
          { status: 400 }
        );
      }

      newSortOrder = insertAfterField.sortOrder + 1;

      // Shift all fields at or after this position
      await prisma.fieldDefinition.updateMany({
        where: {
          category,
          sortOrder: { gte: newSortOrder },
        },
        data: {
          sortOrder: { increment: fieldType === "address" ? 8 : 1 }, // +8 for address (1 parent + 7 linked)
        },
      });
    } else if (body.sortOrder !== undefined && body.sortOrder !== null) {
      // Explicit sortOrder provided (likely from position picker "insert at beginning")
      newSortOrder = body.sortOrder;

      // If sortOrder is 0 (beginning), shift all existing fields
      if (newSortOrder === 0) {
        await prisma.fieldDefinition.updateMany({
          where: { category },
          data: {
            sortOrder: { increment: fieldType === "address" ? 8 : 1 },
          },
        });
      }
    } else {
      // Default: add at end
      newSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;
    }

    // Create field
    const field = await prisma.fieldDefinition.create({
      data: {
        name: name.trim(),
        label: label.trim(),
        description: description.trim(),
        fieldType,
        category,
        config: body.config ? JSON.stringify(body.config) : null,
        validation: body.validation ? JSON.stringify(body.validation) : null,
        sortOrder: newSortOrder,
        isActive: body.isActive ?? true,
        specialPersonalInfo: body.specialPersonalInfo ?? false,
        requiresExplicitConsent: body.requiresExplicitConsent ?? false,
        createdBy: adminCheck.user?.id,
      },
    });

    // If this is an address field, auto-create linked sub-fields
    const linkedFields: typeof field[] = [];
    if (fieldType === "address") {
      // Generate a base name for linked fields by removing common suffixes
      // e.g., "homeStreetAddress" -> "home", "responsiblePartyStreetAddress" -> "responsiblePartyAddress"
      const baseName = name.trim().replace(/StreetAddress$/i, "").replace(/Address$/i, "");
      const linkedPrefix = baseName.length > 0 ? baseName + "Address" : "";

      let linkedSortOrder = newSortOrder + 1;

      for (const subField of ADDRESS_LINKED_FIELD_SUFFIXES) {
        // Generate the linked field name: e.g., "homeAddressSuburb", "homeAddressCity"
        const linkedName = linkedPrefix.length > 0
          ? linkedPrefix + subField.suffix
          : subField.suffix.charAt(0).toLowerCase() + subField.suffix.slice(1);

        // Generate the label: e.g., "Home Suburb", "Home City"
        const linkedLabel = linkedPrefix.length > 0
          ? label.trim().replace(/Street Address$/i, "").replace(/Address$/i, "").trim() + " " + subField.label
          : subField.label;

        // Check if this field already exists (skip if it does)
        const existingLinked = await prisma.fieldDefinition.findUnique({
          where: { name: linkedName },
        });

        if (!existingLinked) {
          const linkedField = await prisma.fieldDefinition.create({
            data: {
              name: linkedName,
              label: linkedLabel,
              description: `${subField.description} for ${label.trim()}`,
              fieldType: subField.fieldType,
              category,
              sortOrder: linkedSortOrder++,
              isActive: true,
              specialPersonalInfo: false,
              requiresExplicitConsent: false,
              createdBy: adminCheck.user?.id,
            },
          });
          linkedFields.push(linkedField);
        }
      }

      // Update the parent address field's config to reference the linked fields
      const linkedFieldNames = linkedFields.map(f => f.name);
      if (linkedFieldNames.length > 0) {
        await prisma.fieldDefinition.update({
          where: { id: field.id },
          data: {
            config: JSON.stringify({
              linkedFields: {
                complexName: linkedFieldNames.find(n => n.endsWith("ComplexName")) || null,
                unitNumber: linkedFieldNames.find(n => n.endsWith("UnitNumber")) || null,
                suburb: linkedFieldNames.find(n => n.endsWith("Suburb")) || null,
                city: linkedFieldNames.find(n => n.endsWith("City")) || null,
                province: linkedFieldNames.find(n => n.endsWith("Province")) || null,
                postalCode: linkedFieldNames.find(n => n.endsWith("PostalCode")) || null,
                country: linkedFieldNames.find(n => n.endsWith("Country")) || null,
              },
            }),
          },
        });
      }
    }

    // Log audit event
    await logAuditEvent({
      userId: adminCheck.user?.id,
      action: "CREATE_FIELD_DEFINITION",
      resourceType: "FieldDefinition",
      resourceId: field.id,
      metadata: {
        name: field.name,
        label: field.label,
        fieldType: field.fieldType,
        category: field.category,
        linkedFieldsCreated: linkedFields.length,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: field.id,
        name: field.name,
        label: field.label,
        description: field.description,
        fieldType: field.fieldType,
        category: field.category,
        config: field.config ? JSON.parse(field.config) : null,
        validation: field.validation ? JSON.parse(field.validation) : null,
        sortOrder: field.sortOrder,
        isActive: field.isActive,
        specialPersonalInfo: field.specialPersonalInfo,
        requiresExplicitConsent: field.requiresExplicitConsent,
        createdAt: field.createdAt,
        updatedAt: field.updatedAt,
        linkedFields: linkedFields.map(f => ({
          id: f.id,
          name: f.name,
          label: f.label,
        })),
      },
    });
  } catch (error) {
    console.error("Create field error:", error);
    return NextResponse.json(
      { error: "Failed to create field" },
      { status: 500 }
    );
  }
}
