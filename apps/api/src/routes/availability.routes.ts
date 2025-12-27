/**
 * Agent Availability Routes
 * 
 * Manage agent exclusion from routing and capacity limits
 */

import { Router, Request, Response } from "express";
import { PrismaAgentAvailabilityRepo } from "../infrastructure/agentAvailability.repo";
import { PrismaCapacitySettingsRepo } from "../infrastructure/capacitySettings.repo";
import { CapacityCalculatorService } from "../services/capacityCalculator.service";

const router = Router();
const availabilityRepo = new PrismaAgentAvailabilityRepo();
const capacityRepo = new PrismaCapacitySettingsRepo();
const capacityCalculator = new CapacityCalculatorService();

// For now, hardcoded orgId (will be from auth later)
const ORG_ID = "org_1";

/**
 * GET /availability/agents
 * List all agents with their availability status
 */
router.get("/agents", async (req: Request, res: Response): Promise<void> => {
  try {
    const availabilityList = await availabilityRepo.listByOrg(ORG_ID);
    
    res.json({
      ok: true,
      data: availabilityList
    });
  } catch (error: any) {
    console.error("[AvailabilityRoutes] Error listing agents:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /availability/agents/:agentUserId
 * Get availability status for specific agent
 */
router.get("/agents/:agentUserId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentUserId } = req.params;
    const availability = await availabilityRepo.getByAgent(ORG_ID, agentUserId);
    
    res.json({
      ok: true,
      data: availability || {
        agentUserId,
        isAvailable: true, // Default
        reason: null
      }
    });
  } catch (error: any) {
    console.error("[AvailabilityRoutes] Error getting agent availability:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /availability/agents/:agentUserId
 * Set availability status for an agent
 * 
 * Body: {
 *   isAvailable: boolean,
 *   reason?: string
 * }
 */
router.post("/agents/:agentUserId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentUserId } = req.params;
    const { isAvailable, reason } = req.body;

    if (typeof isAvailable !== 'boolean') {
      res.status(400).json({
        ok: false,
        error: "isAvailable must be a boolean"
      });
      return;
    }

    const updated = await availabilityRepo.setAvailability({
      orgId: ORG_ID,
      agentUserId,
      isAvailable,
      reason: reason || null,
      updatedBy: "admin_temp" // TODO: from auth context
    });

    res.json({
      ok: true,
      data: updated
    });
  } catch (error: any) {
    console.error("[AvailabilityRoutes] Error setting agent availability:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /availability/capacity/settings
 * Get global capacity settings
 */
router.get("/capacity/settings", async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await capacityRepo.getOrCreateDefaults(ORG_ID);
    
    res.json({
      ok: true,
      data: settings
    });
  } catch (error: any) {
    console.error("[AvailabilityRoutes] Error getting capacity settings:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /availability/capacity/settings
 * Update global capacity settings
 * 
 * Body: {
 *   dailyLimit?: number | null,
 *   weeklyLimit?: number | null,
 *   monthlyLimit?: number | null
 * }
 */
router.post("/capacity/settings", async (req: Request, res: Response): Promise<void> => {
  try {
    const { dailyLimit, weeklyLimit, monthlyLimit } = req.body;

    const updated = await capacityRepo.update({
      orgId: ORG_ID,
      dailyLimit: dailyLimit === undefined ? undefined : (dailyLimit === null || dailyLimit === 0 ? null : Number(dailyLimit)),
      weeklyLimit: weeklyLimit === undefined ? undefined : (weeklyLimit === null || weeklyLimit === 0 ? null : Number(weeklyLimit)),
      monthlyLimit: monthlyLimit === undefined ? undefined : (monthlyLimit === null || monthlyLimit === 0 ? null : Number(monthlyLimit)),
      updatedBy: "admin_temp" // TODO: from auth context
    });

    res.json({
      ok: true,
      data: updated
    });
  } catch (error: any) {
    console.error("[AvailabilityRoutes] Error updating capacity settings:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /availability/capacity/status
 * Get current capacity status for all agents
 */
router.get("/capacity/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await capacityRepo.getOrCreateDefaults(ORG_ID);
    
    // Get all agent IDs from Monday cache
    const { PrismaMondayUserCacheRepo } = await import("../../../../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo");
    const mondayUserRepo = new PrismaMondayUserCacheRepo();
    const mondayUsers = await mondayUserRepo.list(ORG_ID);
    const agentUserIds = mondayUsers.map(u => u.userId);

    const capacityMap = await capacityCalculator.calculateAllAgentsCapacity(
      ORG_ID,
      agentUserIds,
      {
        dailyLimit: settings.dailyLimit,
        weeklyLimit: settings.weeklyLimit,
        monthlyLimit: settings.monthlyLimit
      }
    );

    // Convert Map to array with warnings
    const statusList = Array.from(capacityMap.entries()).map(([agentUserId, status]) => ({
      ...status,
      warning: capacityCalculator.getCapacityWarning(status, {
        dailyLimit: settings.dailyLimit,
        weeklyLimit: settings.weeklyLimit,
        monthlyLimit: settings.monthlyLimit
      })
    }));

    res.json({
      ok: true,
      data: {
        settings: {
          dailyLimit: settings.dailyLimit,
          weeklyLimit: settings.weeklyLimit,
          monthlyLimit: settings.monthlyLimit
        },
        agents: statusList
      }
    });
  } catch (error: any) {
    console.error("[AvailabilityRoutes] Error getting capacity status:", error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;

