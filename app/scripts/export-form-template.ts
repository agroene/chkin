/**
 * Export Form Template Script
 *
 * Exports complete form template configuration for seed script creation.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Get all form templates with full field configuration
    const forms = await prisma.formTemplate.findMany({
      include: {
        fields: {
          include: {
            fieldDefinition: true
          },
          orderBy: { sortOrder: "asc" }
        },
        organization: {
          select: { name: true, slug: true }
        }
      }
    });

    console.log("=== FORM TEMPLATES ===\n");
    console.log(JSON.stringify(forms, null, 2));

    // Also get all field definitions for the seed script
    const fieldDefs = await prisma.fieldDefinition.findMany({
      orderBy: [
        { category: "asc" },
        { sortOrder: "asc" }
      ]
    });

    console.log("\n\n=== ALL FIELD DEFINITIONS ===\n");
    console.log(JSON.stringify(fieldDefs, null, 2));

  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
