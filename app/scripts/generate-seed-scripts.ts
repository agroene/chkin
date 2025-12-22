/**
 * Generate Seed Scripts
 *
 * Exports current database state and generates:
 * 1. Updated seed-fields.ts with all current field definitions
 * 2. seed-test-form.ts to recreate the test provider form
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  fieldType: string;
  category: string;
  config: string | null;
  validation: string | null;
  sortOrder: number;
  isActive: boolean;
  specialPersonalInfo: boolean;
  requiresExplicitConsent: boolean;
}

interface FormField {
  fieldDefinition: FieldDefinition;
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
  columnSpan: number;
  visibilityRules: string | null;
}

interface FormTemplate {
  id: string;
  title: string;
  description: string | null;
  consentClause: string | null;
  isActive: boolean;
  version: number;
  fields: FormField[];
  organization: {
    name: string;
    slug: string;
  };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Fetching data from database...\n");

    // Get all field definitions
    const fieldDefs = await prisma.fieldDefinition.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    console.log(`Found ${fieldDefs.length} field definitions`);

    // Get the test form template
    const forms = await prisma.formTemplate.findMany({
      include: {
        fields: {
          include: {
            fieldDefinition: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        organization: {
          select: { name: true, slug: true },
        },
      },
    });

    console.log(`Found ${forms.length} form template(s)`);

    // Group field definitions by category
    const fieldsByCategory: Record<string, typeof fieldDefs> = {};
    for (const field of fieldDefs) {
      if (!fieldsByCategory[field.category]) {
        fieldsByCategory[field.category] = [];
      }
      fieldsByCategory[field.category].push(field);
    }

    // Generate the test form seed script
    if (forms.length > 0) {
      const form = forms[0] as unknown as FormTemplate;
      generateTestFormSeedScript(form);
      console.log("\nGenerated: prisma/seed-test-form.ts");
    }

    // Generate updated field definitions seed
    generateFieldDefsSeedScript(fieldsByCategory);
    console.log("Generated: prisma/seed-fields-updated.ts");

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function escapeString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function generateFieldDefsSeedScript(fieldsByCategory: Record<string, FieldDefinition[]>) {
  const categories = Object.keys(fieldsByCategory).sort();

  let output = `/**
 * Field Library Seed Data (Auto-generated)
 *
 * Generated from current database state.
 * Canonical field definitions for the Chkin platform.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

let prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

interface FieldDefinitionSeed {
  name: string;
  label: string;
  description: string;
  fieldType: string;
  category: string;
  config?: object;
  validation?: object;
  sortOrder: number;
  specialPersonalInfo?: boolean;
  requiresExplicitConsent?: boolean;
}

`;

  // Generate each category
  for (const category of categories) {
    const fields = fieldsByCategory[category];
    const varName = `${category}Fields`;

    output += `// =============================================================================\n`;
    output += `// ${category.toUpperCase()} FIELDS\n`;
    output += `// =============================================================================\n\n`;
    output += `const ${varName}: FieldDefinitionSeed[] = [\n`;

    for (const field of fields) {
      output += `  {\n`;
      output += `    name: "${field.name}",\n`;
      output += `    label: "${escapeString(field.label)}",\n`;
      output += `    description: "${escapeString(field.description)}",\n`;
      output += `    fieldType: "${field.fieldType}",\n`;
      output += `    category: "${field.category}",\n`;

      if (field.config) {
        try {
          const config = JSON.parse(field.config);
          output += `    config: ${JSON.stringify(config, null, 6).replace(/\n/g, "\n    ")},\n`;
        } catch {
          output += `    config: null,\n`;
        }
      }

      if (field.validation) {
        try {
          const validation = JSON.parse(field.validation);
          output += `    validation: ${JSON.stringify(validation, null, 6).replace(/\n/g, "\n    ")},\n`;
        } catch {
          output += `    validation: null,\n`;
        }
      }

      output += `    sortOrder: ${field.sortOrder},\n`;

      if (field.specialPersonalInfo) {
        output += `    specialPersonalInfo: true,\n`;
      }

      if (field.requiresExplicitConsent) {
        output += `    requiresExplicitConsent: true,\n`;
      }

      output += `  },\n`;
    }

    output += `];\n\n`;
  }

  // Generate the seed function
  output += `// =============================================================================\n`;
  output += `// SEED FUNCTION\n`;
  output += `// =============================================================================\n\n`;
  output += `async function seedFields(externalPrisma?: PrismaClient) {\n`;
  output += `  console.log("Seeding field library...");\n\n`;
  output += `  const db = externalPrisma || getPrismaClient();\n\n`;
  output += `  const allFields: FieldDefinitionSeed[] = [\n`;

  for (const category of categories) {
    output += `    ...${category}Fields,\n`;
  }

  output += `  ];\n\n`;
  output += `  console.log(\`Total fields to seed: \${allFields.length}\`);\n\n`;
  output += `  let created = 0;\n`;
  output += `  let errors = 0;\n\n`;
  output += `  for (const field of allFields) {\n`;
  output += `    try {\n`;
  output += `      await db.fieldDefinition.upsert({\n`;
  output += `        where: { name: field.name },\n`;
  output += `        update: {\n`;
  output += `          label: field.label,\n`;
  output += `          description: field.description,\n`;
  output += `          fieldType: field.fieldType,\n`;
  output += `          category: field.category,\n`;
  output += `          config: field.config ? JSON.stringify(field.config) : null,\n`;
  output += `          validation: field.validation ? JSON.stringify(field.validation) : null,\n`;
  output += `          sortOrder: field.sortOrder,\n`;
  output += `          specialPersonalInfo: field.specialPersonalInfo || false,\n`;
  output += `          requiresExplicitConsent: field.requiresExplicitConsent || false,\n`;
  output += `        },\n`;
  output += `        create: {\n`;
  output += `          name: field.name,\n`;
  output += `          label: field.label,\n`;
  output += `          description: field.description,\n`;
  output += `          fieldType: field.fieldType,\n`;
  output += `          category: field.category,\n`;
  output += `          config: field.config ? JSON.stringify(field.config) : null,\n`;
  output += `          validation: field.validation ? JSON.stringify(field.validation) : null,\n`;
  output += `          sortOrder: field.sortOrder,\n`;
  output += `          specialPersonalInfo: field.specialPersonalInfo || false,\n`;
  output += `          requiresExplicitConsent: field.requiresExplicitConsent || false,\n`;
  output += `        },\n`;
  output += `      });\n`;
  output += `      created++;\n`;
  output += `    } catch (error) {\n`;
  output += `      console.error(\`Error seeding field \${field.name}:\`, error);\n`;
  output += `      errors++;\n`;
  output += `    }\n`;
  output += `  }\n\n`;
  output += `  console.log(\`Field library seeded: \${created} processed, \${errors} errors\`);\n`;
  output += `}\n\n`;
  output += `export { seedFields };\n\n`;
  output += `if (require.main === module) {\n`;
  output += `  seedFields()\n`;
  output += `    .catch((e) => {\n`;
  output += `      console.error(e);\n`;
  output += `      process.exit(1);\n`;
  output += `    })\n`;
  output += `    .finally(async () => {\n`;
  output += `      if (prisma) {\n`;
  output += `        await prisma.$disconnect();\n`;
  output += `      }\n`;
  output += `    });\n`;
  output += `}\n`;

  const outputPath = path.join(__dirname, "..", "prisma", "seed-fields-updated.ts");
  fs.writeFileSync(outputPath, output);
}

function generateTestFormSeedScript(form: FormTemplate) {
  let output = `/**
 * Test Form Template Seed Script (Auto-generated)
 *
 * Recreates the "${form.title}" form for testing.
 * Run with: npx tsx prisma/seed-test-form.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const FORM_CONFIG = {
  title: "${escapeString(form.title)}",
  description: ${form.description ? `"${escapeString(form.description)}"` : "null"},
  consentClause: ${form.consentClause ? `\`${form.consentClause.replace(/`/g, "\\`")}\`` : "null"},
};

// Form fields configuration - maps field names to their form-specific settings
const FORM_FIELDS = [
`;

  for (const field of form.fields) {
    output += `  {\n`;
    output += `    fieldName: "${field.fieldDefinition.name}",\n`;
    if (field.labelOverride) {
      output += `    labelOverride: "${escapeString(field.labelOverride)}",\n`;
    }
    if (field.helpText) {
      output += `    helpText: "${escapeString(field.helpText)}",\n`;
    }
    output += `    isRequired: ${field.isRequired},\n`;
    output += `    sortOrder: ${field.sortOrder},\n`;
    output += `    section: ${field.section ? `"${escapeString(field.section)}"` : "null"},\n`;
    output += `    columnSpan: ${field.columnSpan},\n`;
    if (field.visibilityRules) {
      output += `    visibilityRules: ${JSON.stringify(field.visibilityRules)},\n`;
    }
    output += `  },\n`;
  }

  output += `];

async function seedTestForm() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Find the test organization (or the first provider organization)
    const org = await prisma.organization.findFirst({
      where: { status: "approved" },
      orderBy: { createdAt: "asc" },
    });

    if (!org) {
      console.error("No approved organization found. Please create one first.");
      process.exit(1);
    }

    console.log(\`Using organization: \${org.name} (\${org.slug})\`);

    // Check if form already exists
    const existingForm = await prisma.formTemplate.findFirst({
      where: {
        organizationId: org.id,
        title: FORM_CONFIG.title,
      },
    });

    if (existingForm) {
      console.log("Form already exists. Deleting and recreating...");
      // Delete existing form fields first
      await prisma.formField.deleteMany({
        where: { formTemplateId: existingForm.id },
      });
      await prisma.formTemplate.delete({
        where: { id: existingForm.id },
      });
    }

    // Get all field definitions we need
    const fieldNames = FORM_FIELDS.map(f => f.fieldName);
    const fieldDefs = await prisma.fieldDefinition.findMany({
      where: { name: { in: fieldNames } },
    });

    const fieldDefMap = new Map(fieldDefs.map(f => [f.name, f]));

    // Check for missing fields
    const missingFields = fieldNames.filter(name => !fieldDefMap.has(name));
    if (missingFields.length > 0) {
      console.warn(\`Warning: Missing field definitions: \${missingFields.join(", ")}\`);
      console.warn("Run the field seed script first: npx tsx prisma/seed-fields.ts");
    }

    // Create the form template with all fields
    const form = await prisma.formTemplate.create({
      data: {
        organizationId: org.id,
        title: FORM_CONFIG.title,
        description: FORM_CONFIG.description,
        consentClause: FORM_CONFIG.consentClause,
        isActive: true,
        version: 1,
        fields: {
          create: FORM_FIELDS
            .filter(f => fieldDefMap.has(f.fieldName))
            .map(f => ({
              fieldDefinitionId: fieldDefMap.get(f.fieldName)!.id,
              labelOverride: f.labelOverride || null,
              helpText: f.helpText || null,
              isRequired: f.isRequired,
              sortOrder: f.sortOrder,
              section: f.section,
              columnSpan: f.columnSpan,
              visibilityRules: f.visibilityRules || null,
            })),
        },
      },
      include: {
        fields: true,
      },
    });

    console.log(\`\\nCreated form template: \${form.title}\`);
    console.log(\`  ID: \${form.id}\`);
    console.log(\`  Fields: \${form.fields.length}\`);

    // Create a QR code for the form
    const shortCode = \`test-\${Date.now().toString(36)}\`;
    const qr = await prisma.qRCode.create({
      data: {
        formTemplateId: form.id,
        shortCode,
        label: "Test QR Code",
        isActive: true,
      },
    });

    console.log(\`\\nCreated QR code: \${qr.shortCode}\`);
    console.log(\`  URL: http://localhost:3000/c/\${qr.shortCode}\`);

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedTestForm().catch((e) => {
  console.error(e);
  process.exit(1);
});
`;

  const outputPath = path.join(__dirname, "..", "prisma", "seed-test-form.ts");
  fs.writeFileSync(outputPath, output);
}

main().catch(console.error);
