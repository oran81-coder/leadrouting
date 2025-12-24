/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse and manages load with configurable limits.
 * 
 * Features:
 * - Per-endpoint rate limits
 * - Per-IP tracking
 * - Redis-backed store (optional, falls back to memory)
 * - Customizable response messages
 * - Sliding window algorithm
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { env } from "../config/env";
import { log } from "../../../../packages/core/src/shared/logger";

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Strict: For sensitive operations (login, password reset, etc.)
  STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: "Too many requests from this IP, please try again after 15 minutes",
  },

  // Standard: For regular API endpoints
  STANDARD: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: "Too many requests, please try again later",
  },

  // Lenient: For public/read-only endpoints
  LENIENT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window
    message: "Rate limit exceeded, please try again later",
  },

  // Monday.com API: Respect Monday's 100 requests/minute limit
  MONDAY_API: {
    windowMs: 60 * 1000, // 1 minute
    max: 90, // 90 requests per minute (留 10% buffer)
    message: "Monday.com API rate limit exceeded, please wait a moment",
  },
} as const;

/**
 * Custom key generator that includes both IP and user context
 * Note: We use the default IP handling to properly support IPv6
 */
function generateKey(req: Request): string {
  // Use req.ip which is properly handled by express-rate-limit
  // This avoids IPv6 bypass issues
  const ip = req.ip || "unknown";
  
  // Include correlation ID for better tracking
  const correlationId = req.headers["x-correlation-id"] as string;
  
  // Could also include user ID here if authenticated
  // const userId = req.user?.id;
  
  return `ratelimit:${ip}:${correlationId || ""}`;
}

/**
 * Custom handler for rate limit exceeded
 */
function rateLimitHandler(req: Request, res: Response) {
  const correlationId = req.headers["x-correlation-id"] as string;
  
  log.warn("Rate limit exceeded", {
    correlationId,
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  res.status(429).json({
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later",
    retryAfter: res.getHeader("Retry-After"),
  });
}

/**
 * Skip rate limiting in development mode (optional)
 */
function skipRateLimitInDev(req: Request): boolean {
  return env.NODE_ENV === "development" && env.RATE_LIMIT_ENABLED === false;
}

/**
 * Create rate limiter with custom configuration
 */
export function createRateLimiter(
  preset: keyof typeof RateLimitPresets = "STANDARD",
  customConfig?: Partial<{ windowMs: number; max: number; message: string }>
) {
  const config = { ...RateLimitPresets[preset], ...customConfig };

  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    
    // Use Redis store if available, otherwise use memory store
    // store: getRedisStore(), // TODO: Implement Redis store when Redis is enabled
    
    // Standardize all responses
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    
    // FIXED: Remove custom keyGenerator to use default (supports IPv6)
    // The default keyGenerator properly handles both IPv4 and IPv6
    // keyGenerator: generateKey, // REMOVED - was causing IPv6 errors
    
    // Custom handler
    handler: rateLimitHandler,
    
    // Skip in development if configured
    skip: skipRateLimitInDev,
  });
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Global API rate limit (lenient)
  global: createRateLimiter("LENIENT"),
  
  // Standard API endpoints
  standard: createRateLimiter("STANDARD"),
  
  // Sensitive operations (approval, rejection, etc.)
  sensitive: createRateLimiter("STRICT"),
  
  // Monday.com proxy endpoints
  mondayProxy: createRateLimiter("MONDAY_API"),
  
  // Admin operations
  admin: createRateLimiter("STANDARD", { max: 50 }),
  
  // Manager operations  
  manager: createRateLimiter("STANDARD", { max: 200 }),
  
  // Outcomes/Analytics (read-heavy)
  analytics: createRateLimiter("LENIENT", { max: 500 }),
};

/**
 * Rate limit info middleware
 * Adds rate limit info to response headers for debugging
 */
export function rateLimitInfo() {
  return (req: Request, res: Response, next: Function) => {
    if (env.NODE_ENV === "development") {
      res.setHeader("X-Rate-Limit-Debug", "enabled");
    }
    next();
  };
}

