import type { FieldMappingConfig, InternalFieldType } from "../contracts/mapping.types";
import { ValidationError } from "../../../../core/src/shared/errors";

/**
 * Validation rules:
 * - required enabled fields must be mapped
 * - type compatibility must hold (InternalFieldType vs Monday column type handled in application layer)
 * - Phase 2: validate primaryBoardId and statusConfig
 */
export function assertRequiredMapped(config: FieldMappingConfig) {
  // Validate primaryBoardId exists
  if (!config.primaryBoardId) {
    throw new ValidationError("Primary Board ID must be set");
  }

  // Validate statusConfig for automation features
  if (config.statusConfig) {
    if (!config.statusConfig.closedWonStatuses || config.statusConfig.closedWonStatuses.length === 0) {
      throw new ValidationError("At least one 'Closed Won' status must be configured");
    }
  }

  // Validate required fields are mapped
  const enabledRequired = config.fields.filter(f => f.isEnabled && f.required);
  for (const f of enabledRequired) {
    // Skip computed fields (they don't need mapping)
    if (f.type === "computed") continue;
    
    if (!config.mappings[f.id]) {
      throw new ValidationError(`Required field is unmapped: ${f.id}`, { fieldId: f.id });
    }
  }
}
