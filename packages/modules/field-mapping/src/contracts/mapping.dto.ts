import type { FieldMappingConfig } from "./mapping.types";

export interface SaveMappingRequestDTO {
  config: FieldMappingConfig;
}

export interface SaveMappingResponseDTO {
  ok: true;
  version: number;
}

export interface GetMappingResponseDTO {
  config: FieldMappingConfig | null;
}
