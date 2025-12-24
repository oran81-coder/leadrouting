import { Request, Response, NextFunction } from "express";
import { log, setCorrelationId, generateCorrelationId } from "../../../../packages/core/src/shared/logger";

/**
 * Express middleware for request logging with correlation IDs
 * 
 * Features:
 * - Generates unique correlation ID per request
 * - Logs incoming requests
 * - Logs response status and duration
 * - Adds correlation ID to response headers for client tracing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate or use existing correlation ID
  const correlationId = (req.headers["x-correlation-id"] as string) || generateCorrelationId();
  setCorrelationId(correlationId);

  // Add correlation ID to response headers
  res.setHeader("X-Correlation-Id", correlationId);

  // Track request start time
  const startTime = Date.now();

  // Log incoming request
  log.info("Incoming request", {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const duration = Date.now() - startTime;
    
    // Log response
    if (res.statusCode >= 500) {
      log.error("Request failed", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    } else if (res.statusCode >= 400) {
      log.warn("Request error", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    } else {
      log.info("Request completed", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
      });
    }

    return originalJson(body);
  };

  // Handle response completion for non-JSON responses
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    
    // Only log if not already logged by res.json override
    if (!res.headersSent || res.getHeader("Content-Type")?.toString().includes("json") === false) {
      if (res.statusCode >= 500) {
        log.error("Request failed", {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        });
      } else if (res.statusCode >= 400) {
        log.warn("Request error", {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        });
      } else {
        log.debug("Request completed", {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        });
      }
    }
  });

  next();
}

