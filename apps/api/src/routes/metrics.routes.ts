import { Router } from "express";
import { validateBody } from "../middlewares/validateBody";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";
import { PrismaAgentMetricsRepo } from "../infrastructure/agentMetrics.repo";
import { recomputeMetricsNow } from "../services/metricsJob";
import { z } from "zod";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";

const ORG_ID = "org_1";

const MetricsConfigPatchZ = z.object({
  leadBoardIds: z.string().optional(),

  conversionWindowDays: z.number().int().min(1).max(365).optional(),
  avgDealWindowDays: z.number().int().min(1).max(365).optional(),
  responseWindowDays: z.number().int().min(1).max(365).optional(),

  hotStreakWindowHours: z.number().int().min(1).max(720).optional(),
  hotStreakMinDeals: z.number().int().min(1).max(100).optional(),

  burnoutWinDecayHours: z.number().int().min(1).max(24*365).optional(),
  burnoutActivityDecayHours: z.number().int().min(1).max(24*365).optional(),

  // weights
  weightIndustryPerf: z.number().int().min(0).max(100).optional(),
  weightConversion: z.number().int().min(0).max(100).optional(),
  weightAvgDeal: z.number().int().min(0).max(100).optional(),
  weightHotStreak: z.number().int().min(0).max(100).optional(),
  weightResponseSpeed: z.number().int().min(0).max(100).optional(),
  weightBurnout: z.number().int().min(0).max(100).optional(),
  weightAvailabilityCap: z.number().int().min(0).max(100).optional(),

  // mappings
  contactedStatusColumnId: z.string().optional(),
  contactedStatusValue: z.string().optional(),
  nextCallDateColumnId: z.string().optional(),
  closedWonStatusColumnId: z.string().optional(),
  closedWonStatusValue: z.string().optional(),
  dealAmountColumnId: z.string().optional(),
  industryColumnId: z.string().optional(),
    assignedPeopleColumnId: z.string().optional(),

    enableIndustryPerf: z.boolean().optional(),
    enableConversion: z.boolean().optional(),
    enableAvgDealSize: z.boolean().optional(),
    enableHotStreak: z.boolean().optional(),
    enableResponseSpeed: z.boolean().optional(),
    enableBurnout: z.boolean().optional(),
    enableAvailabilityCap: z.boolean().optional(),

});

function validateEnabledMappings(cfg: any) {
  const missing: string[] = [];

  // Always required to run metrics job
  if (!cfg.leadBoardIds || String(cfg.leadBoardIds).trim().length === 0) missing.push("leadBoardIds");

  // Assignment mapping is required for agent-based metrics
  if (!cfg.assignedPeopleColumnId || String(cfg.assignedPeopleColumnId).trim().length === 0) missing.push("assignedPeopleColumnId");

  // Conversion/Hot/AvgDeal depend on closed-won mapping
  const needsClosed = cfg.enableConversion !== false || cfg.enableHotStreak !== false || cfg.enableAvgDealSize !== false || cfg.enableIndustryPerf !== false;
  if (needsClosed) {
    if (!cfg.closedWonStatusColumnId) missing.push("closedWonStatusColumnId");
    if (!cfg.closedWonStatusValue) missing.push("closedWonStatusValue");
  }

  if (cfg.enableAvgDealSize !== false) {
    if (!cfg.dealAmountColumnId) missing.push("dealAmountColumnId");
  }

  if (cfg.enableIndustryPerf !== false) {
    if (!cfg.industryColumnId) missing.push("industryColumnId");
  }

  if (cfg.enableResponseSpeed !== false) {
    if (!cfg.contactedStatusColumnId) missing.push("contactedStatusColumnId");
    if (!cfg.contactedStatusValue) missing.push("contactedStatusValue");
    if (!cfg.nextCallDateColumnId) missing.push("nextCallDateColumnId");
  }

  return missing;
}

