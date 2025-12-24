import { Router } from "express";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { ValidationError } from "../../../../packages/core/src/shared/errors";

/**
 * KPI Weights API Routes - Phase 2
 * 
 * GET /api/kpi-weights - Get current KPI weights configuration
 * POST /api/kpi-weights - Update KPI weights
 */
export function kpiWeightsRoutes() {
  const r = Router();
  const repo = new PrismaMetricsConfigRepo();

  /**
   * GET /api/kpi-weights
   * Returns current KPI weights and settings
   */
  r.get("/", async (_req, res) => {
    try {
      const data = await repo.getWeights();
      return res.json({ ok: true, ...data });
    } catch (error: any) {
      console.error("Error loading KPI weights:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/kpi-weights
   * Update KPI weights configuration
   * 
   * Body: {
   *   weights: { domainExpertise: 30, availability: 5, ... },
   *   settings: { hotAgentMinDeals: 3, hotAgentWindowDays: 7, ... }
   * }
   */
  r.post("/", async (req, res) => {
    try {
      const { weights, settings } = req.body;

      if (!weights || !settings) {
        throw new ValidationError("Missing weights or settings in request body");
      }

      // Validate weights sum to 100
      const total = Object.values(weights).reduce((sum: number, w: any) => sum + Number(w), 0);
      if (Math.abs(total - 100) > 0.01) {
        // Allow tiny floating point errors
        throw new ValidationError(`Weights must sum to 100%. Current total: ${total}%`);
      }

      // Validate weight values
      for (const [key, value] of Object.entries(weights)) {
        const numValue = Number(value);
        if (numValue < 0 || numValue > 100) {
          throw new ValidationError(`Weight ${key} must be between 0 and 100. Got: ${numValue}`);
        }
      }

      // Validate settings
      if (settings.hotAgentMinDeals < 1) {
        throw new ValidationError("hotAgentMinDeals must be at least 1");
      }
      if (settings.hotAgentWindowDays < 1) {
        throw new ValidationError("hotAgentWindowDays must be at least 1");
      }
      if (settings.recentPerfWindowDays < 7 || settings.recentPerfWindowDays > 90) {
        throw new ValidationError("recentPerfWindowDays must be between 7 and 90");
      }

      await repo.updateWeights(weights, settings);

      return res.json({ ok: true, message: "KPI weights updated successfully" });
    } catch (error: any) {
      console.error("Error updating KPI weights:", error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({ ok: false, error: error.message });
      }
      
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return r;
}

