import { Router } from "express";

import { createMondayClient } from "../../../../packages/modules/monday-integration/src/application/monday.clientFactory";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { refreshMondayUsersCache } from "../../../../packages/modules/monday-integration/src/application/monday.people";

import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";

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
    
    // Validate mode
    if (!mode || (mode !== "AUTO" && mode !== "MANUAL_APPROVAL")) {
      return res.status(400).json({ 
        ok: false, 
        error: "Invalid mode. Expected 'AUTO' or 'MANUAL_APPROVAL'" 
      });
    }

    const before = await routingSettingsRepo.get(ORG_ID);
    
    await routingSettingsRepo.setMode(ORG_ID, mode);
    
    const after = await routingSettingsRepo.get(ORG_ID);

    await safeAudit({
      orgId: ORG_ID,
      actorUserId: ACTOR_ID,
      action: "routing.settings.set_mode",
      entityType: "RoutingSettings",
      entityId: ORG_ID,
      before: { mode: before.mode },
      after: { mode: after.mode },
    });

    return res.json({ ok: true, mode: after.mode });
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

    const s = await credRepo.status(ORG_ID);
    return res.json({ ok: true, ...s });
  });

  r.post("/monday/test", async (_req, res) => {
    const cred = await credRepo.get(ORG_ID);
    if (!cred) return res.status(400).json({ ok: false, error: "Not connected" });

    const client = createMondayClient({ token: cred.token, endpoint: cred.endpoint });
    const users = await (client as any).fetchUsers();

    return res.json({ ok: true, usersCount: Array.isArray(users) ? users.length : 0 });
  });

  return r;
}
