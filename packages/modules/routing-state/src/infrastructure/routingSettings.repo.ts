import { getPrisma } from "../../../../core/src/db/prisma";

export type RoutingMode = "AUTO" | "MANUAL_APPROVAL";

export interface RoutingSettings {
  orgId: string;
  mode: RoutingMode;
}

export class PrismaRoutingSettingsRepo {
  async get(orgId: string): Promise<RoutingSettings> {
    const prisma = getPrisma();
    const row = await prisma.routingSettings.upsert({
      where: { orgId },
      update: {},
      create: { orgId, mode: "MANUAL_APPROVAL" as any },
    });
    return { orgId: row.orgId, mode: row.mode as any };
  }

  async setMode(orgId: string, mode: RoutingMode): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingSettings.upsert({
      where: { orgId },
      update: { mode: mode as any },
      create: { orgId, mode: mode as any },
    });
  }
}
