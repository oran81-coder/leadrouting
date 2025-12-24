import { Router } from "express";
import { checkDatabaseHealth, getDatabaseMetrics } from "../../../../packages/core/src/db/prisma";
import { getRedisStatus } from "../../../../packages/core/src/cache/redis.client";
import { MondayClient } from "../../../../packages/modules/monday-integration/src/infrastructure/monday.client";
import { env } from "../config/env";

/**
 * Health Check Routes
 * 
 * GET /health - Basic health check (returns 200 OK if API is running)
 * GET /health/readiness - Readiness probe (checks DB connectivity)
 * GET /health/liveness - Liveness probe (always returns OK if process is alive)
 * GET /health/detailed - Detailed health status with all dependencies
 */
export function healthRoutes() {
  const r = Router();

  /**
   * Basic health check - just confirms API is running
   */
  r.get("/", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  /**
   * Liveness probe for Kubernetes
   * Returns 200 if process is alive (doesn't check dependencies)
   */
  r.get("/liveness", (_req, res) => {
    res.json({
      ok: true,
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Readiness probe for Kubernetes
   * Returns 200 only if all critical dependencies are healthy
   */
  r.get("/readiness", async (_req, res) => {
    const dbHealthy = await checkDatabaseHealth();

    if (!dbHealthy) {
      return res.status(503).json({
        ok: false,
        status: "not_ready",
        reason: "Database connection failed",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      ok: true,
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Detailed health status with all dependencies
   * Useful for monitoring dashboards
   */
  r.get("/detailed", async (_req, res) => {
    const startTime = Date.now();

    // Check database
    const dbHealthy = await checkDatabaseHealth();
    const dbMetrics = await getDatabaseMetrics();

    // Check Redis (non-critical)
    const redisStatus = getRedisStatus();

    // Check Monday.com API (if configured)
    let mondayStatus: { status: string; connected: boolean; configured: boolean; error?: string } = {
      status: "not_configured",
      connected: false,
      configured: false,
    };

    try {
      const useMock = env.MONDAY_USE_MOCK;
      const mondayToken = env.MONDAY_API_TOKEN;
      const mondayEndpoint = env.MONDAY_API_ENDPOINT;

      if (useMock || (mondayToken && mondayToken.length > 0)) {
        mondayStatus.configured = true;
        
        if (useMock) {
          mondayStatus.status = "mock_mode";
          mondayStatus.connected = true;
        } else {
          // Attempt a lightweight query to check connectivity
          const client = new MondayClient(mondayToken!, mondayEndpoint);
          try {
            // Simple query to check if API is reachable
            await client.query("{ me { id } }");
            mondayStatus.status = "healthy";
            mondayStatus.connected = true;
          } catch (err: any) {
            mondayStatus.status = "unhealthy";
            mondayStatus.connected = false;
            mondayStatus.error = err?.message || "Connection failed";
          }
        }
      }
    } catch (err: any) {
      mondayStatus.status = "error";
      mondayStatus.error = err?.message || "Unknown error";
    }

    const duration = Date.now() - startTime;

    // System is healthy if DB is up (Monday.com is not critical for readiness)
    const isHealthy = dbHealthy;

    const health = {
      ok: isHealthy,
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checkDuration: `${duration}ms`,
      environment: env.NODE_ENV,
      dependencies: {
        database: {
          status: dbHealthy ? "healthy" : "unhealthy",
          connected: dbMetrics.isConnected,
          type: "sqlite", // Update when migrating to PostgreSQL
        },
        cache: {
          status: redisStatus.connected ? "healthy" : "unavailable",
          enabled: redisStatus.enabled,
          connected: redisStatus.connected,
          type: redisStatus.enabled ? "redis" : "none",
          note: redisStatus.enabled ? undefined : "Cache disabled - using direct DB queries",
        },
        mondayApi: {
          status: mondayStatus.status,
          configured: mondayStatus.configured,
          connected: mondayStatus.connected,
          error: mondayStatus.error,
          note: !mondayStatus.configured ? "Monday.com API not configured" : undefined,
        },
      },
      version: {
        api: "1.0.0", // TODO: read from package.json
        node: process.version,
      },
    };

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  });

  return r;
}
