import { z } from "zod";

/**
 * DTO schemas for routing endpoints with Zod validation
 */

/**
 * POST /routing/evaluate - Evaluate routing for a lead
 */
export const evaluateRoutingSchema = z.object({
  lead: z.record(z.string(), z.any()).describe("Lead data as key-value pairs"),
});

export type EvaluateRoutingDTO = z.infer<typeof evaluateRoutingSchema>;

/**
 * POST /routing/execute - Execute routing for a Monday.com item
 */
export const executeRoutingSchema = z.object({
  boardId: z.string().min(1, "Board ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
});

export type ExecuteRoutingDTO = z.infer<typeof executeRoutingSchema>;

/**
 * POST /routing/preview - Preview routing for a lead
 */
export const previewRoutingSchema = z.object({
  lead: z.record(z.string(), z.any()).describe("Lead data as key-value pairs"),
  includeExplainability: z.boolean().optional().default(true),
});

export type PreviewRoutingDTO = z.infer<typeof previewRoutingSchema>;

