import { PrismaClient } from "@prisma/client";
import { env } from "../../../../apps/api/src/config/env";

/**
 * Global Prisma Client instance with connection pooling configuration.
 * 
 * Connection Pool Settings (Production-ready):
 * - connection_limit: Maximum number of database connections (default: 10 per instance)
 * - pool_timeout: Timeout for acquiring a connection from the pool (default: 10s)
 * - For SQLite: connection_limit is ignored, but we keep the pattern for future DB migrations
 * 
 * Performance Considerations:
 * - In production with PostgreSQL/MySQL, adjust connection_limit based on:
 *   - Number of API instances
 *   - Database server connection limits
 *   - Expected concurrent request load
 * - Formula: total_connections = instances × connection_limit
 * - Ensure: total_connections < database_max_connections - buffer_for_admin
 */

let prisma: PrismaClient | null = null;

/**
 * Get or create a singleton Prisma Client instance.
 * Configured with appropriate settings for production use.
 */
export function getPrisma(): PrismaClient {
  if (prisma) return prisma;

  // Connection pool configuration
  const datasourceUrl = env.DATABASE_URL;
  
  // For SQLite (current setup), connection pooling is not applicable
  // For future PostgreSQL/MySQL migration, add pool parameters:
  // const pooledUrl = `${datasourceUrl}?connection_limit=10&pool_timeout=10`;
  
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: datasourceUrl,
      },
    },
    log: env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
    errorFormat: env.NODE_ENV === "development" ? "pretty" : "minimal",
  });

  // Graceful shutdown handling
  if (env.NODE_ENV === "production") {
    const shutdown = async () => {
      if (prisma) {
        await prisma.$disconnect();
        prisma = null;
      }
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    process.on("beforeExit", shutdown);
  }

  return prisma;
}

/**
 * Manually disconnect Prisma Client (useful for tests).
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Health check: verify database connectivity.
 * Returns true if connection is healthy, false otherwise.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrisma();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[Prisma Health Check] Failed:", error);
    return false;
  }
}

/**
 * Get database connection metrics (for monitoring).
 * Note: SQLite doesn't expose connection pool metrics.
 * This will be useful when migrating to PostgreSQL/MySQL.
 */
export async function getDatabaseMetrics(): Promise<{
  isConnected: boolean;
  activeConnections?: number;
  idleConnections?: number;
}> {
  const isConnected = await checkDatabaseHealth();
  
  return {
    isConnected,
    // For future: query pg_stat_activity or MySQL's information_schema
    activeConnections: undefined,
    idleConnections: undefined,
  };
}
