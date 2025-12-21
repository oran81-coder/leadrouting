import type { FieldMappingConfig } from "../contracts/mapping.types";
import { assertRequiredMapped } from "../domain/mapping.rules";

/**
 * Application-level validation:
 * - required mapping
 * - type compatibility
 * - sample normalization preview must not error (handled by preview module)
 */
export function validateMappingConfig(config: FieldMappingConfig): void {
  assertRequiredMapped(config);
  // TODO: add type compatibility checks using Monday column metadata
}