function normalizeWeights(cfg: any) {
    const enabledFlags: Record<string, string> = {
      weightIndustryPerf: "enableIndustryPerf",
      weightConversion: "enableConversion",
      weightAvgDeal: "enableAvgDealSize",
      weightHotStreak: "enableHotStreak",
      weightResponseSpeed: "enableResponseSpeed",
      weightBurnout: "enableBurnout",
      weightAvailabilityCap: "enableAvailabilityCap",
    };
  const keys = [
      "weightIndustryPerf",
      "weightConversion",
      "weightAvgDeal",
      "weightHotStreak",
      "weightResponseSpeed",
      "weightBurnout",
      "weightAvailabilityCap",
    ];
  const present = keys.filter((k) => typeof cfg[k] === "number") as string[];
  if (!present.length) return cfg;

  const total = keys.reduce((sum, k) => {
      const flag = enabledFlags[k];
      const enabled = flag ? (cfg[flag] !== false) : true;
      const v = enabled ? (Number(cfg[k]) || 0) : 0;
      return sum + v;
    }, 0);

    // force disabled weights to 0
    for (const k of keys) {
      const flag = enabledFlags[k];
      const enabled = flag ? (cfg[flag] !== false) : true;
      if (!enabled) cfg[k] = 0;
    }
  if (total === 100) return cfg;

  // Auto-normalize: scale all weights proportionally to sum=100
  const scaled: any = { ...cfg };
  if (total === 0) {
    // fallback to defaults
    scaled.weightIndustryPerf = 25;
    scaled.weightConversion = 20;
    scaled.weightAvgDeal = 15;
    scaled.weightHotStreak = 10;
    scaled.weightResponseSpeed = 15;
    scaled.weightBurnout = 10;
    scaled.weightAvailabilityCap = 5;
    return scaled;
  }
  const factor = 100 / total;
  let running = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const flag = enabledFlags[k];
      const enabled = flag ? (cfg[flag] !== false) : true;
      const v0 = enabled ? (Number(cfg[k]) || 0) : 0;
      const v = Math.round(v0 * factor);
    scaled[k] = v;
    running += v;
  }
  // fix rounding drift on last key
  const drift = 100 - running;
  scaled[keys[keys.length - 1]] += drift;
  return scaled;
}


async function validateMetricColumnsOnLeadBoards(leadBoardIdsCsv: string, columnsToCheck: Array<{ key: string; columnId?: string | null }>) {
  const leadBoardIds = leadBoardIdsCsv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (!leadBoardIds.length) return { ok: true as const, errors: [] as Array<{ key: string; reason: string }> };

  const client = await createMondayClientForOrg(ORG_ID);

  // build a set of all column IDs that exist on at least one lead board
  const allowed = new Set<string>();
  for (const boardId of leadBoardIds) {
    const cols = await (client as any).listBoardColumns(boardId);
    for (const c of cols) allowed.add(String(c.id));
  }

  const errors: Array<{ key: string; reason: string }> = [];
  for (const entry of columnsToCheck) {
    const id = entry.columnId ? String(entry.columnId) : "";
    if (!id) continue;
    if (!allowed.has(id)) {
      errors.push({ key: entry.key, reason: `Column ${id} is not on any leadBoardIds (${leadBoardIds.join(",")})` });
    }
  }

  return { ok: errors.length === 0, errors };
}

export function metricsRoutes() {
  const r = Router();
  const cfgRepo = new PrismaMetricsConfigRepo();
  const snapRepo = new PrismaAgentMetricsRepo();

  r.get("/config", async (_req, res) => {
    const cfg = await cfgRepo.getOrCreateDefaults();
    return res.json({ ok: true, config: cfg });
  });

  r.put("/config", validateBody(MetricsConfigPatchZ), async (req, res) => {
    const patch = normalizeWeights(req.body);
    const cfg = await cfgRepo.getOrCreateDefaults();
      const merged = { ...cfg, ...patch };
      const missing = validateEnabledMappings(merged);
      if (missing.length) {
        return res.status(400).json({ ok: false, error: "MISSING_REQUIRED_MAPPINGS", missing });
      }

// Phase 1 hard rule: metric columns must exist on one of leadBoardIds.
// If a metric value lives on another board, mirror/copy it into the Lead Board and select the mirrored column.
const scopeCheck = await validateMetricColumnsOnLeadBoards(String(merged.leadBoardIds), [
  { key: "assignedPeopleColumnId", columnId: merged.assignedPeopleColumnId },
  { key: "closedWonStatusColumnId", columnId: merged.closedWonStatusColumnId },
  { key: "contactedStatusColumnId", columnId: merged.contactedStatusColumnId },
  { key: "nextCallDateColumnId", columnId: merged.nextCallDateColumnId },
  { key: "dealAmountColumnId", columnId: merged.dealAmountColumnId },
  { key: "industryColumnId", columnId: merged.industryColumnId },
]);
if (!scopeCheck.ok) {
  return res.status(400).json({ ok: false, error: "COLUMN_NOT_IN_LEAD_BOARDS", details: scopeCheck.errors });
}
    const updated = await cfgRepo.update(patch);
    return res.json({ ok: true, before: cfg, after: updated });
  });

  r.post("/recompute", async (_req, res) => {
    const out = await recomputeMetricsNow();
    return res.json(out);
  });

  r.get("/agents/:agentUserId", async (req, res) => {
    const rows = await snapRepo.get(String(req.params.agentUserId));
    return res.json({ ok: true, snapshots: rows });
  });

  return r;
}