import { Router } from "express";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaMondayUserCacheRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";

const ORG_ID = "org_1";

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

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
      const timeToCloseDays = filteredLeads
        .map((lead) => {
          if (lead.closedWonAt && lead.enteredAt) {
            return daysBetween(lead.enteredAt, lead.closedWonAt);
          }
          return null;
        })
        .filter((n): n is number => n !== null && n >= 0);

      const medianTimeToCloseDays = timeToCloseDays.length > 0 ? median(timeToCloseDays) : null;

      // Group by agent
      const agentMap = new Map<string, typeof filteredLeads>();
      for (const lead of filteredLeads) {
        if (!lead.assignedUserId) continue;
        if (!agentMap.has(lead.assignedUserId)) {
          agentMap.set(lead.assignedUserId, []);
        }
        agentMap.get(lead.assignedUserId)!.push(lead);
      }

      // Get agent names from cache
      const cachedUsers = await userCacheRepo.list(ORG_ID);
      const userMap = new Map<string, string>();
      for (const user of cachedUsers) {
        userMap.set(user.userId, user.name);
      }

      // Calculate per-agent metrics
      const perAgent = [];
      for (const [agentUserId, leads] of agentMap.entries()) {
        const agentName = userMap.get(agentUserId) || agentUserId;
        const agentAssigned = leads.length;
        const agentClosedWon = leads.length; // All in this set are closed/won
        const agentConversionRate = agentAssigned > 0 ? agentClosedWon / agentAssigned : 0;

        let agentRevenue: number | null = null;
        let agentAvgDeal: number | null = null;
        if (hasDealAmountMapping) {
          const agentDealAmounts = leads
            .map((lead) => Number(lead.dealAmount ?? 0))
            .filter((n) => Number.isFinite(n) && n > 0);
          if (agentDealAmounts.length > 0) {
            agentRevenue = agentDealAmounts.reduce((sum, val) => sum + val, 0);
            agentAvgDeal = agentRevenue / agentDealAmounts.length;
          }
        }

        const agentTimeToCloseDays = leads
          .map((lead) => {
            if (lead.closedWonAt && lead.enteredAt) {
              return daysBetween(lead.enteredAt, lead.closedWonAt);
            }
            return null;
          })
          .filter((n): n is number => n !== null && n >= 0);

        const agentMedianTimeToCloseDays = agentTimeToCloseDays.length > 0 ? median(agentTimeToCloseDays) : null;

        perAgent.push({
          agentUserId,
          agentName,
          assigned: agentAssigned,
          closedWon: agentClosedWon,
          conversionRate: agentConversionRate,
          revenue: agentRevenue,
          avgDeal: agentAvgDeal,
          medianTimeToCloseDays: agentMedianTimeToCloseDays,
        });
      }

      // Sort by conversion rate descending (default)
      perAgent.sort((a, b) => b.conversionRate - a.conversionRate);

      return res.json({
        ok: true,
        windowDays,
        kpis: {
          assigned,
          closedWon,
          conversionRate,
          medianTimeToCloseDays,
          revenue,
          avgDeal,
        },
        perAgent,
        comparison: null, // Phase 1: no period-over-period comparison
      });
    } catch (error: any) {
      console.error("[outcomes/summary] error:", error);
      return res.status(500).json({
        ok: false,
        error: "Failed to compute outcomes summary",
        message: error?.message,
      });
    }
  });

  return r;
}

