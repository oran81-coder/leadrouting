import winston from "winston";
import { env } from "../../../../apps/api/src/config/env";

/**
 * Correlation ID for request tracing
 * Stored in AsyncLocalStorage for automatic propagation
 */
export let currentCorrelationId: string | null = null;

/**
 * Set correlation ID for current context
 */
export function setCorrelationId(id: string): void {
  currentCorrelationId = id;
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string | null {
  return currentCorrelationId;
}

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Custom format that includes correlation ID
 */
const correlationFormat = winston.format((info) => {
  if (currentCorrelationId) {
    info.correlationId = currentCorrelationId;
  }
  return info;
});

/**
 * Pretty format for development (colorized and readable)
 */
const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  correlationFormat(),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    let log = `${timestamp} [${level}]`;
    
    if (correlationId) {
      log += ` [${correlationId}]`;
    }
    
    log += `: ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => key !== 'stack');
    if (metaKeys.length > 0) {
      const metaObj: Record<string, any> = {};
      metaKeys.forEach(key => metaObj[key] = meta[key]);
      log += ` ${JSON.stringify(metaObj)}`;
    }
    
    // Add stack trace if present
    if (meta.stack) {
      log += `\n${meta.stack}`;
    }
    
    return log;
  })
);

/**
 * JSON format for production (machine-readable, parseable)
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  correlationFormat(),
  winston.format.json()
);

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.LOG_FORMAT === "json" ? jsonFormat : prettyFormat,
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

/**
 * Log levels for type safety
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Structured logging interface
 */
export interface LogMeta {
  [key: string]: any;
}

/**
 * Type-safe logging functions
 */
export const log = {
  /**
   * Log error message (level: error)
   */
  error(message: string, meta?: LogMeta): void {
    logger.error(message, meta);
  },

  /**
   * Log warning message (level: warn)
   */
  warn(message: string, meta?: LogMeta): void {
    logger.warn(message, meta);
  },

  /**
   * Log info message (level: info)
   */
  info(message: string, meta?: LogMeta): void {
    logger.info(message, meta);
  },

  /**
   * Log debug message (level: debug)
   */
  debug(message: string, meta?: LogMeta): void {
    logger.debug(message, meta);
  },

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, meta?: LogMeta): void {
    logger.log(level, message, meta);
  },
};

/**
 * Export logger instance for direct use if needed
 */
export default logger;

