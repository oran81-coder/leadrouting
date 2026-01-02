import type { Request, Response, NextFunction } from "express";
import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";

/**
 * Guard: Monday must be connected (credentials stored) before allowing wizard / mapping endpoints.
 * Updated to use orgId from req.user instead of hardcoded value.
 */
export function requireMondayConnected(fallbackOrgId?: string) {
  const repo = new PrismaMondayCredentialRepo();
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get orgId from authenticated user (set by requireApiKey middleware)
    // Fall back to hardcoded orgId for backward compatibility
    const orgId = (req.user as any)?.orgId || fallbackOrgId || "org_1";
    
    console.log("[requireMondayConnected] Checking Monday connection for orgId:", orgId);
    
    const s = await repo.status(orgId);
    if (!s.connected) {
      return res.status(400).json({
        ok: false,
        error: "Monday not connected. Go to Admin Connect and save a token first.",
      });
    }
    return next();
  };
}
