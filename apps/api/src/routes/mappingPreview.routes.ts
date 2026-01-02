import { Router } from "express";
import { createMondayClientForOrg } from "../../../../packages/modules/monday-integration/src/application/monday.orgClient";
import { buildPreviewWithClient, buildPreviewFromSamples } from "../../../../packages/modules/field-mapping/src/application/mapping.preview";
import { PrismaInternalSchemaRepo } from "../../../../packages/modules/internal-schema/src/infrastructure/internalSchema.repo";
import { validateSchemaAndMapping } from "../../../../packages/core/src/schema/businessValidation";
import { PrismaFieldMappingConfigRepo } from "../../../../packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaMondayCredentialRepo } from "../../../../packages/modules/monday-integration/src/infrastructure/mondayCredential.repo";

/**
 * Mapping preview endpoint (Phase 1, local E2E):
 * - Loads latest schema + mapping config from DB (versioned)
 * - Fetches Monday samples for referenced boards OR uses mock data from body
 * - Runs normalization preview (3 rows: lead/agent/deal)
 *
 * Notes:
 * - orgId is hardcoded to org_1 until Auth/JWT is wired.
 * - Completion gating should be done in the Wizard UI:
 *   block save/enable if any row has normalizationErrors.
 * - Phase 1: If req.body.item is provided, bypass Monday connection and use mock data.
 */
export function mappingPreviewRoutes() {
  const r = Router();

  const schemaRepo = new PrismaInternalSchemaRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();
  const credentialRepo = new PrismaMondayCredentialRepo();

  r.post("/", async (req, res) => {
    try {
      // Get orgId from authenticated user
      const orgId = (req.user as any)?.orgId || "org_1";
      
      if (process.env.DEBUG_PREVIEW === "1") {
        console.log("[mappingPreview] orgId:", orgId);
        console.log("[mappingPreview] req.body:", JSON.stringify(req.body));
        console.log("[mappingPreview] hasItem:", !!(req.body && req.body.item));
      }

      const schema = await schemaRepo.getLatest(orgId);
      if (!schema) {
        return res.status(400).json({ ok: false, error: "Missing internal schema for org. Save schema first via /admin/schema." });
      }

      const config = await mappingRepo.getLatest(orgId);
      if (!config) {
        return res.status(400).json({ ok: false, error: "Missing mapping config for org. Save mapping first via /admin/mapping." });
      }

      const biz = validateSchemaAndMapping(schema as any, config as any);
      console.log("[mappingPreview] Business validation result:", JSON.stringify(biz, null, 2));
      if (!biz.ok) {
        console.error("[mappingPreview] Business validation failed:", biz.issues);
        return res.status(400).json({ ok: false, error: "Business validation failed", issues: biz.issues });
      }

      // Phase 1 MOCK BRANCH: Early return if item is provided (NO Monday required)
      if (req.body && req.body.item) {
        if (process.env.DEBUG_PREVIEW === "1") {
          console.log("[mappingPreview] MOCK branch entered - bypassing Monday");
        }
        const mockItem = req.body.item;
        
        // Construct a MondayBoardSample array from the mock item
        const mockSamples = [
          {
            boardId: "mock_board_1", // hardcoded for Phase 1
            items: [mockItem],
          },
        ];
        
        const rows = buildPreviewFromSamples(schema, config, mockSamples);
        const hasErrors = rows.some((r) => Array.isArray(r.normalizationErrors) && r.normalizationErrors.length > 0);

        // TRUE EARLY RETURN - no Monday logic after this
        return res.json({
          ok: true,
          orgId,
          schemaVersion: (schema as any).version,
          mappingVersion: (config as any).version,
          hasErrors,
          rows,
          debug: { source: "mock" },
        });
      }

      // MONDAY BRANCH: Only reached if no mock item provided
      if (process.env.DEBUG_PREVIEW === "1") {
        console.log("[mappingPreview] MONDAY branch entered - checking credentials");
      }
      const status = await credentialRepo.status(orgId);
      if (!status.connected) {
        return res.status(400).json({
          ok: false,
          error: "Monday not connected. Go to Admin Connect and save a token first, or provide a mock item in the request body.",
        });
      }

      const client = await createMondayClientForOrg(orgId);
      const rows = await buildPreviewWithClient(client, schema, config, { limitPerBoard: 5 });
      const hasErrors = rows.some((r) => Array.isArray(r.normalizationErrors) && r.normalizationErrors.length > 0);

      return res.json({
        ok: true,
        orgId,
        schemaVersion: (schema as any).version,
        mappingVersion: (config as any).version,
        hasErrors,
        rows,
        debug: { source: "monday" },
      });
    } catch (e: any) {
      console.error("[mappingPreview] Error:", e?.message ?? String(e));
      return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  return r;
}
