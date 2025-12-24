import { getRedisClient, isRedisHealthy } from "./redis.client";
import { env } from "../../../../apps/api/src/config/env";
import { log } from "../shared/logger";

/**
 * Generic Cache Service with graceful fallback.
 * 
 * Usage:
 * ```typescript
 * const cached = await CacheService.get<User>("user:123");
 * if (!cached) {
 *   const user = await db.user.findUnique({ where: { id: "123" } });
 *   await CacheService.set("user:123", user, 300); // TTL 5 minutes
 * }
 * ```
 * 
 * Key Naming Conventions:
 * - user:{userId} - User cache
 * - agent_metrics:{orgId}:{agentId}:{windowDays} - Agent metrics
 * - routing_state:{orgId} - Routing state
 * - monday_board:{boardId} - Monday board metadata
 * - field_mapping:{orgId}:{version} - Field mapping config
 */

export class CacheService {
  /**
   * Get value from cache.
   * Returns null if key doesn't exist or Redis is unavailable.
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisHealthy()) {
      return null;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return null;

      const value = await redis.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      log.warn("Cache get failed - returning null", { key, error });
      return null;
    }
  }

  /**
   * Set value in cache with TTL.
   * Silently fails if Redis is unavailable (graceful degradation).
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!isRedisHealthy()) {
      return;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return;

      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? env.CACHE_TTL_SECONDS;

      if (ttl > 0) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      log.warn("Cache set failed - continuing without cache", { key, error });
    }
  }

  /**
   * Delete key from cache.
   */
  static async del(key: string): Promise<void> {
    if (!isRedisHealthy()) {
      return;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return;

      await redis.del(key);
    } catch (error) {
      log.warn("Cache delete failed", { key, error });
    }
  }

  /**
   * Delete multiple keys matching a pattern.
   * Use with caution - can be slow on large datasets.
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!isRedisHealthy()) {
      return;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return;

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      log.warn("Cache pattern delete failed", { pattern, error });
    }
  }

  /**
   * Check if key exists in cache.
   */
  static async exists(key: string): Promise<boolean> {
    if (!isRedisHealthy()) {
      return false;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return false;

      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      log.warn("Cache exists check failed", { key, error });
      return false;
    }
  }

  /**
   * Get remaining TTL for a key (in seconds).
   * Returns -1 if key doesn't exist, -2 if no TTL.
   */
  static async ttl(key: string): Promise<number> {
    if (!isRedisHealthy()) {
      return -1;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return -1;

      return await redis.ttl(key);
    } catch (error) {
      log.warn("Cache TTL check failed", { key, error });
      return -1;
    }
  }

  /**
   * Increment counter (useful for rate limiting).
   */
  static async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!isRedisHealthy()) {
      return 0;
    }

    try {
      const redis = getRedisClient();
      if (!redis) return 0;

      const value = await redis.incr(key);
      
      if (ttlSeconds && value === 1) {
        // Set TTL only on first increment
        await redis.expire(key, ttlSeconds);
      }

      return value;
    } catch (error) {
      log.warn("Cache increment failed", { key, error });
      return 0;
    }
  }

  /**
   * Cache wrapper: get from cache or compute and store.
   * 
   * @param key Cache key
   * @param fetchFn Function to fetch data if not in cache
   * @param ttlSeconds TTL in seconds
   * @returns Cached or freshly fetched data
   */
  static async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch and store
    const fresh = await fetchFn();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}

/**
 * Predefined cache key builders for common use cases.
 */
export const CacheKeys = {
  // User cache
  mondayUser: (orgId: string, userId: string) => `monday_user:${orgId}:${userId}`,
  mondayUsers: (orgId: string) => `monday_users:${orgId}`,

  // Agent metrics
  agentMetrics: (orgId: string, agentId: string, windowDays: number) =>
    `agent_metrics:${orgId}:${agentId}:${windowDays}`,
  allAgentMetrics: (orgId: string) => `agent_metrics:${orgId}:*`,

  // Routing configuration
  routingState: (orgId: string) => `routing_state:${orgId}`,
  routingSettings: (orgId: string) => `routing_settings:${orgId}`,
  fieldMapping: (orgId: string, version: number) => `field_mapping:${orgId}:${version}`,
  ruleSet: (orgId: string, version: number) => `ruleset:${orgId}:${version}`,

  // Monday.com metadata (long TTL)
  mondayBoard: (boardId: string) => `monday_board:${boardId}`,
  mondayBoardColumns: (boardId: string) => `monday_board_columns:${boardId}`,

  // Metrics config
  metricsConfig: (orgId: string) => `metrics_config:${orgId}`,
};

/**
 * Predefined TTL values (in seconds).
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute - frequently changing data
  MEDIUM: 300, // 5 minutes - semi-static data
  LONG: 1800, // 30 minutes - mostly static data
  VERY_LONG: 3600, // 1 hour - static metadata
  DAY: 86400, // 24 hours - rarely changing data
};

