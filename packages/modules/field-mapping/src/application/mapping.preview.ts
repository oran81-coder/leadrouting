import type { FieldMappingConfig } from "../contracts/mapping.types";
import type { InternalSchema, EntityType } from "../../../../core/src/schema/internalSchema";
import { normalizeEntityRecord } from "../../../../core/src/schema/normalization";
import type { MondayBoardSample } from "../../../monday-integration/src/contracts/monday.types";
import { buildCompositeRawByInternalFieldId, indexSamples, collectReferencedBoardIds } from "./mapping.raw";
import type { MondayClient } from "../../../monday-integration/src/infrastructure/monday.client";

export interface PreviewRow {
  entity: EntityType;
  values: Record<string, unknown>;
  normalizationErrors: unknown[];
}

/**
 * Build preview rows from Monday samples:
 * - caller provides samples (already fetched from Monday for referenced boards)
 * - we build a composite raw record per entity (best-effort, no cross-board validation)
 * - normalize and return values + errors for UI
 *
 * Wizard completion must be blocked if any entity row has normalizationErrors.
 */
export function buildPreviewFromSamples(schema: InternalSchema, config: FieldMappingConfig, samples: MondayBoardSample[]): PreviewRow[] {
  const samplesByBoard = indexSamples(samples);

  const entities: EntityType[] = ["lead", "agent", "deal"];
  const rows: PreviewRow[] = [];

  for (const entity of entities) {
    const raw = buildCompositeRawByInternalFieldId(schema, entity, config, samplesByBoard);
    const norm = normalizeEntityRecord(schema, entity, raw);

    rows.push({
      entity,
      values: norm.values,
      normalizationErrors: norm.errors,
    });
  }

  return rows;
}

/**
 * End-to-end preview builder (Phase 1):
 * - Collect referenced boards from schema+mapping
 * - Fetch first N items per referenced board via Monday API
 * - Build preview rows and return them
 *
 * Notes:
 * - Board/column selection is user responsibility.
 * - We do NOT validate cross-board relationships here.
 */
export async function buildPreviewWithClient(
  client: MondayClient,
  schema: InternalSchema,
  config: FieldMappingConfig,
  opts?: { limitPerBoard?: number }
): Promise<PreviewRow[]> {
  const boardIds = collectReferencedBoardIds(schema, config);
  const limit = opts?.limitPerBoard ?? 5;

  // Fix: Don't use created_at sorting as it causes "Column not found" error
  // Monday.com doesn't support sorting by created_at in column_values context
  const samples = await client.fetchBoardSamples(boardIds, limit);
  return buildPreviewFromSamples(schema, config, samples);
}

/**
 * Placeholder for API layer to call buildPreviewWithClient once env + auth are wired.
 */
export async function buildPreview(_schema: InternalSchema, _config: FieldMappingConfig): Promise<PreviewRow[]> {
  // TODO (API layer):
  // 1) create MondayClient using org token (env/secret store)
  // 2) call buildPreviewWithClient(client, schema, config)
  return [];
}
