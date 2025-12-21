import type { InternalSchema } from "../../../../core/src/schema/internalSchema";
import { getPrisma } from "../../../../core/src/db/prisma";

export interface InternalSchemaRepo {
  getLatest(orgId: string): Promise<InternalSchema | null>;
  getByVersion(orgId: string, version: number): Promise<InternalSchema | null>;
  saveNewVersion(orgId: string, schema: InternalSchema, createdBy?: string): Promise<{ version: number }>;
}

export class PrismaInternalSchemaRepo implements InternalSchemaRepo {
  async getLatest(orgId: string): Promise<InternalSchema | null> {
    const prisma = getPrisma();
    const row = await prisma.internalSchemaVersion.findFirst({
      where: { orgId },
      orderBy: { version: "desc" },
    });
    if (!row) return null;
    return row.payload as any as InternalSchema;
  }

  async getByVersion(orgId: string, version: number): Promise<InternalSchema | null> {
    const prisma = getPrisma();
    const row = await prisma.internalSchemaVersion.findUnique({
      where: { orgId_version: { orgId, version } },
    });
    if (!row) return null;
    return row.payload as any as InternalSchema;
  }

  async saveNewVersion(orgId: string, schema: InternalSchema, createdBy?: string): Promise<{ version: number }> {
    const prisma = getPrisma();

    // Determine next version based on latest
    const latest = await prisma.internalSchemaVersion.findFirst({
      where: { orgId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    // Force version + updatedAt on stored payload
    const payload: InternalSchema = {
      ...schema,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    };

    await prisma.internalSchemaVersion.create({
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
