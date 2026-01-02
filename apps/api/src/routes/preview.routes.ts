import { Router, Request, Response } from "express";
import { z } from "zod";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { PrismaLeadFactRepo } from "../infrastructure/leadFact.repo";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { optionalEnv } from "../config/env";

const router = Router();

/**
 * POST /preview/historical
 * 
 * מציג סימולציה: מה היה קורה אם מערכת הניתוב הייתה פעילה בעבר
 * 
 * תהליך:
 * 1. שולף leads היסטוריים מ-Monday.com (30/60/90 ימים אחורה)
 * 2. לכל lead - מריץ מנוע ניתוב ומחשב ציונים
 * 3. משווה: מי קיבל בפועל vs. מי המערכת הייתה ממליצה
 * 4. מחשב Success Rate: כמה leads נסגרו בהצלחה
 * 
 * Input: { windowDays: 30 | 60 | 90 }
 * Output: { summary, leads }
 */
router.post("/historical", async (req: Request, res: Response): Promise<void> => {
  try {
    // Get orgId from authenticated user or API key
    const orgId = (req.user as any)?.orgId || (req as any).orgId;
    if (!orgId) {
      res.status(401).json({
        ok: false,
        error: "NOT_AUTHENTICATED",
        message: "User not authenticated",
      });
      return;
    }

    // Validate input
    const BodySchema = z.object({
      windowDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
    });

    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "INVALID_INPUT",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { windowDays } = parsed.data;

    // Get metrics configuration
    const metricsCfgRepo = new PrismaMetricsConfigRepo();
    const metricsCfg = await metricsCfgRepo.getOrCreateDefaults(orgId);

    // Check if lead boards are configured
    if (!metricsCfg.leadBoardIds || String(metricsCfg.leadBoardIds).trim().length === 0) {
      res.status(400).json({
        ok: false,
        error: "LEAD_BOARDS_NOT_CONFIGURED",
        message: "Please configure lead boards in Field Mapping first",
      });
      return;
    }

    const leadBoardIds = String(metricsCfg.leadBoardIds)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    // Calculate date range - still useful for display
    const now = new Date();
    const sinceDate = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    console.log(`[Preview] Loading 500 latest leads from LeadFact`);

    // Fetch leads from LeadFact instead of Monday.com directly
    const leadFactRepo = new PrismaLeadFactRepo();
    const allLeadFacts = await leadFactRepo.listSince(orgId, sinceDate);

    // Sort by enteredAt DESC (newest first) and limit to 500
    const sortedLeads = allLeadFacts
      .sort((a, b) => {
        const dateA = new Date(a.enteredAt || 0).getTime();
        const dateB = new Date(b.enteredAt || 0).getTime();
        return dateB - dateA; // DESC - newest first
      })
      .slice(0, 500);

    console.log(`[Preview] Processing ${sortedLeads.length} leads from LeadFact`);

    // Helpers no longer needed - data comes from LeadFact

    // Load agent metrics for routing calculations
    const prisma = getPrisma();
    const windowDaysForMetrics = [
      metricsCfg.conversionWindowDays,
      metricsCfg.avgDealWindowDays,
      metricsCfg.responseWindowDays,
    ].filter(Boolean);

    const agentRows = await prisma.agentMetricsSnapshot.findMany({
      where: { orgId: orgId, windowDays: { in: windowDaysForMetrics as any } },
      select: { agentUserId: true },
      distinct: ["agentUserId"],
    });
    const agentIds = agentRows.map((r) => String(r.agentUserId));

    console.log(`[Preview] Found ${agentIds.length} agents with metrics`);

    // Load agent data
    async function loadAgent(agentUserId: string) {
      const snaps = await prisma.agentMetricsSnapshot.findMany({
        where: { orgId: orgId, agentUserId },
        orderBy: { windowDays: "asc" },
      });
      const byWindow = new Map<number, any>();
      for (const s of snaps) byWindow.set(Number(s.windowDays), s);

      const conv = byWindow.get(Number(metricsCfg.conversionWindowDays)) ?? byWindow.values().next().value;
      const avg = byWindow.get(Number(metricsCfg.avgDealWindowDays)) ?? byWindow.values().next().value;
      const resp = byWindow.get(Number(metricsCfg.responseWindowDays)) ?? byWindow.values().next().value;

      // Try to get agent name from cache
      const cached = await prisma.mondayUserCache.findFirst({
        where: { orgId: orgId, userId: agentUserId },
      });
      const name = cached?.name ?? `Agent ${agentUserId}`;

      return {
        agentUserId,
        name,
        conv,
        avg,
        resp,
        anySnap: snaps[0] ?? null,
      };
    }

    const agents = await Promise.all(agentIds.map((id) => loadAgent(id)));

    // Load all user names from MondayUserCache for assignedTo display
    const allAssignedUserIds = Array.from(new Set(sortedLeads.map(l => l.assignedUserId).filter(Boolean)));
    const userNameCache = new Map<string, string>();

    if (allAssignedUserIds.length > 0) {
      const cachedUsers = await prisma.mondayUserCache.findMany({
        where: {
          orgId: orgId,
          userId: { in: allAssignedUserIds as string[] }
        },
      });

      for (const cached of cachedUsers) {
        userNameCache.set(cached.userId, cached.name || `User ${cached.userId}`);
      }
    }

    console.log(`[Preview] Loaded ${userNameCache.size} user names from cache`);

    // Helper: Compute agent score for a lead
    function computeScore(leadIndustry: string | null, agent: any) {
      const ind = (leadIndustry ?? "").trim().toLowerCase();

      // Parse industry performance
      let industryRate = 0.5; // default fallback
      if (agent.anySnap?.industryPerfJson) {
        try {
          const perf = JSON.parse(String(agent.anySnap.industryPerfJson || "{}"));
          if (ind && perf[ind] != null) {
            industryRate = Math.max(0, Math.min(1, Number(perf[ind])));
          }
        } catch {
          // ignore
        }
      }

      const conversionRate = Math.max(0, Math.min(1, Number(agent.conv?.conversionRate ?? 0)));
      const avgDeal = Math.max(0, Number(agent.avg?.avgDealSize ?? 0));
      const avgDealRef = Number(optionalEnv("PREVIEW_AVG_DEAL_REF", "20000")) || 20000;
      const avgDealNorm = Math.max(0, Math.min(1, avgDeal / avgDealRef));

      const isHot = agent.anySnap?.isHot ? 1 : 0;
      const hotDeals = Math.max(0, Number(agent.anySnap?.hotDealsCount ?? 0));
      const hotMin = Math.max(1, Number(metricsCfg.hotAgentMinDeals ?? 3));
      const hotNorm = isHot ? 1 : Math.max(0, Math.min(1, hotDeals / hotMin));

      const respMins = Math.max(0, Number(agent.resp?.medianResponseMinutes ?? 0));
      const respRef = Number(optionalEnv("PREVIEW_RESPONSE_REF_MINS", "240")) || 240;
      const respNorm = 1 - Math.max(0, Math.min(1, respMins / respRef));

      // Apply toggles and weights
      const components: Record<string, number> = {
        domainExpertise: industryRate * 10,
        conversionHistorical: conversionRate * 10,
        avgDealSize: avgDealNorm * 10,
        hotAgent: hotNorm * 10,
        responseTime: respNorm * 10,
      };

      if (metricsCfg.enableIndustryPerf === false) components.domainExpertise = 0;
      if (metricsCfg.enableConversion === false) components.conversionHistorical = 0;
      if (metricsCfg.enableAvgDealSize === false) components.avgDealSize = 0;
      if (metricsCfg.enableHotStreak === false) components.hotAgent = 0;
      if (metricsCfg.enableResponseSpeed === false) components.responseTime = 0;

      const weights: Record<string, number> = {
        domainExpertise: Number(metricsCfg.weightDomainExpertise ?? 0),
        conversionHistorical: Number(metricsCfg.weightConversionHistorical ?? 0),
        avgDealSize: Number(metricsCfg.weightAvgDealSize ?? 0),
        hotAgent: Number(metricsCfg.weightHotAgent ?? 0),
        responseTime: Number(metricsCfg.weightResponseTime ?? 0),
      };

      const breakdown: Record<string, number> = {};
      let total = 0;
      for (const [k, w] of Object.entries(weights)) {
        const points = (w / 100) * (components[k] ?? 0);
        breakdown[k] = Math.round(points * 100) / 100;
        total += points;
      }

      total = Math.round(total * 100) / 100;

      return { score: total, breakdown };
    }

    // Process each lead from LeadFact
    const results: any[] = [];
    let totalLeads = sortedLeads.length;
    let routedLeads = 0;
    let closedWonLeads = 0;
    let systemMatchedClosedWon = 0; // leads שהמערכת הייתה ממליצה והם נסגרו

    for (const leadFact of sortedLeads) {
      const boardId = leadFact.boardId;
      const itemId = leadFact.itemId;

      // Extract data from LeadFact
      const industry = metricsCfg.enableIndustryPerf === false ? null : leadFact.industry;
      const assignedUserId = leadFact.assignedUserId;
      const assignedUserName = assignedUserId ? (userNameCache.get(assignedUserId) || `User ${assignedUserId}`) : null;
      const statusText = leadFact.statusValue;
      const isClosedWon = leadFact.closedWonAt != null;

      if (isClosedWon) {
        closedWonLeads++;
      }

      // Run routing engine simulation
      const scored = agents
        .map((a) => {
          const s = computeScore(industry, a);
          return {
            agentUserId: a.agentUserId,
            agentName: a.name,
            score: s.score,
            breakdown: s.breakdown,
          };
        })
        .sort((x, y) => y.score - x.score);

      const topRecommendation = scored[0] || null;

      if (topRecommendation) {
        routedLeads++;

        // Check if system recommendation would have succeeded
        // Realistic comparison:
        // 1. Compute score for historically assigned agent
        let assignedAgentScore = 0;
        if (assignedUserId) {
          const assignedAgent = agents.find(a => a.agentUserId === assignedUserId);
          if (assignedAgent) {
            const s = computeScore(industry, assignedAgent);
            assignedAgentScore = s.score;
          }
        }

        // Credit system only if lead was historically won AND recommendation is competitive
        if (isClosedWon) {
          if (assignedUserId === topRecommendation.agentUserId) {
            // System recommended the same person who won
            systemMatchedClosedWon++;
          } else if (topRecommendation.score >= assignedAgentScore) {
            // System recommended someone as good or better
            systemMatchedClosedWon++;
          } else if (topRecommendation.score >= 80) {
            // Even if lower than actual, if score is "Excellent", we credit it
            systemMatchedClosedWon++;
          }
        }
      }

      results.push({
        boardId: boardId,
        itemId: itemId,
        name: leadFact.itemName || `Lead ${itemId}`,
        industry: industry || "Unknown",
        status: statusText || "Unknown",
        wasClosedWon: isClosedWon,
        closedWonAt: leadFact.closedWonAt?.toISOString() || null,
        enteredAt: leadFact.enteredAt?.toISOString() || null,
        assignedTo: assignedUserId
          ? {
            userId: assignedUserId,
            name: assignedUserName || `User ${assignedUserId}`,
          }
          : null,
        recommendedTo: topRecommendation
          ? {
            userId: topRecommendation.agentUserId,
            name: topRecommendation.agentName,
          }
          : null,
        score: topRecommendation?.score || 0,
        breakdown: topRecommendation?.breakdown || {},
        followedRecommendation: assignedUserId && topRecommendation
          ? assignedUserId === topRecommendation.agentUserId
          : null,
      });
    }

    // Calculate success rates
    const systemSuccessRate = routedLeads > 0 ? systemMatchedClosedWon / routedLeads : 0;

    // Current success rate (manual assignments)
    const currentAssignedLeads = results.filter((r) => r.assignedTo != null).length;
    const currentClosedWon = results.filter((r) => r.assignedTo != null && r.wasClosedWon).length;
    const currentSuccessRate = currentAssignedLeads > 0 ? currentClosedWon / currentAssignedLeads : 0;

    // Check if closed won mapping is configured
    const hasClosedWonMapping =
      metricsCfg.closedWonStatusColumnId && metricsCfg.closedWonStatusValue;

    res.json({
      ok: true,
      windowDays,
      hasClosedWonMapping,
      summary: {
        totalLeads,
        routedLeads, // leads that system could route (had agents with scores)
        closedWonLeads, // total leads that closed
        systemSuccessRate: Math.round(systemSuccessRate * 1000) / 10, // percentage
        currentSuccessRate: Math.round(currentSuccessRate * 1000) / 10, // percentage
        improvement: Math.round((systemSuccessRate - currentSuccessRate) * 1000) / 10, // percentage points
      },
      leads: results,
    });
  } catch (error: any) {
    console.error("[Preview/Historical] Error:", error);
    res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message: error.message || "Failed to generate preview",
    });
  }
});

export default router;

