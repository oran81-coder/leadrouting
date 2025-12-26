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

  /**
   * Safe audit logging helper (non-fatal)
   */
  async function safeAudit(evt: any): Promise<void> {
    try {
      await auditRepo.log(evt);
    } catch (e: any) {
      if (process.env.DEBUG_PREVIEW === "1") {
        console.warn("[safeAudit] Failed to log audit event:", e?.message ?? String(e));
      }
    }
  }

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
      if (process.env.DEBUG_PREVIEW === "1") {
        console.log("[routing/evaluate] req.body:", JSON.stringify(req.body));
        console.log("[routing/evaluate] hasItem:", !!(req.body && req.body.item));
        console.log("[routing/evaluate] hasLead:", !!(req.body && req.body.lead));
      }

      const routingState = await stateRepo.get(ORG_ID);
      
      // Phase 1.2: Version pinning when routing enabled
      let schema: any;
      let mapping: any;
      let rules: any;
      let effectiveSource: "pinned" | "latest";

      if (routingState?.isEnabled && routingState.schemaVersion != null && routingState.mappingVersion != null) {
        // PINNED: Use versions from routing state snapshot
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/evaluate] Using PINNED versions from routing state");
        }
        
        schema = await schemaRepo.getByVersion(ORG_ID, routingState.schemaVersion);
        mapping = await mappingRepo.getByVersion(ORG_ID, routingState.mappingVersion);
        rules = routingState.rulesVersion != null 
          ? await rulesRepo.getByVersion(ORG_ID, routingState.rulesVersion)
          : null;
        effectiveSource = "pinned";

        if (!schema || !mapping) {
          return res.status(400).json({ 
            ok: false, 
            error: "Pinned versions not found in DB. Schema or mapping may have been deleted.",
            requestedVersions: {
              schemaVersion: routingState.schemaVersion,
              mappingVersion: routingState.mappingVersion,
              rulesVersion: routingState.rulesVersion,
            }
          });
        }
      } else {
        // LATEST: Use latest versions (existing behavior)
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/evaluate] Using LATEST versions");
        }
        
        schema = await schemaRepo.getLatest(ORG_ID);
        mapping = await mappingRepo.getLatest(ORG_ID);
        rules = await rulesRepo.getLatest(ORG_ID);
        effectiveSource = "latest";

        if (!schema || !mapping) {
          return res.status(400).json({ ok: false, error: "Missing latest schema/mapping. Save via /admin/schema and /admin/mapping." });
        }
      }

      const biz = validateSchemaAndMapping(schema as any, mapping as any);
      if (!biz.ok) return res.status(400).json({ ok: false, error: "Business validation failed", issues: biz.issues });

      // Phase 1: Support both formats:
      // A) { item: { id, column_values: [...] } } - Monday mock format
      // B) { lead: { <internalFieldId>: value } } - Direct internal format
      let raw: Record<string, any> = {};

      if (req.body && req.body.item) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/evaluate] MOCK ITEM branch - using Monday item format");
        }
        // Convert Monday item to internal raw using mapping
        raw = mapMondayItemToInternalRaw(req.body.item, mapping as any);
      } else if (req.body && req.body.lead) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/evaluate] DIRECT LEAD branch - using internal format");
        }
        raw = req.body.lead;
      } else {
        return res.status(400).json({ 
          ok: false, 
          error: "Invalid body. Expected { item: {...} } (Monday mock) or { lead: { <internalFieldId>: value } }" 
        });
      }

      if (typeof raw !== "object" || !raw) {
        return res.status(400).json({ ok: false, error: "Invalid raw data after parsing" });
      }

      const norm = normalizeEntityRecord(schema as any, "lead", raw as any);
      if (norm.errors.length) {
        return res.status(400).json({ ok: false, error: "Normalization failed", normalizationErrors: norm.errors });
      }

      // Phase 1: Allow dry-run even if no rules configured
      if (!rules) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/evaluate] No rules configured - returning null match");
        }
        return res.json({
          ok: true,
          normalizedValues: norm.values,
          matched: false,
          selectedRule: null,
          matchedRuleId: null,
          assignedTo: null,
          reason: "No rules configured for this org",
          schemaVersion: (schema as any).version,
          mappingVersion: (mapping as any).version,
          rulesVersion: null,
          routingEnabled: routingState?.isEnabled ?? false,
          routingSnapshot: routingState ? {
            schemaVersion: routingState.schemaVersion,
            mappingVersion: routingState.mappingVersion,
            rulesVersion: routingState.rulesVersion,
          } : null,
          effectiveVersions: {
            schemaVersion: (schema as any).version,
            mappingVersion: (mapping as any).version,
            rulesVersion: null,
            source: effectiveSource,
          },
        });
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
        matchedRuleId: result.selectedRule?.id ?? null,
        assignedTo: result.selectedRule?.action?.value ?? null,
        reason: result.selectedRule ? `Matched rule: ${result.selectedRule.name}` : "No matching rule",
        explains: result.explains,
        schemaVersion: (schema as any).version,
        mappingVersion: (mapping as any).version,
        rulesVersion: (rules as any).version,
        routingEnabled: routingState?.isEnabled ?? false,
        routingSnapshot: routingState ? {
          schemaVersion: routingState.schemaVersion,
          mappingVersion: routingState.mappingVersion,
          rulesVersion: routingState.rulesVersion,
        } : null,
        effectiveVersions: {
          schemaVersion: (schema as any).version,
          mappingVersion: (mapping as any).version,
          rulesVersion: (rules as any).version,
          source: effectiveSource,
        },
      });
    } catch (e: any) {
      console.error("[routing/evaluate] Error:", e?.message ?? String(e));
      return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  r.post("/execute", async (req, res) => {
    try {
      if (process.env.DEBUG_PREVIEW === "1") {
        console.log("[routing/execute] req.body:", JSON.stringify(req.body));
        console.log("[routing/execute] hasItem:", !!(req.body && req.body.item));
        console.log("[routing/execute] hasLead:", !!(req.body && req.body.lead));
      }

      const routingState = await stateRepo.get(ORG_ID);
      
      // Phase 1.3: Version pinning (same logic as evaluate)
      let schema: any;
      let mapping: any;
      let rules: any;
      let effectiveSource: "pinned" | "latest";

      if (routingState?.isEnabled && routingState.schemaVersion != null && routingState.mappingVersion != null) {
        // PINNED: Use versions from routing state snapshot
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/execute] Using PINNED versions from routing state");
        }
        
        schema = await schemaRepo.getByVersion(ORG_ID, routingState.schemaVersion);
        mapping = await mappingRepo.getByVersion(ORG_ID, routingState.mappingVersion);
        rules = routingState.rulesVersion != null 
          ? await rulesRepo.getByVersion(ORG_ID, routingState.rulesVersion)
          : null;
        effectiveSource = "pinned";

        if (!schema || !mapping) {
          return res.status(400).json({ 
            ok: false, 
            error: "Pinned versions not found in DB. Schema or mapping may have been deleted.",
            requestedVersions: {
              schemaVersion: routingState.schemaVersion,
              mappingVersion: routingState.mappingVersion,
              rulesVersion: routingState.rulesVersion,
            }
          });
        }
      } else {
        // LATEST: Use latest versions
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/execute] Using LATEST versions");
        }
        
        schema = await schemaRepo.getLatest(ORG_ID);
        mapping = await mappingRepo.getLatest(ORG_ID);
        rules = await rulesRepo.getLatest(ORG_ID);
        effectiveSource = "latest";

        if (!schema || !mapping) {
          return res.status(400).json({ ok: false, error: "Missing latest schema/mapping. Save via /admin/schema and /admin/mapping." });
        }
      }

      const biz = validateSchemaAndMapping(schema as any, mapping as any);
      if (!biz.ok) return res.status(400).json({ ok: false, error: "Business validation failed", issues: biz.issues });

      // Phase 1.3: Support both mock item and direct lead formats
      let raw: Record<string, any> = {};
      let inputSource: "mock_item" | "direct_lead";
      let itemId: string | null = null;

      if (req.body && req.body.item) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/execute] MOCK ITEM branch - using Monday item format");
        }
        raw = mapMondayItemToInternalRaw(req.body.item, mapping as any);
        inputSource = "mock_item";
        itemId = req.body.item.id ?? null;
      } else if (req.body && req.body.lead) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/execute] DIRECT LEAD branch - using internal format");
        }
        raw = req.body.lead;
        inputSource = "direct_lead";
      } else {
        return res.status(400).json({ 
          ok: false, 
          error: "Invalid body. Expected { item: {...} } (Monday mock) or { lead: { <internalFieldId>: value } }" 
        });
      }

      if (typeof raw !== "object" || !raw) {
        return res.status(400).json({ ok: false, error: "Invalid raw data after parsing" });
      }

      const norm = normalizeEntityRecord(schema as any, "lead", raw as any);
      if (norm.errors.length) {
        return res.status(400).json({ ok: false, error: "Normalization failed", normalizationErrors: norm.errors });
      }

      // Phase 1.3: Handle no rules gracefully
      if (!rules) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[routing/execute] No rules configured - returning null match");
        }

        await safeAudit({
          orgId: ORG_ID,
          actorUserId: "system",
          action: "routing.execute",
          entityType: "Lead",
          entityId: itemId,
          before: null,
          after: { values: norm.values, matched: false, reason: "No rules" },
        });

        return res.json({
          ok: true,
          mode: "execute_lite",
          matched: false,
          matchedRuleId: null,
          assignedTo: null,
          reason: "No rules configured for this org",
          routingEnabled: routingState?.isEnabled ?? false,
          routingSnapshot: routingState ? {
            schemaVersion: routingState.schemaVersion,
            mappingVersion: routingState.mappingVersion,
            rulesVersion: routingState.rulesVersion,
          } : null,
          effectiveVersions: {
            schemaVersion: (schema as any).version,
            mappingVersion: (mapping as any).version,
            rulesVersion: null,
            source: effectiveSource,
          },
          input: {
            source: inputSource,
            itemId: itemId,
            leadId: null,
          },
        });
      }

      const evalResult = evaluateRuleSet(norm.values as any, rules as any);

      // Phase 1.4: Check routing mode and branch accordingly
      if (routingState?.isEnabled) {
        const settings = await settingsRepo.get(ORG_ID);
        
        if (settings.mode === "MANUAL_APPROVAL") {
          // MANUAL_APPROVAL: Create proposal
          if (inputSource === "direct_lead") {
            return res.status(400).json({
              ok: false,
              error: "MANUAL_APPROVAL mode requires item format with boardId and itemId. Use { item: {...} } or disable routing to use direct lead format."
            });
          }

          const boardId = req.body.item?.boardId ?? "mock_board";
          const itemName = req.body.item?.name ?? null; // Extract item name
          const idempotencyKey = `${boardId}_${itemId}_${(schema as any).version}_${(mapping as any).version}_${(rules as any).version}`;

          const proposal = await proposalRepo.create({
            orgId: ORG_ID,
            idempotencyKey,
            boardId,
            itemId: itemId!,
            itemName, // Add itemName to proposal
            normalizedValues: norm.values,
            selectedRule: evalResult.selectedRule,
            action: evalResult.selectedRule?.action,
            explainability: evalResult.explains,
          });

          await safeAudit({
            orgId: ORG_ID,
            actorUserId: "system",
            action: "routing.execute.manual_proposal_created",
            entityType: "RoutingProposal",
            entityId: proposal.id,
            before: null,
            after: { proposalId: proposal.id, idempotencyKey },
          });

          return res.json({
            ok: true,
            mode: "manual_approval",
            proposalId: proposal.id,
            proposalStatus: proposal.status,
            matchedRuleId: evalResult.selectedRule?.id ?? null,
            assignedTo: evalResult.selectedRule?.action?.value ?? null,
            idempotent: proposal.status === "APPLIED",
            effectiveVersions: {
              schemaVersion: (schema as any).version,
              mappingVersion: (mapping as any).version,
              rulesVersion: (rules as any).version,
              source: effectiveSource,
            },
          });

        } else if (settings.mode === "AUTO") {
          // AUTO: Simulate apply (writeback disabled in Phase 1.4)
          if (inputSource === "direct_lead") {
            return res.status(400).json({
              ok: false,
              error: "AUTO mode requires item format with boardId and itemId. Use { item: {...} } or disable routing to use direct lead format."
            });
          }

          const boardId = req.body.item?.boardId ?? "mock_board";
          const idempotencyKey = `${boardId}_${itemId}_${(schema as any).version}_${(mapping as any).version}_${(rules as any).version}`;

          const guard = await applyRepo.tryBegin(ORG_ID, idempotencyKey);

          await safeAudit({
            orgId: ORG_ID,
            actorUserId: "system",
            action: "routing.execute.auto_applied",
            entityType: "Lead",
            entityId: itemId,
            before: null,
            after: { 
              idempotencyKey, 
              matched: evalResult.matched, 
              assignedTo: evalResult.selectedRule?.action?.value,
              idempotent: guard === "ALREADY"
            },
          });

          return res.json({
            ok: true,
            mode: "auto",
            applied: true,
            matchedRuleId: evalResult.selectedRule?.id ?? null,
            assignedTo: evalResult.selectedRule?.action?.value ?? null,
            writeback: {
              attempted: false,
              reason: "disabled_in_phase1_4",
              note: "Monday writeback will be enabled in Phase 1.5 after validation"
            },
            idempotent: guard === "ALREADY",
            effectiveVersions: {
              schemaVersion: (schema as any).version,
              mappingVersion: (mapping as any).version,
              rulesVersion: (rules as any).version,
              source: effectiveSource,
            },
          });
        }
      }

      // Phase 1.3 fallback: execute-lite mode (routing disabled or mode not configured)
      await safeAudit({
        orgId: ORG_ID,
        actorUserId: "system",
        action: "routing.execute",
        entityType: "Lead",
        entityId: itemId,
        before: null,
        after: { values: norm.values, selectedRule: evalResult.selectedRule },
      });

      return res.json({
        ok: true,
        mode: "execute_lite",
        matched: evalResult.matched,
        matchedRuleId: evalResult.selectedRule?.id ?? null,
        assignedTo: evalResult.selectedRule?.action?.value ?? null,
        reason: evalResult.selectedRule ? `Matched rule: ${evalResult.selectedRule.name}` : "No matching rule",
        routingEnabled: routingState?.isEnabled ?? false,
        routingSnapshot: routingState ? {
          schemaVersion: routingState.schemaVersion,
          mappingVersion: routingState.mappingVersion,
          rulesVersion: routingState.rulesVersion,
        } : null,
        effectiveVersions: {
          schemaVersion: (schema as any).version,
          mappingVersion: (mapping as any).version,
          rulesVersion: (rules as any).version,
          source: effectiveSource,
        },
        input: {
          source: inputSource,
          itemId: itemId,
          leadId: null,
        },
      });
    } catch (e: any) {
      console.error("[routing/execute] Error:", e?.message ?? String(e));
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