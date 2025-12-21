import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Always log the real error to console for local dev
  console.error("[errorHandler] Unhandled error:");
  console.error(err?.stack ?? err);

  // Prisma often stores info here:
  if (err?.code) console.error("[errorHandler] code:", err.code);
  if (err?.meta) console.error("[errorHandler] meta:", err.meta);

  return res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Unexpected error",
    // expose minimal details only in dev
    details: process.env.NODE_ENV === "development" ? String(err?.message ?? err) : undefined,
  });
}
