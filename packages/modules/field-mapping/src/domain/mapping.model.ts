import type { FieldMappingConfig } from "../contracts/mapping.types";

export class MappingModel {
  constructor(public readonly config: FieldMappingConfig) {}
}
