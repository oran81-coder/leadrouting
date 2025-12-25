import type { Express } from "express";

import { managerRoutes } from "./manager.routes";
import { routingRoutes } from "./routing.routes";
import { adminRoutes } from "./admin.routes";
import { mappingPreviewRoutes } from "./mappingPreview.routes";
import { outcomesRoutes } from "./outcomes.routes";

import { healthRoutes } from "./health.routes";
import { metricsRoutes } from "./metrics.routes";
import { mondayPickerRoutes } from "./mondayPicker.routes";
import { authRoutes } from "./auth.routes";
import { kpiWeightsRoutes } from "./kpiWeights.routes";
import { routingCalculationRoutes } from "./routingCalculation.routes";
import { agentProfileRoutes } from "./agentProfile.routes";

import { requireApiKey } from "../middleware/authApiKey";
import { requireMondayConnected } from "../middleware/requireMondayConnected";

// module routes (placeholders)
import { fieldMappingRoutes } from "../../../../packages/modules/field-mapping/src/api/mapping.routes";

export function registerRoutes(app: Express) {
  const ORG_ID = "org_1";

  console.log("[registerRoutes] loaded. ORG_ID =", ORG_ID);

  // Public routes (no API key required)
  app.use("/health", healthRoutes());
  app.use("/auth", authRoutes()); // Authentication endpoints

  app.use("/admin", requireApiKey, adminRoutes());
  console.log("[registerRoutes] mounted /admin");

  app.use("/routing-calc", requireApiKey, routingCalculationRoutes()); // Phase 2: renamed to avoid conflict
  app.use("/routing", requireApiKey, routingRoutes());
  app.use("/manager", requireApiKey, managerRoutes());
  app.use("/metrics", requireApiKey, metricsRoutes());
  app.use("/outcomes", requireApiKey, outcomesRoutes());
  app.use("/kpi-weights", requireApiKey, kpiWeightsRoutes()); // Phase 2: KPI Weights Configuration
  app.use("/agents", requireApiKey, agentProfileRoutes()); // Phase 1: Agent Profiling

  app.use("/monday", requireApiKey, requireMondayConnected(ORG_ID), mondayPickerRoutes());

  /**
   * Phase 1: allow mapping preview WITHOUT Monday by providing mock `item` in the request body.
   * IMPORTANT: mount this BEFORE "/mapping" (which is guarded by requireMondayConnected),
   * otherwise requests to /mapping/preview may get blocked upstream.
   */
  app.use("/mapping/preview", requireApiKey, mappingPreviewRoutes());

  // Phase 1: mapping wizard routes (still require Monday)
  app.use("/mapping", requireApiKey, requireMondayConnected(ORG_ID), fieldMappingRoutes());
}
