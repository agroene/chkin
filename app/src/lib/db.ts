import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Get the PostgreSQL adapter for Prisma 7
 * Uses the official @prisma/adapter-pg package
 */
export function getPostgresAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  return new PrismaPg(pool);
}
