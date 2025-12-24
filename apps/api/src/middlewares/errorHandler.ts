import type { Request, Response, NextFunction } from "express";
import { log, getCorrelationId } from "../../../../packages/core/src/shared/logger";
import { isAppError, toAppError, ErrorCode } from "../../../../packages/core/src/shared/errors";
import { env } from "../config/env";
import { ZodError } from "zod";

/**
 * Centralized error handler middleware
 * Handles all errors and converts them to standardized JSON responses
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const correlationId = getCorrelationId();

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationErrors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    log.warn("Validation error", {
      path: req.path,
      method: req.method,
      errors: validationErrors,
      correlationId,
    });

    return res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_FAILED,
        message: "Validation failed",
        details: {
          errors: validationErrors,
        },
      },
      correlationId,
    });
  }

  // Handle Prisma errors
  if (err?.code && err?.meta) {
    log.error("Database error", {
      path: req.path,
      method: req.method,
      code: err.code,
      meta: err.meta,
      correlationId,
    });

    return res.status(500).json({
      error: {
        code: ErrorCode.DATABASE_ERROR,
        message: "Database operation failed",
        details: env.NODE_ENV === "development" ? { code: err.code, meta: err.meta } : undefined,
      },
      correlationId,
    });
  }

  // Convert to AppError
  const appError = isAppError(err) ? err : toAppError(err);

  // Log the error
  if (appError.statusCode >= 500) {
    log.error("Server error", {
      path: req.path,
      method: req.method,
      code: appError.code,
      message: appError.message,
      stack: appError.stack,
      details: appError.details,
      correlationId,
    });
  } else if (appError.statusCode >= 400) {
    log.warn("Client error", {
      path: req.path,
      method: req.method,
      code: appError.code,
      message: appError.message,
      details: appError.details,
      correlationId,
    });
  }

  // Send error response
  const responseBody: any = {
    error: {
      code: appError.code,
      message: appError.message,
    },
    correlationId,
  };

  // Include details in response (in development or for client errors)
  if (appError.details && (env.NODE_ENV === "development" || appError.statusCode < 500)) {
    responseBody.error.details = appError.details;
  }

  // Include stack trace only in development for 500 errors
  if (env.NODE_ENV === "development" && appError.statusCode >= 500) {
    responseBody.error.stack = appError.stack;
  }

  return res.status(appError.statusCode).json(responseBody);
}
