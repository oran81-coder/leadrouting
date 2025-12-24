import type { InternalSchema, EntityType } from "../../../../core/src/schema/internalSchema";
import { getActiveFieldsByEntity } from "../../../../core/src/schema/internalSchema";
import type { FieldMappingConfig } from "../contracts/mapping.types";
import type { MondayBoardId, MondayBoardSample, MondayItem } from "../../../monday-integration/src/contracts/monday.types";
import { extractRawFromColumnValue } from "../../../monday-integration/src/application/monday.extractors";

/**
 * Build a composite raw record for preview/normalization:
 * - Each internal field is resolved from the board+column chosen in the mapping wizard.
 * - Because Phase 1 does NOT validate cross-board relationships, we do NOT attempt to correlate items across boards.
 * - Instead, for each field we pick the first available sample item from the mapped board and take that column value.
 *
 * This yields a "best effort" preview sample and still exercises:
 * - mapping existence
 * - type coercion / normalization errors
 */
export function buildCompositeRawByInternalFieldId(
  schema: InternalSchema,
  entity: EntityType,
  config: FieldMappingConfig,
  samplesByBoard: Record<MondayBoardId, MondayItem[]>
): Record<string, unknown> {
  const fields = getActiveFieldsByEntity(schema, entity);

  const raw: Record<string, unknown> = {};

  for (const f of fields) {
    const ref = config.mappings[f.id];
    if (!ref) {
      raw[f.id] = null;
      continue;
    }

    const items = samplesByBoard[ref.boardId] ?? [];
    const firstItem = items[0];
    if (!firstItem) {
      raw[f.id] = null;
      continue;
    }

    // column_values typing may vary across monday contracts; keep it safe
    const columnValues = (firstItem as any).column_values as Array<{ id: string } & Record<string, any>> | undefined;
    const cv = columnValues?.find((c) => c.id === ref.columnId);

    if (!cv) {
      raw[f.id] = null;
      continue;
    }

    const rawVal = extractRawFromColumnValue(ref.columnType, cv);
    raw[f.id] = rawVal;
  }

  return raw;
}

export function indexSamples(samples: MondayBoardSample[]): Record<MondayBoardId, MondayItem[]> {
  const map: Record<MondayBoardId, MondayItem[]> = {};
  for (const s of samples) map[s.boardId] = s.items ?? [];
  return map;
}

export function collectReferencedBoardIds(schema: InternalSchema, config: FieldMappingConfig): MondayBoardId[] {
  const ids = new Set<MondayBoardId>();

  for (const f of schema.fields) {
    if (!f.active) continue;

    const ref = config.mappings[f.id];
    if (ref?.boardId) ids.add(ref.boardId);
  }

  return Array.from(ids);
}
