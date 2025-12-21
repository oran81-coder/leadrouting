import type { FieldMappingConfig } from "../contracts/mapping.types";
import { validateMappingConfig } from "./mapping.validation";
import { MappingRepository } from "../infrastructure/mapping.repo";

export class MappingService {
  constructor(private readonly repo: MappingRepository) {}

  async getConfig(): Promise<FieldMappingConfig | null> {
    return this.repo.get();
  }

  async saveConfig(config: FieldMappingConfig): Promise<number> {
    validateMappingConfig(config);
    const nextVersion = await this.repo.save(config);
    return nextVersion;
  }
}
