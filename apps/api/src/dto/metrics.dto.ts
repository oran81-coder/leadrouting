import { z } from "zod";

/**
 * DTO schemas for metrics endpoints with Zod validation
 */

/**
 * PUT /metrics/config - Update metrics configuration
 */
export const updateMetricsConfigSchema = z.object({
  leadBoardIds: z.string().min(1, "Lead board IDs are required").describe("Comma-separated board IDs"),
  assignedPeopleColumnId: z.string().min(1, "Assigned people column ID is required"),
  
  // Optional metric configurations
  enableWorkload: z.boolean().optional().default(true),
  enableConversionRate: z.boolean().optional().default(true),
  enableHotStreak: z.boolean().optional().default(true),
  enableResponseSpeed: z.boolean().optional().default(true),
  enableAvgDealSize: z.boolean().optional().default(false),
  enableIndustryPerformance: z.boolean().optional().default(false),
  
  // Conversion rate config
  conversionWindowDays: z.number().int().min(1).max(365).optional().default(30),
  closedWonStatusColumnId: z.string().optional(),
  closedWonStatusValue: z.string().optional(),
  
  // Deal size config
  dealAmountColumnId: z.string().optional(),
  
  // Response speed config
  contactedStatusColumnId: z.string().optional(),
  contactedStatusValue: z.string().optional(),
  nextCallDateColumnId: z.string().optional(),
  
  // Industry performance config
  industryColumnId: z.string().optional(),
  
  // Hot streak config
  hotStreakDealsCount: z.number().int().min(1).optional().default(3),
  hotStreakHoursWindow: z.number().int().min(1).optional().default(24),
});

export type UpdateMetricsConfigDTO = z.infer<typeof updateMetricsConfigSchema>;

/**
 * GET /outcomes/summary - Get outcomes summary
 */
export const getOutcomesSummarySchema = z.object({
  windowDays: z.enum(["7", "30", "90"]).transform(Number).optional().default("30"),
  mode: z.enum(["AUTO", "MANUAL_APPROVAL", "all"]).optional(),
  boardId: z.string().optional(),
});

export type GetOutcomesSummaryDTO = z.infer<typeof getOutcomesSummarySchema>;

