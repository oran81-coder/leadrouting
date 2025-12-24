import type { FieldMappingConfig, InternalFieldType } from "../contracts/mapping.types";
import { ValidationError } from "../../../../core/src/shared/errors";

/**
 * Validation rules:
 * - required enabled fields must be mapped
 * - type compatibility must hold (InternalFieldType vs Monday column type handled in application layer)
 */
export function assertRequiredMapped(config: FieldMappingConfig) {
  const enabledRequired = config.fields.filter(f => f.isEnabled && f.required);
  for (const f of enabledRequired) {
    if (!config.mappings[f.id]) {
      throw new ValidationError(`Required field is unmapped: ${f.id}`, { fieldId: f.id });
    }
  }
}
