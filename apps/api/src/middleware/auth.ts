/**
 * Authentication & Authorization Middleware
 * 
 * Phase 5.1: JWT-based authentication and role-based authorization
 */

import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../../../../packages/modules/auth/src/application/auth.service";
import { UnauthorizedError, ForbiddenError } from "../../../../packages/core/src/shared/errors";
import { log } from "../../../../packages/core/src/shared/logger";
import { env } from "../config/env";
import type { User, UserRole } from "../../../../packages/modules/auth/src/contracts/auth.types";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const authService = new AuthService();

/**
 * Authentication middleware - Verify JWT token and attach user to request
 * 
 * Usage:
 *   router.get("/protected", authenticateJWT, handler);
 */
export async function authenticateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip auth if AUTH_ENABLED is false (backward compatibility)
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token and get user
    const user = await authService.getUserFromToken(token);

    // Attach user to request
    req.user = user;

    log.debug("User authenticated", { userId: user.id, role: user.role });

    next();
  } catch (error: any) {
    log.warn("Authentication failed", { error: error.message });
    next(error);
  }
}

/**
 * Optional authentication middleware - Attach user if token is valid, but don't fail if missing
 * 
 * Usage:
 *   router.get("/public-or-private", optionalAuth, handler);
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Skip auth if AUTH_ENABLED is false
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token, but that's OK
      next();
      return;
    }

    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    req.user = user;

    next();
  } catch (error) {
    // Token was provided but invalid - ignore and continue
    log.debug("Optional auth: invalid token ignored");
    next();
  }
}

/**
 * Authorization middleware - Require specific role(s)
 * 
 * Usage:
 *   router.post("/admin/rules", authenticateJWT, requireRole(["admin"]), handler);
 *   router.post("/manager/approve", authenticateJWT, requireRole(["admin", "manager"]), handler);
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip auth if AUTH_ENABLED is false
    if (!env.AUTH_ENABLED) {
      next();
      return;
    }

    // User must be authenticated first
    if (!req.user) {
      next(new UnauthorizedError("Authentication required"));
      return;
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      log.warn("Authorization failed", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });
      next(new ForbiddenError(`Access denied. Required role(s): ${allowedRoles.join(", ")}`));
      return;
    }

    log.debug("User authorized", { userId: req.user.id, role: req.user.role });
    next();
  };
}

/**
 * Convenience middleware: require admin role
 */
export const requireAdmin = requireRole(["admin"]);

/**
 * Convenience middleware: require manager or admin role
 */
export const requireManagerOrAdmin = requireRole(["admin", "manager"]);

/**
 * Convenience middleware: require super_admin role (system-wide management)
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  // Skip auth if AUTH_ENABLED is false
  if (!env.AUTH_ENABLED) {
    next();
    return;
  }

  // User must be authenticated first
  if (!req.user) {
    next(new UnauthorizedError("Authentication required"));
    return;
  }

  // Check if user is super_admin
  if (req.user.role !== "super_admin") {
    log.warn("Super admin access denied", {
      userId: req.user.id,
      userRole: req.user.role,
    });
    next(new ForbiddenError("Access denied. Super admin role required."));
    return;
  }

  log.debug("Super admin authorized", { userId: req.user.id });
  next();
}

/**
 * Convenience middleware: require any authenticated user
 */
export const requireAuth = authenticateJWT;

