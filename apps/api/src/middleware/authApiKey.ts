import type { Request, Response, NextFunction } from "express";
import { optionalEnv } from "../config/env";
import { verifyToken } from "../../../../packages/core/src/auth/jwt.utils";

/**
 * Phase 5.1: Updated to support both API Key and JWT authentication
 * - If ROUTING_API_KEY is set, require either `x-api-key` header OR valid JWT token
 * - If not set, auth is disabled (local dev convenience)
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = optionalEnv("ROUTING_API_KEY", "");
  if (!expected) return next();

  // Check if JWT token is provided and valid
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken(token);
      if (payload) {
        // Valid JWT - allow access
        return next();
      }
    } catch (err) {
      // Invalid JWT - fall through to API key check
    }
  }

  // Check API key
  const provided = String(req.headers["x-api-key"] ?? "");
  if (!provided || provided !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  return next();
}
