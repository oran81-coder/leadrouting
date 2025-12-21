import type { Request, Response, NextFunction } from "express";
import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";

/**
 * Guard: Monday must be connected (credentials stored) before allowing wizard / mapping endpoints.
 */
export function requireMondayConnected(orgId: string) {
  const repo = new PrismaMondayCredentialRepo();
  return async (_req: Request, res: Response, next: NextFunction) => {
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
