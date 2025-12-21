import type { Request, Response, NextFunction } from "express";

/**
 * Placeholder auth middleware.
 * Phase 1 requires JWT + role-based access control (implemented later).
 */
export function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  return next();
}
