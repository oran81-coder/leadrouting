import { getPrisma } from "../../../../packages/core/src/db/prisma";
const ORG_ID = "org_1";

export class PrismaAgentMetricsRepo {
  async upsert(agentUserId: string, windowDays: number, patch: any) {
    const prisma = getPrisma();
    // Optimized: Use native upsert with unique constraint (orgId, agentUserId, windowDays)
    // This eliminates the extra findFirst query
    return prisma.agentMetricsSnapshot.upsert({
      where: { 
        orgId_agentUserId_windowDays: { 
          orgId: ORG_ID, 
          agentUserId, 
          windowDays 
        } 
      },
      update: { 
        ...patch, 
        computedAt: new Date() 
      },
      create: { 
        orgId: ORG_ID, 
        agentUserId, 
        windowDays, 
        ...patch,
        computedAt: new Date()
      },
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
