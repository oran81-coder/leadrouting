import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../../../packages/core/src/shared/errors";

/**
 * Centralized error handler.
 * NOTE: Keep responses explicit & actionable (per PRD).
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.code, message: err.message, details: err.details ?? null });
  }

  // default
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unexpected error" });
}
