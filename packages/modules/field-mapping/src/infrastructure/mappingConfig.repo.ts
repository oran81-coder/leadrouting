import type { FieldMappingConfig } from "../contracts/mapping.types";
import { getPrisma } from "../../../../core/src/db/prisma";

export interface FieldMappingConfigRepo {
  getLatest(orgId: string): Promise<FieldMappingConfig | null>;
  getByVersion(orgId: string, version: number): Promise<FieldMappingConfig | null>;
  saveNewVersion(orgId: string, config: FieldMappingConfig, createdBy?: string): Promise<{ version: number }>;
}

export class PrismaFieldMappingConfigRepo implements FieldMappingConfigRepo {
  async getLatest(orgId: string): Promise<FieldMappingConfig | null> {
    const prisma = getPrisma();
    const row = await prisma.fieldMappingConfigVersion.findFirst({
      where: { orgId },
      orderBy: { version: "desc" },
    });
    if (!row) return null;
    return row.payload as any as FieldMappingConfig;
  }

  async getByVersion(orgId: string, version: number): Promise<FieldMappingConfig | null> {
    const prisma = getPrisma();
    const row = await prisma.fieldMappingConfigVersion.findUnique({
      where: { orgId_version: { orgId, version } },
    });
    if (!row) return null;
    return row.payload as any as FieldMappingConfig;
  }

  async saveNewVersion(orgId: string, config: FieldMappingConfig, createdBy?: string): Promise<{ version: number }> {
    const prisma = getPrisma();

    const latest = await prisma.fieldMappingConfigVersion.findFirst({
      where: { orgId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const payload: FieldMappingConfig = {
      ...config,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    } as any;

    await prisma.fieldMappingConfigVersion.create({
      data: {
        orgId,
        version: nextVersion,
        payload: payload as any,
        createdBy: createdBy ?? null,
      },
    });

    return { version: nextVersion };
  }
}
