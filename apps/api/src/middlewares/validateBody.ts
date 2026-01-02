import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      console.error("[validateBody] Validation failed:", JSON.stringify(parsed.error.issues, null, 2));
      return res.status(400).json({
        ok: false,
        error: "Invalid request body",
        issues: parsed.error.issues,
      });
    }
    // Replace body with parsed data to ensure shape is correct downstream
    req.body = parsed.data;
    return next();
  };
}
