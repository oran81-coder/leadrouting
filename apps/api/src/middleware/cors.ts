import type { Request, Response, NextFunction } from "express";
import { optionalEnv } from "../config/env";

/**
 * Phase 1 minimal CORS:
 * - If CORS_ORIGIN is set (e.g. http://localhost:5173), only allow that origin.
 * - If not set, allow all origins (local dev convenience).
 */
export function cors(req: Request, res: Response, next: NextFunction) {
  const allowed = optionalEnv("CORS_ORIGIN", "");
  const origin = String(req.headers.origin ?? "");

  if (allowed) {
    if (origin && origin === allowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
  } else {
    // permissive
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  }

  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
}
