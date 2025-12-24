import express from "express";
import { registerRoutes } from "./routes";
import { cors } from "./middleware/cors";
import { requestLogger } from "./middleware/requestLogger";
import { securityHeaders, sanitizeInput } from "./middleware/security";
import { errorHandler } from "./middlewares/errorHandler";
import { rateLimiters, rateLimitInfo } from "./middleware/rateLimit";
import { metricsMiddleware } from "./middleware/metrics";

export function createServer() {
  const app = express();

  // Security headers (first)
  app.use(securityHeaders);

  // Request logging with correlation IDs
  app.use(requestLogger);
  
  // Metrics tracking (after logging, before routes)
  app.use(metricsMiddleware);
  
  // Global rate limiting (after logging, before routes)
  app.use(rateLimiters.global);
  app.use(rateLimitInfo());

  // CORS
  app.use(cors);

  // Body parsing
  app.use(express.json());

  // Input sanitization (after body parsing)
  app.use(sanitizeInput);

  // Routes
  registerRoutes(app);

  // Centralized error handler (last)
  app.use(errorHandler);

  return app;
}
