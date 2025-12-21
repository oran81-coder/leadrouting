import { Router } from "express";
import { requireEnv, optionalEnv } from "../config/env";
import { z } from "zod";
import { getPrisma } from "../../../../packages/core/src/db/prisma";
import { PrismaMetricsConfigRepo } from "../infrastructure/metricsConfig.repo";

import { PrismaRoutingStateRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingState.repo";
import { PrismaRoutingSettingsRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingSettings.repo";
import { PrismaRoutingProposalRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingProposal.repo";
import { PrismaRoutingApplyRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingApply.repo";

import { PrismaInternalSchemaRepo } from "../../../../packages/modules/internal-schema/src/infrastructure/internalSchema.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import type { FieldMappingConfig } from "../../../../packages/modules/field-mapping/src/contracts/mapping.types";

import { PrismaRuleSetRepo } from "../../../../packages/modules/rule-engine/src/infrastructure/rules.repo";
import { PrismaAuditRepo } from "../../../../packages/modules/audit-logging/src/infrastructure/audit.repo";

import { validateSchemaAndMapping } from "../../../../packages/core/src/schema/businessValidation";
import { normalizeEntityRecord } from "../../../../packages/core/src/schema/normalization";
import { evaluateRuleSet } from "../../../../packages/modules/rule-engine/src/application/rules.evaluate";

import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { applyAssignmentToMonday, setRoutingMetaOnMonday } from "../../../../packages/modules/monday-integration/src/application/monday.writeback";
import { resolveMondayPersonId } from "../../../../packages/modules/monday-integration/src/application/monday.people";

/**
 * Routing endpoints (Phase 1):
 * - POST /routing/evaluate: dry-run, explainability only (internal payload)
 * - POST /routing/execute: propose + (AUTO apply) or (MANUAL approval queue)
 *
 * Execute supports:
 * - { boardId, itemId } -> fetch from Monday + mapping -> normalize -> evaluate
 * - OR { lead: { <internalFieldId>: value } } (no writeback possible in AUTO)
 */
export function routingRoutes() {
  const r = Router();

  const schemaRepo = new PrismaInternalSchemaRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();
  const rulesRepo = new PrismaRuleSetRepo();
  const stateRepo = new PrismaRoutingStateRepo();
  const settingsRepo = new PrismaRoutingSettingsRepo();
  const proposalRepo = new PrismaRoutingProposalRepo();
  const applyRepo = new PrismaRoutingApplyRepo();
  const auditRepo = new PrismaAuditRepo();

  const ORG_ID = "org_1"; // TODO auth/JWT

  function mapMondayItemToInternalRaw(item: any, mapping: FieldMappingConfig): Record<string, any> {
    const byId = new Map<string, any>();
    for (const cv of item.column_values ?? []) byId.set(cv.id, cv);

    const raw: Record<string, any> = {};
    for (const [fieldId, ref] of Object.entries(mapping.mappings ?? {})) {
      const cv = byId.get((ref as any).columnId);
      if (!cv) continue;
      if (cv.type === 'status' || cv.type === 'dropdown') {
        try {
          raw[fieldId] = cv.value ? JSON.parse(cv.value) : null;
        } catch {
          raw[fieldId] = cv.text ?? null;
        }
      } else {
        raw[fieldId] = cv.text ?? null;
      }
    }
    return raw;
  }

  r.post("/evaluate", async (req, res) => {
    try {
      const state = await stateRepo.get(ORG_ID);
      if (!state?.isEnabled) {
        return res.status(400).json({ ok: false, error: "Routing is not enabled for org. Enable via /admin/routing/enable." });
      }

      const schema = await schemaRepo.getLatest(ORG_ID);
      const mapping = await mappingRepo.getLatest(ORG_ID);
      const rules = await rulesRepo.getLatest(ORG_ID);

      if (!schema || !mapping || !rules) {
        return res.status(400).json({ ok: false, error: "Missing latest schema/mapping/rules." });
      }

      const biz = validateSchemaAndMapping(schema as any, mapping as any);
      if (!biz.ok) return res.status(400).json({ ok: false, error: "Business validation failed", issues: biz.issues });

      const raw = req.body?.lead ?? {};
      if (typeof raw !== "object" || !raw) {
        return res.status(400).json({ ok: false, error: "Invalid body. Expected { lead: { <internalFieldId>: value } }" });
      }

      const norm = normalizeEntityRecord(schema as any, "lead", raw as any);
      if (norm.errors.length) {
        return res.status(400).json({ ok: false, error: "Normalization failed", normalizationErrors: norm.errors });
      }

      const result = evaluateRuleSet(norm.values as any, rules as any);

      await auditRepo.log({
        orgId: ORG_ID,
        actorUserId: "system",
        action: "routing.evaluate",
        entityType: "Lead",
        entityId: null,
        before: null,
        after: { values: norm.values, selectedRule: result.selectedRule },
      });

      return res.json({
        ok: true,
        normalizedValues: norm.values,
        matched: result.matched,
        selectedRule: result.selectedRule ?? null,
        explains: result.explains,
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  r.post("/execute", async (req, res) => {
    try {
      const state = await stateRepo.get(ORG_ID);
      if (!state?.isEnabled) {
        return res.status(400).json({ ok: false, error: "Routing is not enabled for org. Enable via /admin/routing/enable." });
      }

      const schema = await schemaRepo.getLatest(ORG_ID);
      const mapping = await mappingRepo.getLatest(ORG_ID);
      const rules = await rulesRepo.getLatest(ORG_ID);
      if (!schema || !mapping || !rules) {
        return res.status(400).json({ ok: false, error: "Missing latest schema/mapping/rules." });
      }

      const biz = validateSchemaAndMapping(schema as any, mapping as any);
      if (!biz.ok) return res.status(400).json({ ok: false, error: "Business validation failed", issues: biz.issues });

      const settings = await settingsRepo.get(ORG_ID);
      let mode = settings.mode;
      if (forceManual || triggerReason === "INDUSTRY_CHANGED") mode = "MANUAL_APPROVAL";

      const boardId = req.body?.boardId ? String(req.body.boardId) : null;
      const itemId = req.body?.itemId ? String(req.body.itemId) : null;

      let rawLead: Record<string, any> = {};
      let usedBoardId: string | null = null;
      let usedItemId: string | null = null;

      if ((boardId && itemId) || (!boardId && itemId)) {
        const client = await createMondayClientForOrg(ORG_ID);

        const fetched = boardId ? await client.fetchItem(boardId, itemId!) : await client.fetchItemById(itemId!);
        usedBoardId = String(fetched.boardId);
        usedItemId = String(fetched.item.id);

        rawLead = mapMondayItemToInternalRaw(fetched.item, mapping as any);
      } else {
        rawLead = req.body?.lead ?? {};
      }

      const norm = normalizeEntityRecord(schema as any, "lead", rawLead as any);
      if (norm.errors.length) {
        return res.status(400).json({ ok: false, error: "Normalization failed", normalizationErrors: norm.errors });
      }

      const evalResult = evaluateRuleSet(norm.values as any, rules as any);

      if (!evalResult.matched || !evalResult.selectedRule) {
        return res.json({ ok: true, matched: false, selectedRule: null, explains: evalResult.explains, mode });
      }

      // Idempotency per item+versions (prevents duplicate proposals on retries)
      const idempotencyKey = `${usedBoardId ?? boardId ?? "unknown"}::${usedItemId ?? itemId ?? "unknown"}::schema:${(schema as any).version}::mapping:${(mapping as any).version}::rules:${(rules as any).version}`;

      const proposal = await proposalRepo.create({
        idempotencyKey,
        orgId: ORG_ID,
        boardId: usedBoardId ?? (boardId ?? "unknown"),
        itemId: usedItemId ?? (itemId ?? "unknown"),
        normalizedValues: norm.values,
        selectedRule: evalResult.selectedRule,
        action: evalResult.selectedRule.action,
        explainability: evalResult.explains,
      });

      await auditRepo.log({
        orgId: ORG_ID,
        actorUserId: "system",
        action: "routing.propose",
        entityType: "RoutingProposal",
        entityId: proposal.id,
        before: null,
        after: { proposalId: proposal.id, selectedRule: evalResult.selectedRule, mode, triggerReason },
      });

      const reason = `${evalResult.selectedRule.name} (#${evalResult.selectedRule.id})`;

      if (mode === "MANUAL_APPROVAL") {
        // Optional: mark item as Pending Approval in Monday (status/reason only)
        if (usedBoardId && usedItemId) {
          try {
            const client = await createMondayClientForOrg(ORG_ID);
            await setRoutingMetaOnMonday(client as any, (mapping as any).writebackTargets, {
              boardId: usedBoardId,
              itemId: usedItemId,
              status: "Pending Approval",
              reason,
            });
          } catch {
            // Non-fatal: proposal is still created; UI can show pending approval internally
          }
        }

        return res.json({
          ok: true,
          mode,
          status: "PROPOSED",
          proposalId: proposal.id,
          matched: true,
          selectedRule: evalResult.selectedRule,
          explains: evalResult.explains,
        });
      }

      // AUTO mode => apply writeback immediately (requires boardId/itemId)
      if (!usedBoardId || !usedItemId || usedBoardId === "unknown" || usedItemId === "unknown") {
        return res.status(400).json({
          ok: false,
          error: "AUTO mode requires { boardId, itemId } so we can write back to Monday.",
          mode,
          proposalId: proposal.id,
        });
      }

      const client = await createMondayClientForOrg(ORG_ID);

      const targets = (mapping as any).writebackTargets;
        let assigneeResolvedValue = String(evalResult.selectedRule.action.value);
        if (targets?.assignedAgent?.columnType === 'people') {
          assigneeResolvedValue = String(await resolveMondayPersonId(client as any, ORG_ID, assigneeResolvedValue));
        }

        
      const guard = await applyRepo.tryBegin(ORG_ID, proposal.id);
      if (guard === "ALREADY") {
        await proposalRepo.markApplied(ORG_ID, proposal.id);
        return res.json({ ok: true, mode, status: "APPLIED", alreadyApplied: true, proposalId: proposal.id });
      }

await applyAssignmentToMonday(client as any, targets, {
        boardId: usedBoardId,
        itemId: usedItemId,
        assigneeValue: assigneeResolvedValue,
        reason,
        status: "Assigned",
      });

      await proposalRepo.markApplied(ORG_ID, proposal.id);

      await auditRepo.log({
        orgId: ORG_ID,
        actorUserId: "system",
        action: "routing.apply",
        entityType: "RoutingProposal",
        entityId: proposal.id,
        before: null,
        after: { proposalId: proposal.id, applied: true, mode: "AUTO" },
      });

      return res.json({
        ok: true,
        mode,
        status: "APPLIED",
        proposalId: proposal.id,
        matched: true,
        selectedRule: evalResult.selectedRule,
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });


/**
 * Routing Preview (Admin-only): simulation mode
 * - Reads N recent leads from Lead Boards
 * - Computes agent scores + breakdown (0..10)
 * - NO writeback, NO persistence, NO approvals
 */
r.post("/preview", async (req, res) => {
  const Body = z.object({ limit: z.number().int().min(1).max(50).default(10) });
  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() });

  const limit = parsed.data.limit;

  const metricsCfgRepo = new PrismaMetricsConfigRepo();
  const metricsCfg = await metricsCfgRepo.getOrCreateDefaults();
  if (!metricsCfg.leadBoardIds || String(metricsCfg.leadBoardIds).trim().length === 0) {
    return res.status(400).json({ ok: false, error: "LEAD_BOARDS_NOT_CONFIGURED" });
  }

  const leadBoardIds = String(metricsCfg.leadBoardIds)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const client = await createMondayClientForOrg(ORG_ID);

  // Fetch samples (distribute limit across boards)
  const perBoard = Math.max(1, Math.ceil(limit / Math.max(1, leadBoardIds.length)));
  const samples = await client.fetchBoardSamples(leadBoardIds as any, perBoard);

  const allItems: Array<{ boardId: string; item: any }> = [];
  for (const b of samples) {
    for (const it of b.items ?? []) allItems.push({ boardId: String(b.boardId), item: it });
  }

  function parsePeopleUserId(col: any): string | null {
    const raw = col?.value ?? null;
    if (!raw) return null;
    try {
      const j = JSON.parse(raw);
      const persons = (j?.personsAndTeams ?? j?.persons_and_teams ?? []) as any[];
      const first = persons?.[0];
      if (!first) return null;
      return first?.id ? String(first.id) : null;
    } catch {
      return null;
    }
  }

  function findText(cvs: any[], colId?: string | null): string | null {
    if (!colId) return null;
    const c = cvs.find((x: any) => String(x.id) === String(colId));
    const t = (c?.text ?? "").trim();
    return t || null;
  }

  function parseIndustryPerf(jsonStr: string): Record<string, number> {
    try {
      const j = JSON.parse(jsonStr || "{}");
      if (!j || typeof j !== "object") return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(j as any)) {
        const n = Number(v);
        if (Number.isFinite(n)) out[String(k).toLowerCase()] = n;
      }
      return out;
    } catch {
      return {};
    }
  }

  function clamp01(x: number) {
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
  }

  const AVG_DEAL_REF = Number(optionalEnv("PREVIEW_AVG_DEAL_REF", "20000")) || 20000;
  const RESPONSE_REF_MINS = Number(optionalEnv("PREVIEW_RESPONSE_REF_MINS", "240")) || 240;

  // Build list of candidate agents based on metrics snapshots present in DB
  const prisma = getPrisma();
  const windowDays = Array.from(new Set([metricsCfg.conversionWindowDays, metricsCfg.avgDealWindowDays, metricsCfg.responseWindowDays]));
  const agentRows = await prisma.agentMetricsSnapshot.findMany({
    where: { orgId: ORG_ID, windowDays: { in: windowDays as any } },
    select: { agentUserId: true },
    distinct: ["agentUserId"],
  });
  const agentIds = agentRows.map((r) => String(r.agentUserId)); 

  async function loadAgent(agentUserId: string) {
    const snaps = await prisma.agentMetricsSnapshot.findMany({
      where: { orgId: ORG_ID, agentUserId },
      orderBy: { windowDays: "asc" },
    });
    const byWindow = new Map<number, any>();
    for (const s of snaps) byWindow.set(Number(s.windowDays), s);

    const conv = byWindow.get(Number(metricsCfg.conversionWindowDays)) ?? byWindow.get(windowDays[0]);
    const avg = byWindow.get(Number(metricsCfg.avgDealWindowDays)) ?? byWindow.get(windowDays[0]);
    const resp = byWindow.get(Number(metricsCfg.responseWindowDays)) ?? byWindow.get(windowDays[0]);

    // name resolution: try cache; fallback to userId string
    const cached = await prisma.mondayUserCache.findFirst({ where: { orgId: ORG_ID, userId: agentUserId } });
    const name = cached?.name ? String(cached.name) : agentUserId;

    return {
      agentUserId,
      name,
      conv,
      avg,
      resp,
      anySnap: snaps[0] ?? null,
    };
  }

  const agents = await Promise.all(agentIds.map(loadAgent));

  // Filter leads: skip leads that already have assignee in configured people column
  const leads = allItems
    .map((x) => {
      const cvs = x.item.column_values ?? [];
      const alreadyAssigned =
        metricsCfg.assignedPeopleColumnId ? !!parsePeopleUserId(cvs.find((c: any) => String(c.id) === String(metricsCfg.assignedPeopleColumnId))) : false;

      const industry = metricsCfg.enableIndustryPerf === false ? null : findText(cvs, metricsCfg.industryColumnId);
      return {
        boardId: x.boardId,
        itemId: String(x.item.id),
        name: String(x.item.name ?? ""),
        industry,
        alreadyAssigned,
      };
    })
    .filter((l) => !l.alreadyAssigned)
    .slice(0, limit);

  // compute scores
  function computeScore(leadIndustry: string | null, a: any) {
    const ind = (leadIndustry ?? "").trim().toLowerCase();

    const perf = parseIndustryPerf(String(a.anySnap?.industryPerfJson ?? "{}"));
    const industryRate = ind && perf[ind] != null ? clamp01(Number(perf[ind])) : 0.5; // fallback 0.5

    const conversionRate = clamp01(Number(a.conv?.conversionRate ?? 0));
    const avgDeal = Math.max(0, Number(a.avg?.avgDealSize ?? 0));
    const avgDealNorm = clamp01(avgDeal / AVG_DEAL_REF);

    const isHot = a.anySnap?.isHot ? 1 : 0;
    const hotNorm = isHot ? 1 : clamp01(Number(a.anySnap?.hotDealsCount ?? 0) / Math.max(1, Number(metricsCfg.hotStreakMinDeals ?? 1)));

    const respMins = Math.max(0, Number(a.resp?.medianResponseMinutes ?? 0));
    const respNorm = 1 - clamp01(respMins / RESPONSE_REF_MINS);

    const burnout = clamp01(Number(a.anySnap?.burnoutScore ?? 0));

    const comp: Record<string, number> = {
      industryPerf: industryRate * 10,
      conversion: conversionRate * 10,
      avgDeal: avgDealNorm * 10,
      hotStreak: hotNorm * 10,
      responseSpeed: respNorm * 10,
      burnout: burnout * 10,
      availabilityCap: 10, // Phase 1 preview: we don't subtract here (cap enforced in routing apply)
    };

    // apply toggles
    if (metricsCfg.enableIndustryPerf === false) comp.industryPerf = 0;
    if (metricsCfg.enableConversion === false) comp.conversion = 0;
    if (metricsCfg.enableAvgDealSize === false) comp.avgDeal = 0;
    if (metricsCfg.enableHotStreak === false) comp.hotStreak = 0;
    if (metricsCfg.enableResponseSpeed === false) comp.responseSpeed = 0;
    if (metricsCfg.enableBurnout === false) comp.burnout = 0;
    if (metricsCfg.enableAvailabilityCap === false) comp.availabilityCap = 0;

    const weights: Record<string, number> = {
      industryPerf: Number(metricsCfg.weightIndustryPerf ?? 0),
      conversion: Number(metricsCfg.weightConversion ?? 0),
      avgDeal: Number(metricsCfg.weightAvgDeal ?? 0),
      hotStreak: Number(metricsCfg.weightHotStreak ?? 0),
      responseSpeed: Number(metricsCfg.weightResponseSpeed ?? 0),
      burnout: Number(metricsCfg.weightBurnout ?? 0),
      availabilityCap: Number(metricsCfg.weightAvailabilityCap ?? 0),
    };

    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const [k, w] of Object.entries(weights)) {
      const points = (w / 100) * (comp[k] ?? 0);
      breakdown[k] = Math.round(points * 100) / 100;
      total += points;
    }

    total = Math.round(total * 100) / 100;

    return { score: total, breakdown, components: comp };
  }

  const result = leads.map((l) => {
    const scored = agents
      .map((a) => {
        const s = computeScore(l.industry, a);
        return {
          agentUserId: a.agentUserId,
          agentName: a.name,
          score: s.score,
          breakdown: s.breakdown,
        };
      })
      .sort((x, y) => y.score - x.score);

    return {
      lead: { boardId: l.boardId, itemId: l.itemId, name: l.name, industry: l.industry },
      agents: scored,
      winner: scored[0] ? { agentUserId: scored[0].agentUserId, agentName: scored[0].agentName, score: scored[0].score } : null,
    };
  });

  return res.json({ ok: true, limit, results: result });
});
  return r;
}