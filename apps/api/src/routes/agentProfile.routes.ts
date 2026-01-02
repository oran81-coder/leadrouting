import { Router } from "express";
import { PrismaAgentProfileRepo } from "../infrastructure/agentProfile.repo";
import {
  calculateAgentProfile,
  calculateAllAgentProfiles,
  getProfileSummary,
  isAgentEligible,
} from "../../../../packages/modules/agent-profiling/src/application/agentProfiler";

/**
 * Agent Profile API Routes (Phase 1)
 * 
 * Endpoints for agent performance metrics and profiling
 */
export function agentProfileRoutes() {
  const r = Router();
  const profileRepo = new PrismaAgentProfileRepo();

  /**
   * Helper to resolve orgId from request
   */
  function resolveOrgId(req: any): string {
    return req.body?.orgId || req.query?.orgId || req.orgId || process.env.DEFAULT_ORG_ID || "cmjq2ces90000rbcw8s5iqlcz";
  }

  /**
   * GET /agents/profiles
   * List all agent profiles
   */
  r.get("/profiles", async (req, res) => {
    try {
      const orgId = resolveOrgId(req);
      const profiles = await profileRepo.listByOrg(orgId);

      return res.json({
        ok: true,
        profiles: profiles.map(p => ({
          ...p,
          summary: getProfileSummary(p),
          eligible: isAgentEligible(p),
        })),
        count: profiles.length,
      });
    } catch (error: any) {
      console.error("[agents/profiles] Error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch agent profiles",
        message: error.message,
      });
    }
  });

  /**
   * GET /agents/profiles/eligible
   * List only eligible agents (availability > 0)
   */
  r.get("/profiles/eligible", async (req, res) => {
    try {
      const orgId = resolveOrgId(req);
      const profiles = await profileRepo.listEligibleAgents(orgId);

      return res.json({
        ok: true,
        profiles: profiles.map(p => ({
          ...p,
          summary: getProfileSummary(p),
          eligible: isAgentEligible(p),
        })),
        count: profiles.length,
      });
    } catch (error: any) {
      console.error("[agents/profiles/eligible] Error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch eligible agents",
        message: error.message,
      });
    }
  });

  /**
   * GET /agents/:agentUserId/profile
   * Get specific agent profile
   */
  r.get("/:agentUserId/profile", async (req, res) => {
    try {
      const { agentUserId } = req.params;
      const orgId = resolveOrgId(req);
      const profile = await profileRepo.get(orgId, agentUserId);

      if (!profile) {
        return res.status(404).json({
          ok: false,
          error: "Agent profile not found",
        });
      }

      return res.json({
        ok: true,
        profile: {
          ...profile,
          summary: getProfileSummary(profile),
          eligible: isAgentEligible(profile),
        },
      });
    } catch (error: any) {
      console.error("[agents/:agentUserId/profile] Error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to fetch agent profile",
        message: error.message,
      });
    }
  });

  /**
   * POST /agents/profiles/recompute
   * Manually trigger profile recalculation for all agents
   */
  r.post("/profiles/recompute", async (req, res) => {
    try {
      console.log("[agents/profiles/recompute] Starting recalculation...");
      const orgId = resolveOrgId(req);

      // Calculate all profiles
      const profiles = await calculateAllAgentProfiles(orgId);

      // Save to database
      await Promise.all(
        profiles.map(profile => profileRepo.upsert(profile))
      );

      console.log(`[agents/profiles/recompute] Computed ${profiles.length} profiles`);

      return res.json({
        ok: true,
        message: `Successfully recomputed ${profiles.length} agent profiles`,
        profiles: profiles.map(p => ({
          agentUserId: p.agentUserId,
          conversionRate: p.conversionRate,
          availability: p.availability,
          computedAt: p.computedAt,
        })),
      });
    } catch (error: any) {
      console.error("[agents/profiles/recompute] Error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to recompute agent profiles",
        message: error.message,
      });
    }
  });

  /**
   * POST /agents/:agentUserId/profile/recompute
   * Manually trigger profile recalculation for specific agent
   */
  r.post("/:agentUserId/profile/recompute", async (req, res) => {
    try {
      const { agentUserId } = req.params;
      const orgId = resolveOrgId(req);

      console.log(`[agents/${agentUserId}/profile/recompute] Recalculating...`);

      // Calculate profile
      const profile = await calculateAgentProfile(agentUserId, orgId);

      // Save to database
      await profileRepo.upsert(profile);

      return res.json({
        ok: true,
        message: `Successfully recomputed profile for agent ${agentUserId}`,
        profile: {
          ...profile,
          summary: getProfileSummary(profile),
          eligible: isAgentEligible(profile),
        },
      });
    } catch (error: any) {
      console.error(`[agents/${req.params.agentUserId}/profile/recompute] Error:`, error);
      return res.status(500).json({
        ok: false,
        error: "Failed to recompute agent profile",
        message: error.message,
      });
    }
  });

  return r;
}

