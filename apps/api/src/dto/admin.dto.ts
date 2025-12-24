import { z } from "zod";

/**
 * DTO schemas for admin endpoints with Zod validation
 */

/**
 * POST /admin/schema - Create/update internal schema
 */
export const createSchemaSchema = z.object({
  fields: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      type: z.enum(["string", "number", "boolean", "date"]),
      required: z.boolean().optional().default(false),
    })
  ).min(1, "At least one field is required"),
});

export type CreateSchemaDTO = z.infer<typeof createSchemaSchema>;

/**
 * POST /admin/mapping - Create/update field mapping
 */
export const createMappingSchema = z.object({
  mappings: z.array(
    z.object({
      internalFieldId: z.string().min(1),
      boardId: z.string().min(1),
      columnId: z.string().min(1),
    })
  ).min(1, "At least one mapping is required"),
});

export type CreateMappingDTO = z.infer<typeof createMappingSchema>;

/**
 * POST /admin/rules - Create/update business rules
 */
export const createRulesSchema = z.object({
  rules: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      priority: z.number().int().min(0),
      conditions: z.array(
        z.object({
          field: z.string().min(1),
          operator: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "in", "nin", "contains"]),
          value: z.any(),
        })
      ),
      action: z.object({
        type: z.enum(["assign", "score", "reject"]),
        params: z.record(z.string(), z.any()).optional(),
      }),
    })
  ).min(1, "At least one rule is required"),
});

export type CreateRulesDTO = z.infer<typeof createRulesSchema>;

/**
 * POST /admin/routing/enable - Enable routing
 */
export const enableRoutingSchema = z.object({
  force: z.boolean().optional().default(false).describe("Force enable even if validation warnings exist"),
});

export type EnableRoutingDTO = z.infer<typeof enableRoutingSchema>;

/**
 * POST /admin/routing/disable - Disable routing
 */
export const disableRoutingSchema = z.object({
  reason: z.string().optional().describe("Optional reason for disabling"),
});

export type DisableRoutingDTO = z.infer<typeof disableRoutingSchema>;

