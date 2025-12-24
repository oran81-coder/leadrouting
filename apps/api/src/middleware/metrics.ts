import { Request, Response, NextFunction } from "express";
import { trackHttpRequest } from "../metrics/prometheus";

/**
 * HTTP Request Metrics Middleware
 * 
 * Tracks all HTTP requests with method, path, status code, and duration.
 * Should be mounted early in the middleware chain.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Capture the response finish event
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const path = req.route?.path || req.path || "unknown";
    
    trackHttpRequest(req.method, path, res.statusCode, duration);
  });

  next();
}

