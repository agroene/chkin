/**
 * Database Module
 *
 * Single source of truth for database connections.
 * Uses Prisma 7 with PostgreSQL adapter.
 *
 * @module lib/db
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Connection pool configuration
const POOL_CONFIG = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
} as const;

// Singleton storage
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __pool: Pool | undefined;
}

/**
 * Get or create the PostgreSQL connection pool.
 * Reuses existing pool in development to prevent connection exhaustion.
 */
function getPool(): Pool {
  if (global.__pool) {
    return global.__pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString,
    ...POOL_CONFIG,
  });

  // Store in global for reuse in development
  if (process.env.NODE_ENV !== "production") {
    global.__pool = pool;
  }

  return pool;
}

/**
 * Get or create the PrismaClient instance.
 * Uses singleton pattern to prevent multiple instances during hot reload.
 */
export function getPrismaClient(): PrismaClient {
  if (global.__prisma) {
    return global.__prisma;
  }

  const pool = getPool();
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

  // Store in global for reuse in development
  if (process.env.NODE_ENV !== "production") {
    global.__prisma = client;
  }

  return client;
}

/**
 * Prisma client instance.
 * Lazily initialized on first access.
 */
export const prisma = getPrismaClient();
