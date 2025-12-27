import { z } from "zod";

/**
 * Environment variable schema with Zod validation
 * Fails fast on missing or invalid required variables
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(["development", "staging", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default("3000"),
  
  // Database
  DATABASE_URL: z.string().url().default("file:./prisma/dev.db"),
  
  // Security
  ENCRYPTION_KEY: z.string().length(32, "ENCRYPTION_KEY must be exactly 32 characters"),
  
  // Monday.com Integration
  MONDAY_API_TOKEN: z.string().optional(),
  MONDAY_API_ENDPOINT: z.string().url().default("https://api.monday.com/v2"),
  MONDAY_API_VERSION: z.string().default("2024-10"),
  MONDAY_USE_MOCK: z.string().transform((val) => val === "true").default("false"),
  
  // Monday.com OAuth (for organization registration)
  MONDAY_OAUTH_CLIENT_ID: z.string().optional(),
  MONDAY_OAUTH_CLIENT_SECRET: z.string().optional(),
  MONDAY_OAUTH_REDIRECT_URI: z.string().url().optional(),
  
  // Metrics Job Configuration
  METRICS_JOB_ENABLED: z.string().transform((val) => val === "true").default("true"),
  METRICS_JOB_INTERVAL_SECONDS: z.string().transform(Number).pipe(z.number().int().positive()).default("3600"),
  METRICS_FETCH_LIMIT_PER_BOARD: z.string().transform(Number).pipe(z.number().int().positive()).default("100"),
  
  // Industry Change Poller
  INDUSTRY_POLLER_ENABLED: z.string().transform((val) => val === "true").default("false"),
  INDUSTRY_POLLER_INTERVAL_SECONDS: z.string().transform(Number).pipe(z.number().int().positive()).default("300"),
  
  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),
  
  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("pretty"),
  
  // Redis Cache (Optional - improves performance)
  REDIS_URL: z.string().optional(),
  REDIS_ENABLED: z.string().transform((val) => val === "true").default("false"),
  CACHE_TTL_SECONDS: z.string().transform(Number).pipe(z.number().int().positive()).default("300"),
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform((val) => val === "true").default("true"),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default("900000"), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default("100"),

  // Authentication & Authorization (Phase 5.1)
  AUTH_ENABLED: z.string().transform((val) => val === "true").default("false"), // Default false for backward compatibility
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").default("change-me-in-production-min-32-chars-required-for-security"),
  JWT_EXPIRATION: z.string().default("1h"), // Access token: 1 hour
  JWT_REFRESH_EXPIRATION: z.string().default("7d"), // Refresh token: 7 days
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().int().min(10).max(15)).default("10"),
  
  // Webhooks (Phase 2 - Real-time Integration)
  PUBLIC_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
});

/**
 * Parsed and validated environment variables
 * Throws error if validation fails
 */
export const env = envSchema.parse(process.env);

/**
 * Type-safe environment config
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Helper function for optional environment variables (backward compatibility)
 * @deprecated Use env object instead
 */
export function optionalEnv(key: string, fallback: string): string {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") return fallback;
  return String(v);
}

/**
 * Helper function for required environment variables (backward compatibility)
 * @deprecated Use env object instead - validation happens at startup
 */
export function requireEnv(key: string): string {
  const v = process.env[key];
  if (v == null || String(v).trim() === "") throw new Error(`Missing required env: ${key}`);
  return String(v);
}

/**
 * Validate environment on module load
 * Fail fast if configuration is invalid
 */
try {
  envSchema.parse(process.env);
  if (env.NODE_ENV !== "test") {
    console.log(`✅ Environment validated successfully (${env.NODE_ENV})`);
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Environment validation failed:");
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}
