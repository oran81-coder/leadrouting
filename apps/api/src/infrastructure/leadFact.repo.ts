import { getPrisma } from "../../../../packages/core/src/db/prisma";

const ORG_ID = "org_1";

export class PrismaLeadFactRepo {
  async upsert(boardId: string, itemId: string, patch: any) {
    const prisma = getPrisma();
    return prisma.leadFact.upsert({
      where: { orgId_boardId_itemId: { orgId: ORG_ID, boardId, itemId } },
      update: patch,
      create: { orgId: ORG_ID, boardId, itemId, ...patch },
    });
  }

  async get(boardId: string, itemId: string) {
    const prisma = getPrisma();
    return prisma.leadFact.findUnique({ where: { orgId_boardId_itemId: { orgId: ORG_ID, boardId, itemId } } });
  }

  async listByAgentInWindow(agentUserId: string, since: Date) {
    const prisma = getPrisma();
    return prisma.leadFact.findMany({
      where: {
        orgId: ORG_ID,
        assignedUserId: agentUserId,
        OR: [
          { enteredAt: { gte: since } },
          { closedWonAt: { gte: since } },
          { firstTouchAt: { gte: since } },
        ],
      },
    });
  }

  async listClosedWonSince(since: Date) {
    const prisma = getPrisma();
    return prisma.leadFact.findMany({
      where: {
        orgId: ORG_ID,
        closedWonAt: { gte: since },
        assignedUserId: { not: null },
      },
    });
  }

  async listAgentsWithFacts() {
    const prisma = getPrisma();
    const rows = await prisma.leadFact.findMany({
      where: { orgId: ORG_ID, assignedUserId: { not: null } },
      select: { assignedUserId: true },
      distinct: ["assignedUserId"],
    });
    return rows.map((r) => r.assignedUserId!).filter(Boolean);
  }
}
