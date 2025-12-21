import type { FieldMappingConfig } from "../contracts/mapping.types";

/**
 * Placeholder repository.
 * Replace with DB persistence (versioned) in Step 6/14.
 */
export class MappingRepository {
  private config: FieldMappingConfig | null = null;

  async get(): Promise<FieldMappingConfig | null> {
    return this.config;
  }

  async save(config: FieldMappingConfig): Promise<number> {
    const nextVersion = (this.config?.version ?? 0) + 1;
    const updated: FieldMappingConfig = { ...config, version: nextVersion, updatedAt: new Date().toISOString() };
    this.config = updated;
    return nextVersion;
  }
}
