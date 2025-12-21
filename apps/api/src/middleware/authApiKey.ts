import type { Request, Response, NextFunction } from "express";
import { optionalEnv } from "../config/env";

/**
 * Phase 1 minimal auth:
 * - If ROUTING_API_KEY is set, require `x-api-key` header to match.
 * - If not set, auth is disabled (local dev convenience).
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = optionalEnv("ROUTING_API_KEY", "");
  if (!expected) return next();

  const provided = String(req.headers["x-api-key"] ?? "");
  if (!provided || provided !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  return next();
}
