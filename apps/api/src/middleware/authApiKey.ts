import type { Request, Response, NextFunction } from "express";
import { optionalEnv } from "../config/env";
import { verifyToken } from "../../../../packages/core/src/auth/jwt.utils";

/**
 * Phase 5.1: Updated to support both API Key and JWT authentication
 * - If ROUTING_API_KEY is set, require either `x-api-key` header OR valid JWT token
 * - If not set, still try to populate req.user from JWT for authenticated routes
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const expected = optionalEnv("ROUTING_API_KEY", "");
  
  // Always try to populate req.user from JWT if present
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const payload = verifyToken(token);
      if (payload) {
        // Valid JWT - attach user to request
        (req as any).user = {
          userId: payload.userId,
          orgId: payload.orgId,
          role: payload.role,
          email: payload.email,
        };
        // If no API key required OR valid JWT, allow access
        if (!expected) return next();
        return next();
      }
    } catch (err) {
      // Invalid JWT - continue to check API key if required
    }
  }

  // If no API key is required (dev mode), allow access
  if (!expected) return next();

  // Check API key
  const provided = String(req.headers["x-api-key"] ?? "");
  if (!provided || provided !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  return next();
}
