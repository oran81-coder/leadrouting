import { Router } from "express";
import { calculateAgentScores } from "../../../../packages/modules/routing-engine/src/application/routing.engine";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { ValidationError } from "../../../../packages/core/src/shared/errors";

/**
 * Routing Calculation API - Phase 2
 * Calculate agent scores for a given lead using KPI weights
 * 
 * POST /api/routing/calculate - Calculate routing scores
 */
export function routingCalculationRoutes() {
  const r = Router();
  const configRepo = new PrismaMetricsConfigRepo();

  /**
   * POST /api/routing/calculate
   * Calculate best agents for a lead based on KPI weights
   * 
   * Body: {
   *   lead: {
   *     industry: string,
   *     dealSize?: number,
   *     source?: string,
   *     createdAt?: string (ISO date)
   *   },
   *   agentUserIds?: string[] (optional - if not provided, calculates for all agents)
   * }
   */
  r.post("/calculate", async (req, res) => {
    try {
      const { lead, agentUserIds } = req.body;

      if (!lead || !lead.industry) {
        throw new ValidationError("Missing required field: lead.industry");
      }

      // Get KPI weights and settings
      const { weights, settings } = await configRepo.getWeights();

      // Get available agents
      // TODO: In production, fetch from actual agent repository
      const availableAgents = agentUserIds || [
        "user_1", // Mock agents for now
        "user_2",
        "user_3",
      ];

      // Prepare lead context
      const leadContext = {
        industry: lead.industry,
        dealSize: lead.dealSize,
        source: lead.source,
        createdAt: lead.createdAt ? new Date(lead.createdAt) : new Date(),
      };

      // Prepare settings with status config
      // TODO: Get status config from field mapping
      const fullSettings = {
        ...settings,
        statusConfig: {
          inTreatmentStatuses: ["Relevant", "In Treatment", "No Answer"],
          closedWonStatus: "Sale Completed",
        },
      };

      // Calculate scores
      const scores = await calculateAgentScores(
        leadContext,
        availableAgents,
        "org_1", // TODO: Get from auth context
        weights,
        fullSettings
      );

      return res.json({
        ok: true,
        lead: leadContext,
        topAgent: scores[0] || null,
        allScores: scores,
        weightsUsed: weights,
      });
    } catch (error: any) {
      console.error("Error calculating routing scores:", error);

      if (error instanceof ValidationError) {
        return res.status(400).json({ ok: false, error: error.message });
      }

      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return r;
}

