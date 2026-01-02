import { Router } from "express";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaMondayUserCacheRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";
import { PrismaAgentProfileRepo } from "../infrastructure/agentProfile.repo";

/**
 * Helper to get orgId from request (set by orgContext middleware)
 * Falls back to org_1 for backward compatibility
 */
function getOrgId(req: any): string {
  return req.orgId || req.user?.orgId || process.env.DEFAULT_ORG_ID || "org_1";
}

/**
 * Outcomes routes - Performance metrics and analytics
 */
export function outcomesRoutes() {
  const r = Router();
  const factRepo = new PrismaLeadFactRepo();
  const cfgRepo = new PrismaMetricsConfigRepo();
  const userCacheRepo = new PrismaMondayUserCacheRepo();
  const agentProfileRepo = new PrismaAgentProfileRepo();

  r.get("/summary", async (req, res) => {
    try {
      // Parse and validate query params
      const windowDaysParam = req.query.windowDays ? Number(req.query.windowDays) : 30;
      const mode = req.query.mode ? String(req.query.mode) : "all";
      const boardId = req.query.boardId ? String(req.query.boardId) : null;

      // Validate windowDays
      if (![7, 30, 90].includes(windowDaysParam)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid windowDays. Must be 7, 30, or 90.",
        });
      }

      const windowDays = windowDaysParam;
      const now = new Date();
      const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

      // Get config to check if dealAmount is configured
      const orgId = getOrgId(req);
      const cfg = await cfgRepo.getOrCreateDefaults(orgId);
      const hasDealAmountMapping = !!(cfg.dealAmountColumnId && String(cfg.dealAmountColumnId).trim().length > 0);

      // Fetch ALL leads that entered in the window (assigned)
      const allLeads = await factRepo.listSince(orgId, since);

      // Filter by boardId if provided
      const filteredLeads = boardId
        ? allLeads.filter((lead) => lead.boardId === boardId)
        : allLeads;

      // Calculate overall KPIs
      const leadCount = filteredLeads.length; // All leads regardless of assignment
      const assigned = leadCount; // Show all leads in the 'Total Leads' KPI
      const closedWonLeads = filteredLeads.filter((lead) => lead.closedWonAt && lead.assignedUserId); // Closed won leads
      const closedWon = closedWonLeads.length;
      const conversionRate = assigned > 0 ? closedWon / assigned : 0;

      // Calculate revenue and avgDeal if dealAmount mapping exists
      let revenue: number | null = null;
      let avgDeal: number | null = null;
      if (hasDealAmountMapping) {
        const dealAmounts = closedWonLeads
          .map((lead) => Number(lead.dealAmount ?? 0))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (dealAmounts.length > 0) {
          revenue = dealAmounts.reduce((sum, val) => sum + val, 0);
          avgDeal = revenue / dealAmounts.length;
        }
      }

      // Calculate median time to close
      const closeTimes = closedWonLeads
        .map((lead: any) => {
          if (!lead.closedWonAt || !lead.enteredAt) return null;
          const diff = lead.closedWonAt.getTime() - lead.enteredAt.getTime();
          return diff / (1000 * 60 * 60 * 24); // days
        })
        .filter((d): d is number => d !== null && Number.isFinite(d) && d >= 0);

      let medianTimeToCloseDays: number | null = null;
      if (closeTimes.length > 0) {
        closeTimes.sort((a, b) => a - b);
        const mid = Math.floor(closeTimes.length / 2);
        medianTimeToCloseDays =
          closeTimes.length % 2 === 0
            ? (closeTimes[mid - 1] + closeTimes[mid]) / 2
            : closeTimes[mid];
      }

      // Per-agent breakdown
      const agentMap = new Map<string, {
        assigned: number;
        closedWon: number;
        revenue: number;
        closeTimes: number[];
      }>();

      // Count all assigned leads per agent
      for (const lead of filteredLeads) {
        if (!lead.assignedUserId) continue;
        const agentId = lead.assignedUserId;
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, { assigned: 0, closedWon: 0, revenue: 0, closeTimes: [] });
        }
        const agentData = agentMap.get(agentId)!;
        agentData.assigned++;

        // Only count closed won and revenue for closed deals
        if (lead.closedWonAt) {
          agentData.closedWon++;

          if (hasDealAmountMapping && lead.dealAmount) {
            const dealAmt = Number(lead.dealAmount);
            if (Number.isFinite(dealAmt) && dealAmt > 0) {
              agentData.revenue += dealAmt;
            }
          }

          if ((lead as any).closedWonAt && (lead as any).enteredAt) {
            const diff = (lead as any).closedWonAt.getTime() - (lead as any).enteredAt.getTime();
            const days = diff / (1000 * 60 * 60 * 24);
            if (Number.isFinite(days) && days >= 0) {
              agentData.closeTimes.push(days);
            }
          }
        }
      }

      // Get user names from cache
      const cachedUsers = await userCacheRepo.list(getOrgId(req));
      const userMap = new Map<string, string>();
      for (const user of cachedUsers) {
        userMap.set(user.userId, user.name);
      }

      // Get agent profiles for additional metrics
      const agentProfiles = await agentProfileRepo.listByOrg(getOrgId(req));
      const profileMap = new Map(agentProfiles.map(p => [p.agentUserId, p]));

      // Build perAgent array
      const perAgent = Array.from(agentMap.entries()).map(([agentId, data]) => {
        const convRate = data.assigned > 0 ? data.closedWon / data.assigned : 0;

        let medianClose: number | null = null;
        if (data.closeTimes.length > 0) {
          const sorted = [...data.closeTimes].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          medianClose = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
        }

        const avgDealAgent = data.revenue > 0 && data.closedWon > 0
          ? data.revenue / data.closedWon
          : null;

        // Get additional metrics from agent profile
        const profile = profileMap.get(agentId);

        return {
          agentUserId: agentId,
          agentName: userMap.get(agentId) || agentId,
          assigned: data.assigned,
          closedWon: data.closedWon,
          conversionRate: convRate,
          revenue: hasDealAmountMapping ? data.revenue : null,
          avgDeal: hasDealAmountMapping ? avgDealAgent : null,
          medianTimeToCloseDays: medianClose,

          // Additional metrics from Agent Profile
          avgResponseTime: profile?.avgResponseTime ?? null,
          availability: profile?.availability ?? null,
          currentActiveLeads: profile?.currentActiveLeads ?? null,
          dailyLeadsToday: profile?.dailyLeadsToday ?? null,
          hotStreakCount: profile?.hotStreakCount ?? null,
          hotStreakActive: profile?.hotStreakActive ?? null,
          burnoutScore: profile?.burnoutScore ?? null,
          industryExpertise: profile?.industryExpertise ?? null,
          totalLeadsHandled: profile?.totalLeadsHandled ?? null,
        };
      });

      // Sort by conversion rate descending
      perAgent.sort((a, b) => b.conversionRate - a.conversionRate);

      return res.json({
        ok: true,
        windowDays,
        mode,
        boardId,
        kpis: {
          totalLeads: leadCount,
          assigned,
          closedWon,
          conversionRate,
          medianTimeToCloseDays,
          revenue,
          avgDeal,
        },
        perAgent,
      });
    } catch (e: any) {
      console.error("[outcomesRoutes] Error in /summary:", e);
      return res.status(500).json({
        ok: false,
        error: e?.message || String(e),
      });
    }
  });

  return r;
}


