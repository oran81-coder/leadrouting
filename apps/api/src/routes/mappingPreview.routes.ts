import { Router } from "express";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { buildPreviewWithClient } from "../../../../packages/modules/field-mapping/src/application/mapping.preview";
import { PrismaInternalSchemaRepo } from "../../../../packages/modules/internal-schema/src/infrastructure/internalSchema.repo";
import { validateSchemaAndMapping } from "../../../../packages/core/src/schema/businessValidation";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";

/**
 * Mapping preview endpoint (Phase 1, local E2E):
 * - Loads latest schema + mapping config from DB (versioned)
 * - Fetches Monday samples for referenced boards
 * - Runs normalization preview (3 rows: lead/agent/deal)
 *
 * Notes:
 * - orgId is hardcoded to org_1 until Auth/JWT is wired.
 * - Completion gating should be done in the Wizard UI:
 *   block save/enable if any row has normalizationErrors.
 */
export function mappingPreviewRoutes() {
  const r = Router();

  const schemaRepo = new PrismaInternalSchemaRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();

  const ORG_ID = "org_1"; // TODO: replace with auth-derived orgId

  r.get("/preview", async (_req, res) => {
    try {
      const client = await createMondayClientForOrg(ORG_ID);

      const schema = await schemaRepo.getLatest(ORG_ID);
      if (!schema) {
        return res.status(400).json({ ok: false, error: "Missing internal schema for org. Save schema first via /admin/schema." });
      }

      const config = await mappingRepo.getLatest(ORG_ID);
      if (!config) {
        return res.status(400).json({ ok: false, error: "Missing mapping config for org. Save mapping first via /admin/mapping." });
      }

      const biz = validateSchemaAndMapping(schema as any, config as any);
if (!biz.ok) {
  return res.status(400).json({ ok: false, error: "Business validation failed", issues: biz.issues });
}

        const rows = await buildPreviewWithClient(client, schema, config, { limitPerBoard: 5 });

      const hasErrors = rows.some((r) => Array.isArray(r.normalizationErrors) && r.normalizationErrors.length > 0);

      return res.json({
        ok: true,
        orgId: ORG_ID,
        schemaVersion: (schema as any).version,
        mappingVersion: (config as any).version,
        hasErrors,
        rows,
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  return r;
}
