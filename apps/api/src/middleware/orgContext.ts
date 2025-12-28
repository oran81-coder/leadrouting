/**
 * Organization Context Middleware
 * Phase 7.3: Multi-Tenant Support
 * 
 * Extracts orgId from JWT token or API key and adds it to request context
 */

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../../../../packages/core/src/shared/errors";
import { log } from "../../../../packages/core/src/shared/logger";

// Extend Express Request to include orgId
declare global {
  namespace Express {
    interface Request {
      orgId?: string;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * Extract orgId from JWT token or API key
 * This middleware should run AFTER authentication middleware
 */
export function orgContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Try to extract from JWT token first (Authorization header)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as any;
        req.orgId = payload.orgId;
        req.userId = payload.userId;
        req.userRole = payload.role;
        
        log.debug("Organization context from JWT", { 
          orgId: req.orgId, 
          userId: req.userId,
          path: req.path 
        });
        
        return next();
      } catch (error) {
        // Token invalid or expired - will fall through to API key check
        log.debug("JWT verification failed, checking API key");
      }
    }

    // Fallback: Extract from API key (x-api-key header)
    // API keys are mapped to organizations in environment or database
    const apiKey = req.headers["x-api-key"] as string;
    if (apiKey) {
      const orgId = getOrgIdFromApiKey(apiKey);
      if (orgId) {
        req.orgId = orgId;
        
        log.debug("Organization context from API key", { 
          orgId: req.orgId, 
          path: req.path 
        });
        
        return next();
      }
    }

    // No valid auth found - check if AUTH is disabled
    if (!env.AUTH_ENABLED) {
      // When auth is disabled, use default organization
      req.orgId = "org_1";
      
      log.debug("Using default organization (AUTH_ENABLED=false)", { 
        orgId: req.orgId,
        path: req.path 
      });
      
      return next();
    }
    
    log.warn("No valid organization context found", { 
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasApiKey: !!apiKey 
    });
    
    throw new UnauthorizedError("Invalid or missing authentication credentials");
    
  } catch (error) {
    // If AUTH is disabled and there's an error, use default org
    if (!env.AUTH_ENABLED && !req.orgId) {
      req.orgId = "org_1";
      return next();
    }
    next(error);
  }
}

/**
 * Get orgId from API key
 * For now, we use a simple mapping from env
 * In production, this should query a database
 */
function getOrgIdFromApiKey(apiKey: string): string | null {
  // Default organization for development API key
  if (apiKey === "dev_key_123" || apiKey === env.API_KEY) {
    return "org_default_001";
  }

  // TODO: Query database for API key -> orgId mapping
  // const apiKeyRecord = await apiKeyRepo.findByKey(apiKey);
  // return apiKeyRecord?.orgId || null;

  return null;
}

/**
 * Require orgId middleware
 * Use this on routes that MUST have an orgId
 */
export function requireOrgContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.orgId) {
    log.error("Organization context required but not found", { path: req.path });
    return next(new UnauthorizedError("Organization context is required"));
  }
  next();
}

/**
 * Optional orgId middleware
 * Use this on routes where orgId is optional (e.g., public routes)
 */
export function optionalOrgContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Just pass through - orgId might be undefined
  next();
}

