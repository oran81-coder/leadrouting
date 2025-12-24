import Redis, { RedisOptions } from "ioredis";
import { env } from "../../../../apps/api/src/config/env";
import { log } from "../shared/logger";

/**
 * Redis Client Wrapper with graceful fallback.
 * 
 * Features:
 * - Singleton pattern for connection reuse
 * - Automatic reconnection with exponential backoff
 * - Graceful degradation when Redis is unavailable
 * - Health monitoring
 * 
 * Performance Benefits:
 * - Cache Monday.com metadata (boards, columns) - reduces API calls
 * - Cache agent metrics snapshots - reduces DB queries
 * - Cache routing state - reduces config lookups
 * 
 * TTL Strategy:
 * - Short TTL (1-5 min): Frequently changing data (metrics, proposals)
 * - Medium TTL (10-30 min): Semi-static data (user cache, routing state)
 * - Long TTL (1-24 hours): Static metadata (boards, field mappings)
 */

let redisClient: Redis | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client with connection options.
 */
export function getRedisClient(): Redis | null {
  if (!env.REDIS_ENABLED || !env.REDIS_URL) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const options: RedisOptions = {
      // Connection
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000); // Max 2 seconds
        return delay;
      },
      
      // Performance
      enableReadyCheck: true,
      lazyConnect: false,
      
      // Connection pool
      keepAlive: 30000, // 30 seconds
      
      // Timeouts
      connectTimeout: 5000, // 5 seconds
      commandTimeout: 3000, // 3 seconds
    };

    redisClient = new Redis(env.REDIS_URL, options);

    redisClient.on("connect", () => {
      log.info("Redis client connected");
      isRedisAvailable = true;
    });

    redisClient.on("ready", () => {
      log.info("Redis client ready");
      isRedisAvailable = true;
    });

    redisClient.on("error", (error) => {
      log.warn("Redis client error - falling back to no-cache mode", { error: error.message });
      isRedisAvailable = false;
    });

    redisClient.on("close", () => {
      log.info("Redis connection closed");
      isRedisAvailable = false;
    });

    redisClient.on("reconnecting", () => {
      log.info("Redis client reconnecting...");
    });

    // Graceful shutdown
    const shutdown = async () => {
      if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        isRedisAvailable = false;
      }
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    return redisClient;
  } catch (error) {
    log.error("Failed to initialize Redis client", { error });
    return null;
  }
}

/**
 * Check if Redis is available and healthy.
 */
export function isRedisHealthy(): boolean {
  return isRedisAvailable && redisClient !== null && redisClient.status === "ready";
}

/**
 * Safely disconnect Redis client.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}

/**
 * Get Redis connection status for health checks.
 */
export function getRedisStatus(): {
  enabled: boolean;
  connected: boolean;
  status: string | null;
} {
  return {
    enabled: env.REDIS_ENABLED,
    connected: isRedisAvailable,
    status: redisClient?.status ?? null,
  };
}

