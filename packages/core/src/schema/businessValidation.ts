import type { InternalSchema, FieldDefinition } from "./internalSchema";
import { getRequiredActiveFields } from "./internalSchema";
import type { FieldMappingConfig } from "../../../modules/field-mapping/src/contracts/mapping.types";

export interface BizValidationIssue {
  code: string;
  message: string;
  fieldId?: string;
}

export interface BizValidationResult {
  ok: boolean;
  issues: BizValidationIssue[];
}

/**
 * Business validation gates for Phase 1.
 *
 * Goals:
 * - Prevent saving/using configs that will break routing or preview.
 * - Make failures explicit and actionable for Admin UI.
 */
export function validateSchemaAndMapping(schema: InternalSchema, mapping: FieldMappingConfig): BizValidationResult {
  const issues: BizValidationIssue[] = [];

  const activeFields = schema.fields.filter((f) => f.active);
  if (activeFields.length === 0) {
    issues.push({
      code: "SCHEMA.NO_ACTIVE_FIELDS",
      message: "Internal schema has no active fields. Enable at least one field.",
    });
    return { ok: false, issues };
  }

  // 1) Every active schema field must exist in mapping.fields list (so UI/DB stays consistent)
  const mappingFieldIds = new Set(mapping.fields.map((f) => f.id));
  for (const f of activeFields) {
    if (!mappingFieldIds.has(f.id)) {
      issues.push({
        code: "MAPPING.MISSING_FIELD_DEFINITION",
        message: `Mapping config is missing field definition for active schema field '${f.id}'.`,
        fieldId: f.id,
      });
    }
  }

  // 2) Every active schema field must have a board+column mapping reference
  for (const f of activeFields) {
    const ref = mapping.mappings[f.id];
    if (!ref?.boardId || !ref?.columnId) {
      issues.push({
        code: "MAPPING.MISSING_BOARD_COLUMN_REF",
        message: `Missing boardId/columnId mapping for active field '${f.id}'.`,
        fieldId: f.id,
      });
    }
  }

  // 3) Required+active schema fields must not be disabled in mapping.fields (isEnabled)
  const requiredActive = getRequiredActiveFields(schema);
  const mappingFieldsById = new Map(mapping.fields.map((f) => [f.id, f]));
  for (const f of requiredActive) {
    const mf = mappingFieldsById.get(f.id);
    if (!mf) continue;
    if (!mf.isEnabled) {
      issues.push({
        code: "MAPPING.REQUIRED_FIELD_DISABLED",
        message: `Required field '${f.id}' is disabled in mapping config. Enable it or remove 'required' from schema.`,
        fieldId: f.id,
      });
    }
  }

  // 4) Optional: detect multiple internal fields mapped to same (boardId,columnId)
  // This is allowed in some cases, but usually indicates a mistake.
  // Exception: deal_won_status_column is metadata and can point to same column as deal_status
  const seen = new Map<string, string>(); // key -> fieldId
  for (const f of activeFields) {
    const ref = mapping.mappings[f.id];
    if (!ref?.boardId || !ref?.columnId) continue;
    const key = `${ref.boardId}::${ref.columnId}`;
    const prev = seen.get(key);
    if (prev && prev !== f.id) {
      // Allow deal_won_status_column to share the same column as deal_status (it's metadata)
      const isMetadataException = 
        (f.id === "deal_won_status_column" && prev === "deal_status") ||
        (prev === "deal_won_status_column" && f.id === "deal_status");
      
      if (!isMetadataException) {
        issues.push({
          code: "MAPPING.DUPLICATE_COLUMN_REF",
          message: `Multiple internal fields map to the same Monday column (${key}). Fields: '${prev}' and '${f.id}'.`,
          fieldId: f.id,
        });
      }
    } else {
      seen.set(key, f.id);
    }
  }

  
// 5) Writeback targets (Wizard-configured)
const wb = (mapping as any).writebackTargets;
if (!wb?.assignedAgent?.boardId || !wb?.assignedAgent?.columnId) {
  issues.push({
    code: "WRITEBACK.MISSING_ASSIGNED_AGENT_TARGET",
    message: "Missing writebackTargets.assignedAgent (boardId/columnId). Configure in Wizard.",
  });
} else {
  const ct = wb.assignedAgent.columnType;
  const allowed = ["people", "text", "status"];
  if (ct && !allowed.includes(ct)) {
    issues.push({
      code: "WRITEBACK.INVALID_ASSIGNED_AGENT_COLUMN_TYPE",
      message: `assignedAgent writeback columnType '${ct}' is not supported. Use people/text/status.`,
    });
  }
}

if (wb?.routingReason?.columnType && wb.routingReason.columnType !== "text") {
  issues.push({
    code: "WRITEBACK.INVALID_ROUTING_REASON_TYPE",
    message: "routingReason writeback target must be a text column (or omit).",
  });
}

  return { ok: issues.length === 0, issues };
}
