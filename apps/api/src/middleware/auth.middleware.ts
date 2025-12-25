import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { env } from "../config/env";

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string;
  orgId: string;
  email: string;
  role: string;
  sessionId: string;
}

/**
 * Verify JWT token
 */
function verifyToken<T = JWTPayload>(token: string): T {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: "lead-routing-api",
      audience: "lead-routing-app",
    }) as T;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Extend Express Request to include authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  orgId?: string;
}

/**
 * Authentication middleware - verifies JWT token
 * If AUTH_ENABLED=false, allows requests through (backward compatibility)
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Backward compatibility: if auth is disabled, allow all requests with default org
    if (!env.AUTH_ENABLED) {
      req.orgId = "org_1"; // Default org for development
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = verifyToken<JWTPayload>(token);

    // Check if session is still valid and not revoked
    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.isRevoked) {
      res.status(401).json({ error: "Invalid or revoked session" });
      return;
    }

    if (new Date() > session.expiresAt) {
      res.status(401).json({ error: "Session expired" });
      return;
    }

    if (!session.user.isActive) {
      res.status(401).json({ error: "User account is disabled" });
      return;
    }

    // Attach user info to request
    req.user = payload;
    req.orgId = payload.orgId;

    next();
  } catch (error) {
    if (error instanceof Error && (error.message === "Token expired" || error.message === "Invalid token")) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    console.error("[auth.middleware] Unexpected error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Authorization middleware - checks user role
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // If auth is disabled, allow all requests
    if (!env.AUTH_ENABLED) {
      return next();
    }

    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work both with and without auth
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!env.AUTH_ENABLED) {
      req.orgId = "org_1";
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      // No auth provided, continue without user context
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyToken<JWTPayload>(token);

    const prisma = getPrisma();
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (session && !session.isRevoked && new Date() <= session.expiresAt && session.user.isActive) {
      req.user = payload;
      req.orgId = payload.orgId;
    }

    next();
  } catch {
    // Ignore errors, just continue without auth
    next();
  }
}

