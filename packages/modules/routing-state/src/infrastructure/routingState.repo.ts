import { getPrisma } from "../../../../core/src/db/prisma";

export interface RoutingState {
  orgId: string;
  isEnabled: boolean;
  enabledAt?: string | null;
  enabledBy?: string | null;
  schemaVersion?: number | null;
  mappingVersion?: number | null;
  rulesVersion?: number | null;
}

export class PrismaRoutingStateRepo {
  async get(orgId: string): Promise<RoutingState | null> {
    const prisma = getPrisma();
    const row = await prisma.routingState.findUnique({ where: { orgId } });
    if (!row) return null;
    return {
      orgId: row.orgId,
      isEnabled: row.isEnabled,
      enabledAt: row.enabledAt ? row.enabledAt.toISOString() : null,
      enabledBy: row.enabledBy ?? null,
      schemaVersion: row.schemaVersion ?? null,
      mappingVersion: row.mappingVersion ?? null,
      rulesVersion: row.rulesVersion ?? null,
    };
  }

  async setEnabled(args: {
    orgId: string;
    enabled: boolean;
    enabledBy?: string | null;
    schemaVersion?: number | null;
    mappingVersion?: number | null;
    rulesVersion?: number | null;
  }): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingState.upsert({
      where: { orgId: args.orgId },
      update: {
        isEnabled: args.enabled,
        enabledAt: args.enabled ? new Date() : null,
        enabledBy: args.enabled ? (args.enabledBy ?? null) : null,
        schemaVersion: args.enabled ? (args.schemaVersion ?? null) : null,
        mappingVersion: args.enabled ? (args.mappingVersion ?? null) : null,
        rulesVersion: args.enabled ? (args.rulesVersion ?? null) : null,
      },
      create: {
        orgId: args.orgId,
        isEnabled: args.enabled,
        enabledAt: args.enabled ? new Date() : null,
        enabledBy: args.enabled ? (args.enabledBy ?? null) : null,
        schemaVersion: args.enabled ? (args.schemaVersion ?? null) : null,
        mappingVersion: args.enabled ? (args.mappingVersion ?? null) : null,
        rulesVersion: args.enabled ? (args.rulesVersion ?? null) : null,
      },
    });
  }
}
