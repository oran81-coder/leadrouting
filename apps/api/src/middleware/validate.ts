import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../../../../packages/core/src/shared/errors";

/**
 * Validation target (body, query, or params)
 */
type ValidationTarget = "body" | "query" | "params";

/**
 * Middleware factory for Zod validation
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of the request to validate (default: "body")
 * @returns Express middleware function
 * 
 * @example
 * ```typescript
 * router.post("/users", validate(createUserSchema), createUserHandler);
 * router.get("/users/:id", validate(getUserParamsSchema, "params"), getUserHandler);
 * ```
 */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get data to validate based on target
      const data = req[target];

      // Validate and parse data
      const parsed = schema.parse(data);

      // Replace request data with parsed (transformed) data
      (req as any)[target] = parsed;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Convert Zod error to ValidationError
        const validationErrors = error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
          code: e.code,
        }));

        next(
          new ValidationError("Validation failed", {
            target,
            errors: validationErrors,
          })
        );
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body
 * Shorthand for validate(schema, "body")
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, "body");
}

/**
 * Validate request query parameters
 * Shorthand for validate(schema, "query")
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, "query");
}

/**
 * Validate request URL parameters
 * Shorthand for validate(schema, "params")
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, "params");
}

