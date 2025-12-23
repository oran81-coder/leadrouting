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
    
    if (args.enabled) {
      // When enabling: capture current versions
      await prisma.routingState.upsert({
        where: { orgId: args.orgId },
        update: {
          isEnabled: true,
          enabledAt: new Date(),
          enabledBy: args.enabledBy ?? null,
          schemaVersion: args.schemaVersion ?? null,
          mappingVersion: args.mappingVersion ?? null,
          rulesVersion: args.rulesVersion ?? null,
        },
        create: {
          orgId: args.orgId,
          isEnabled: true,
          enabledAt: new Date(),
          enabledBy: args.enabledBy ?? null,
          schemaVersion: args.schemaVersion ?? null,
          mappingVersion: args.mappingVersion ?? null,
          rulesVersion: args.rulesVersion ?? null,
        },
      });
    } else {
      // When disabling: preserve versions, just flip flag
      await prisma.routingState.upsert({
        where: { orgId: args.orgId },
        update: {
          isEnabled: false,
          enabledAt: null,
        },
        create: {
          orgId: args.orgId,
          isEnabled: false,
          enabledAt: null,
          enabledBy: null,
          schemaVersion: null,
          mappingVersion: null,
          rulesVersion: null,
        },
      });
    }
  }
}
