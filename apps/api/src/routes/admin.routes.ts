import { Router } from "express";

import { createMondayClient } from "../../../../packages/modules/monday-integration/src/application/monday.clientFactory";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { refreshMondayUsersCache } from "../../../../packages/modules/monday-integration/src/application/monday.people";
import { registerMondayWebhook } from "../../../../packages/modules/monday-integration/src/application/monday.webhooks";

import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";
import { PrismaMondayUserCacheRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";

import { validateBody } from "../middlewares/validateBody";
import { InternalSchemaZ } from "../../../../packages/core/src/schema/zodSchemas";
import { validateSchemaAndMapping } from "../../../../packages/core/src/schema/businessValidation";
import { FieldMappingConfigZ } from "../../../../packages/modules/field-mapping/src/contracts/mapping.zod";

import { PrismaInternalSchemaRepo } from "../../../../packages/modules/internal-schema/src/infrastructure/internalSchema.repo";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaRuleSetRepo } from "../../../../packages/modules/rule-engine/src/infrastructure/rules.repo";
import { RuleSetZ } from "../../../../packages/modules/rule-engine/src/contracts/rules.zod";
import { PrismaRoutingSettingsRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingSettings.repo";
import { PrismaRoutingStateRepo } from "../../../../packages/modules/routing-state/src/infrastructure/routingState.repo";

import { PrismaAuditRepo } from "../../../../packages/modules/audit-logging/src/infrastructure/audit.repo";
import { loadHistoricalLeads } from "../services/historyLoader";
import { calculateAllAgentProfiles } from "../../../../packages/modules/agent-profiling/src/application/agentProfiler";
import { PrismaAgentProfileRepo } from "../infrastructure/agentProfile.repo";
import { env } from "../config/env";

/**
 * Phase 1 Admin routes (single-org, rule-based).
 * Auth handled upstream via requireApiKey.
 */
export function adminRoutes() {
  console.log("[adminRoutes] loaded");

  const r = Router();

  const ORG_ID = "org_1";       // Phase 1: single org
  const ACTOR_ID = "admin";     // Phase 1: static actor

  const schemaRepo = new PrismaInternalSchemaRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();
  const rulesRepo = new PrismaRuleSetRepo();
  const routingStateRepo = new PrismaRoutingStateRepo();
  const routingSettingsRepo = new PrismaRoutingSettingsRepo();
  const auditRepo = new PrismaAuditRepo();
  const credRepo = new PrismaMondayCredentialRepo();

  // Defensive audit helper: never crash the endpoint due to audit failures
  async function safeAudit(params: {
    orgId: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string | null;
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    try {
      await auditRepo.log(params as any);
    } catch (err) {
      console.error("[safeAudit] Audit log failed (non-fatal):", err);
    }
  }

  // -------------------------
  // Sanity
  // -------------------------
  r.get("/", (_req, res) => {
    return res.json({ ok: true, admin: true });
  });

  // -------------------------
  // Schema + Mapping
  // -------------------------
  r.get("/schema/latest", async (_req, res) => {
    const s = await schemaRepo.getLatest(ORG_ID);
    return res.json({ ok: true, schema: s });
  });

  r.get("/mapping/latest", async (_req, res) => {
    const m = await mappingRepo.getLatest(ORG_ID);
    return res.json({ ok: true, mapping: m });
  });

  r.get("/validate", async (_req, res) => {
    const s = await schemaRepo.getLatest(ORG_ID);
    const m = await mappingRepo.getLatest(ORG_ID);

    if (!s || !m) {
      return res.status(400).json({
        ok: false,
        error: "Missing schema or mapping (latest).",
        schemaExists: !!s,
        mappingExists: !!m,
      });
    }

    const biz = validateSchemaAndMapping(s as any, m as any);
    return res.json({ ok: biz.ok, issues: biz.issues });
  });

  r.post("/schema", validateBody(InternalSchemaZ), async (req, res) => {
    const payload = req.body;
    const before = await schemaRepo.getLatest(ORG_ID);

    const saved = await schemaRepo.saveNewVersion(ORG_ID, payload, ACTOR_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "schema.saveNewVersion",
      entityType: "InternalSchema",
      entityId: String(saved.version),
      before,
      after: payload,
    });

    return res.json({ ok: true, version: saved.version });
  });

  r.post("/mapping", validateBody(FieldMappingConfigZ), async (req, res) => {
    const payload = req.body;
    const before = await mappingRepo.getLatest(ORG_ID);

    const saved = await mappingRepo.saveNewVersion(ORG_ID, payload, ACTOR_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "mapping.saveNewVersion",
      entityType: "FieldMappingConfig",
      entityId: String(saved.version),
      before,
      after: payload,
    });

    return res.json({ ok: true, version: saved.version });
  });

  // -------------------------
  // Rules (Phase 1 glue)
  // -------------------------
  r.get("/rules/latest", async (_req, res) => {
    const latest = await rulesRepo.getLatest(ORG_ID);
    return res.json({ ok: true, rules: latest });
  });

  r.post("/rules", validateBody(RuleSetZ), async (req, res) => {
    const payload = req.body;
    const before = await rulesRepo.getLatest(ORG_ID);

    const saved = await rulesRepo.saveNewVersion(ORG_ID, payload, ACTOR_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "rules.saveNewVersion",
      entityType: "RuleSet",
      entityId: String(saved.version),
      before,
      after: payload,
    });

    return res.status(201).json({ ok: true, version: saved.version });
  });

  // -------------------------
  // Routing state (Phase 1 glue)
  // -------------------------
  r.get("/routing/state", async (_req, res) => {
    const state = await routingStateRepo.get(ORG_ID);
    const settings = await routingSettingsRepo.get(ORG_ID);
    return res.json({ ok: true, state, settings });
  });

  r.post("/routing/enable", async (_req, res) => {
    const s = await schemaRepo.getLatest(ORG_ID);
    const m = await mappingRepo.getLatest(ORG_ID);
    const r = await rulesRepo.getLatest(ORG_ID);

    if (!s || !m) {
      return res.status(400).json({
        ok: false,
        error: "Missing schema or mapping (latest).",
        schemaExists: !!s,
        mappingExists: !!m,
      });
    }

    const biz = validateSchemaAndMapping(s as any, m as any);
    if (!biz.ok) {
      return res.status(400).json({
        ok: false,
        error: "Validation failed. Fix schema/mapping before enabling routing.",
        issues: biz.issues,
      });
    }

    const before = await routingStateRepo.get(ORG_ID);
    
    await routingStateRepo.setEnabled({
      orgId: ORG_ID,
      enabled: true,
      enabledBy: ACTOR_ID,
      schemaVersion: (s as any).version,
      mappingVersion: (m as any).version,
      rulesVersion: r ? (r as any).version : null,
    });

    const updated = await routingStateRepo.get(ORG_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "routing.enable",
      entityType: "RoutingState",
      entityId: ORG_ID,
      before,
      after: updated,
    });

    return res.json({ ok: true, enabled: true, state: updated });
  });

  r.post("/routing/disable", async (_req, res) => {
    const before = await routingStateRepo.get(ORG_ID);
    
    await routingStateRepo.setEnabled({
      orgId: ORG_ID,
      enabled: false,
    });

    const updated = await routingStateRepo.get(ORG_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "routing.disable",
      entityType: "RoutingState",
      entityId: ORG_ID,
      before,
      after: updated,
    });

    return res.json({ ok: true, enabled: false, state: updated });
  });

  // -------------------------
  // Routing Settings (Phase 1.4)
  // -------------------------
  r.get("/routing/settings", async (_req, res) => {
    const settings = await routingSettingsRepo.get(ORG_ID);
    return res.json({ ok: true, mode: settings.mode });
  });

  r.post("/routing/settings", async (req, res) => {
    const mode = req.body?.mode;
    
    if (!mode || (mode !== "AUTO" && mode !== "MANUAL_APPROVAL")) {
      return res.status(400).json({ 
        ok: false, 
        error: "Invalid mode. Must be AUTO or MANUAL_APPROVAL" 
      });
    }

    const before = await routingSettingsRepo.get(ORG_ID);
    await routingSettingsRepo.setMode(ORG_ID, mode as any);
    const updated = await routingSettingsRepo.get(ORG_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "routing.settings.setMode",
      entityType: "RoutingSettings",
      entityId: ORG_ID,
      before: { mode: before.mode },
      after: { mode: updated.mode },
    });

    return res.json({ ok: true, mode: updated.mode });
  });

  // -------------------------
  // Monday (Phase 1)
  // -------------------------
  r.post("/monday/users/refresh", async (_req, res) => {
    const client = await createMondayClientForOrg(ORG_ID);
    const count = await refreshMondayUsersCache(client as any, ORG_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "monday.users.refresh",
      entityType: "MondayUserCache",
      entityId: ORG_ID,
      before: null,
      after: { count },
    });

    return res.json({ ok: true, count });
  });

  r.get("/monday/status", async (_req, res) => {
    const s = await credRepo.status(ORG_ID);
    return res.json({ ok: true, ...s });
  });

  r.post("/monday/connect", async (req, res) => {
    const token = String(req.body?.token ?? "").trim();
    const endpoint = req.body?.endpoint ? String(req.body.endpoint).trim() : undefined;
    if (!token) return res.status(400).json({ ok: false, error: "Missing token" });

    await credRepo.upsert(ORG_ID, { token, endpoint });

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "monday.connect",
      entityType: "MondayCredential",
      entityId: ORG_ID,
      before: null,
      after: { endpoint: endpoint ?? "https://api.monday.com/v2" },
    });

    // Phase 2: Auto-register webhooks if PUBLIC_URL is configured
    let webhookStatus = { registered: false, message: "Webhook registration skipped - PUBLIC_URL not configured" };
    
    if (env.PUBLIC_URL) {
      try {
        console.log("[monday/connect] Registering webhook for real-time integration...");
        
        const client = createMondayClient({ token, endpoint });
        const mappingConfig = await mappingRepo.getLatest(ORG_ID);
        
        if (mappingConfig?.primaryBoardId) {
          const webhookUrl = `${env.PUBLIC_URL}/webhooks/monday`;
          
          const webhookId = await registerMondayWebhook({
            mondayClient: client,
            boardId: mappingConfig.primaryBoardId,
            webhookUrl,
            event: "create_pulse",
            orgId: ORG_ID,
          });
          
          webhookStatus = {
            registered: true,
            message: `Webhook registered: ${webhookId}`,
          };
          
          console.log(`✅ Webhook registered successfully: ${webhookId}`);
        } else {
          webhookStatus = {
            registered: false,
            message: "Webhook registration skipped - no primary board configured in field mapping",
          };
        }
      } catch (error: any) {
        console.error("[monday/connect] Webhook registration failed (non-fatal):", error.message);
        webhookStatus = {
          registered: false,
          message: `Webhook registration failed: ${error.message}`,
        };
      }
    }

    const s = await credRepo.status(ORG_ID);
    return res.json({ ok: true, ...s, webhook: webhookStatus });
  });

  r.post("/monday/test", async (_req, res) => {
    const cred = await credRepo.get(ORG_ID);
    if (!cred) return res.status(400).json({ ok: false, error: "Not connected" });

    const client = createMondayClient({ token: cred.token, endpoint: cred.endpoint });
    const users = await (client as any).fetchUsers();

    return res.json({ ok: true, usersCount: Array.isArray(users) ? users.length : 0 });
  });

  r.get("/monday/users", async (_req, res) => {
    const userCacheRepo = new PrismaMondayUserCacheRepo();
    const users = await userCacheRepo.list(ORG_ID);
    return res.json({ 
      ok: true, 
      users: users.map(u => ({ 
        id: u.userId, 
        name: u.name, 
        email: u.email 
      })) 
    });
  });

  /**
   * GET /admin/sync-status
   * Get database sync status - how many leads, oldest/newest, etc.
   */
  r.get("/sync-status", async (_req, res) => {
    try {
      const { getPrisma } = await import("../../../../packages/core/src/db/prisma");
      const prisma = getPrisma();

      // Get total leads count
      const totalLeads = await prisma.leadFact.count({ where: { orgId: ORG_ID } });

      // Get oldest and newest leads
      const oldestLead = await prisma.leadFact.findFirst({
        where: { orgId: ORG_ID, enteredAt: { not: null } },
        orderBy: { enteredAt: 'asc' },
        select: { enteredAt: true, itemId: true, boardId: true },
      });

      const newestLead = await prisma.leadFact.findFirst({
        where: { orgId: ORG_ID, enteredAt: { not: null } },
        orderBy: { enteredAt: 'desc' },
        select: { enteredAt: true, itemId: true, boardId: true },
      });

      // Get leads by board
      const leadsByBoard = await prisma.leadFact.groupBy({
        by: ['boardId'],
        where: { orgId: ORG_ID },
        _count: { boardId: true },
      });

      // Get assigned vs unassigned
      const assignedCount = await prisma.leadFact.count({
        where: { orgId: ORG_ID, assignedUserId: { not: null } },
      });

      const closedWonCount = await prisma.leadFact.count({
        where: { orgId: ORG_ID, closedWonAt: { not: null } },
      });

      return res.json({
        ok: true,
        totalLeads,
        assignedLeads: assignedCount,
        closedWonLeads: closedWonCount,
        unassignedLeads: totalLeads - assignedCount,
        oldestLead: oldestLead?.enteredAt || null,
        newestLead: newestLead?.enteredAt || null,
        leadsByBoard: leadsByBoard.map(b => ({
          boardId: b.boardId,
          count: b._count.boardId,
        })),
      });
    } catch (error: any) {
      console.error("[admin/sync-status] Error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  // -------------------------
  // Historical Data & Metrics
  // -------------------------
  
  /**
   * POST /admin/load-history
   * Load historical lead data from Monday.com boards
   */
  r.post("/load-history", async (req, res) => {
    try {
      const { limitPerBoard = 500, forceReload = false } = req.body;
      
      console.log("[admin/load-history] Starting historical data load...", { limitPerBoard, forceReload });
      
      const result = await loadHistoricalLeads({ limitPerBoard, forceReload });
      
      await safeAudit({
        orgId: ORG_ID,
        actorUserId: ACTOR_ID,
        action: "admin.load_history",
        entityType: "LeadFact",
        entityId: null,
        before: null,
        after: result,
      });
      
      return res.json(result);
    } catch (error: any) {
      console.error("[admin/load-history] Error:", error);
      return res.status(500).json({
        ok: false,
        message: `Failed to load historical data: ${error.message}`,
        error: error.message,
      });
    }
  });
  
  /**
   * POST /admin/compute-agent-profiles
   * Compute agent profiles from historical lead data
   */
  r.post("/compute-agent-profiles", async (req, res) => {
    try {
      console.log("[admin/compute-agent-profiles] Starting profile computation...");
      
      // Calculate all profiles
      const profiles = await calculateAllAgentProfiles(ORG_ID);
      
      // Save to database
      const profileRepo = new PrismaAgentProfileRepo();
      await Promise.all(
        profiles.map(profile => profileRepo.upsert(profile))
      );
      
      console.log(`[admin/compute-agent-profiles] Computed ${profiles.length} profiles`);
      
      await safeAudit({
        orgId: ORG_ID,
        actorUserId: ACTOR_ID,
        action: "admin.compute_agent_profiles",
        entityType: "AgentProfile",
        entityId: null,
        before: null,
        after: { profilesComputed: profiles.length },
      });
      
      return res.json({
        ok: true,
        message: `Successfully computed ${profiles.length} agent profiles`,
        profilesComputed: profiles.length,
        profiles: profiles.map(p => ({
          agentUserId: p.agentUserId,
          agentName: p.agentName,
          conversionRate: p.conversionRate,
          avgDealSize: p.avgDealSize,
          availability: p.availability,
          totalLeadsHandled: p.totalLeadsHandled,
          totalLeadsConverted: p.totalLeadsConverted,
        })),
      });
    } catch (error: any) {
      console.error("[admin/compute-agent-profiles] Error:", error);
      return res.status(500).json({
        ok: false,
        message: `Failed to compute agent profiles: ${error.message}`,
        error: error.message,
      });
    }
  });
  
  /**
   * POST /admin/sync-metrics
   * Full sync: Load history + Compute profiles (convenience endpoint)
   */
  r.post("/sync-metrics", async (req, res) => {
    try {
      const { limitPerBoard = 500 } = req.body;
      
      console.log("[admin/sync-metrics] Starting full metrics sync...");
      
      // Step 1: Load historical leads
      console.log("[admin/sync-metrics] Step 1/2: Loading historical data...");
      const loadResult = await loadHistoricalLeads({ limitPerBoard, forceReload: false });
      
      if (!loadResult.ok) {
        return res.status(500).json({
          ok: false,
          message: `Failed at step 1: ${loadResult.message}`,
          error: loadResult.errors,
        });
      }
      
      // Step 2: Compute agent profiles
      console.log("[admin/sync-metrics] Step 2/2: Computing agent profiles...");
      const profiles = await calculateAllAgentProfiles(ORG_ID);
      const profileRepo = new PrismaAgentProfileRepo();
      await Promise.all(
        profiles.map(profile => profileRepo.upsert(profile))
      );
      
      const finalResult = {
        ok: true,
        message: `Full sync completed: Loaded ${loadResult.itemsLoaded} leads, computed ${profiles.length} profiles`,
        history: {
          boards: loadResult.boards,
          itemsLoaded: loadResult.itemsLoaded,
          itemsUpdated: loadResult.itemsUpdated,
          errors: loadResult.errors,
        },
        profiles: {
          count: profiles.length,
          agents: profiles.map(p => ({
            agentUserId: p.agentUserId,
            agentName: p.agentName,
            conversionRate: p.conversionRate,
            availability: p.availability,
          })),
        },
      };
      
      await safeAudit({
        orgId: ORG_ID,
        actorUserId: ACTOR_ID,
        action: "admin.sync_metrics",
        entityType: "System",
        entityId: null,
        before: null,
        after: finalResult,
      });
      
      console.log("[admin/sync-metrics] Completed successfully");
      
      return res.json(finalResult);
    } catch (error: any) {
      console.error("[admin/sync-metrics] Error:", error);
      return res.status(500).json({
        ok: false,
        message: `Failed to sync metrics: ${error.message}`,
        error: error.message,
      });
    }
  });

  return r;
}
