import { getPrisma } from "../../../../packages/core/src/db/prisma";
const ORG_ID = "org_1";

export class PrismaAgentMetricsRepo {
  async upsert(agentUserId: string, windowDays: number, patch: any) {
    const prisma = getPrisma();
    // keep latest snapshot per agent+window (overwrite by computedAt via update)
    const existing = await prisma.agentMetricsSnapshot.findFirst({
      where: { orgId: ORG_ID, agentUserId, windowDays },
      orderBy: { computedAt: "desc" },
    });
    if (!existing) {
      return prisma.agentMetricsSnapshot.create({ data: { orgId: ORG_ID, agentUserId, windowDays, ...patch } });
    }
    return prisma.agentMetricsSnapshot.update({
      where: { id: existing.id },
      data: { ...patch, computedAt: new Date() },
    });
  }

  async get(agentUserId: string) {
    const prisma = getPrisma();
    return prisma.agentMetricsSnapshot.findMany({
      where: { orgId: ORG_ID, agentUserId },
      orderBy: { windowDays: "asc" },
    });
  }
}
