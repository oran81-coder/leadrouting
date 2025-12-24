import { Router } from "express";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaMondayUserCacheRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";

const ORG_ID = "org_1";

/**
 * Outcomes routes - Performance metrics and analytics
 */
export function outcomesRoutes() {
  const r = Router();
  const factRepo = new PrismaLeadFactRepo();
  const cfgRepo = new PrismaMetricsConfigRepo();
  const userCacheRepo = new PrismaMondayUserCacheRepo();

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
      const cfg = await cfgRepo.getOrCreateDefaults();
      const hasDealAmountMapping = !!(cfg.dealAmountColumnId && String(cfg.dealAmountColumnId).trim().length > 0);

      // Fetch all closed/won leads in the window
      const closedWonLeads = await factRepo.listClosedWonSince(since);

      // Filter by boardId if provided
      const filteredLeads = boardId
        ? closedWonLeads.filter((lead) => lead.boardId === boardId)
        : closedWonLeads;

      // Calculate overall KPIs
      const assigned = filteredLeads.length; // All closed/won leads are counted as assigned
      const closedWon = filteredLeads.length; // All are closed/won by definition
      const conversionRate = assigned > 0 ? closedWon / assigned : 0;

      // Calculate revenue and avgDeal if dealAmount mapping exists
      let revenue: number | null = null;
      let avgDeal: number | null = null;
      if (hasDealAmountMapping) {
        const dealAmounts = filteredLeads
          .map((lead) => Number(lead.dealAmount ?? 0))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (dealAmounts.length > 0) {
          revenue = dealAmounts.reduce((sum, val) => sum + val, 0);
          avgDeal = revenue / dealAmounts.length;
        }
      }

      // Calculate median time to close
      const closeTimes = filteredLeads
        .map((lead: any) => {
          if (!lead.closedAt || !lead.enteredAt) return null;
          const diff = lead.closedAt.getTime() - lead.enteredAt.getTime();
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

      for (const lead of filteredLeads) {
        const agentId = lead.assignedUserId || "unknown";
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, { assigned: 0, closedWon: 0, revenue: 0, closeTimes: [] });
        }
        const agentData = agentMap.get(agentId)!;
        agentData.assigned++;
        agentData.closedWon++;
        
        if (hasDealAmountMapping && lead.dealAmount) {
          const dealAmt = Number(lead.dealAmount);
          if (Number.isFinite(dealAmt) && dealAmt > 0) {
            agentData.revenue += dealAmt;
          }
        }

        if ((lead as any).closedAt && (lead as any).enteredAt) {
          const diff = (lead as any).closedAt.getTime() - (lead as any).enteredAt.getTime();
          const days = diff / (1000 * 60 * 60 * 24);
          if (Number.isFinite(days) && days >= 0) {
            agentData.closeTimes.push(days);
          }
        }
      }

      // Get user names from cache
      const cachedUsers = await userCacheRepo.list(ORG_ID);
      const userMap = new Map<string, string>();
      for (const user of cachedUsers) {
        userMap.set(user.userId, user.name);
      }

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

        return {
          agentUserId: agentId,
          agentName: userMap.get(agentId) || agentId,
          assigned: data.assigned,
          closedWon: data.closedWon,
          conversionRate: convRate,
          revenue: hasDealAmountMapping ? data.revenue : null,
          avgDeal: hasDealAmountMapping ? avgDealAgent : null,
          medianTimeToCloseDays: medianClose,
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


