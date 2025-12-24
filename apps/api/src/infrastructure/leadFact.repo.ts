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

  /**
   * Phase 2: Count leads assigned to agent with specific statuses
   * Used for availability calculation
   */
  async countByAgentAndStatuses(orgId: string, agentUserId: string, statuses: string[]): Promise<number> {
    const prisma = getPrisma();
    return prisma.leadFact.count({
      where: {
        orgId,
        assignedUserId: agentUserId,
        statusValue: { in: statuses },
      },
    });
  }

  /**
   * Phase 2: Count leads assigned to agent since a specific date
   * Used for daily quota calculation
   */
  async countByAgentSince(orgId: string, agentUserId: string, since: Date): Promise<number> {
    const prisma = getPrisma();
    return prisma.leadFact.count({
      where: {
        orgId,
        assignedUserId: agentUserId,
        enteredAt: { gte: since },
      },
    });
  }

  /**
   * Phase 2: List all leads handled by a specific agent
   * Used for agent domain expertise learning
   */
  async listByAgent(orgId: string, agentUserId: string): Promise<any[]> {
    const prisma = getPrisma();
    return prisma.leadFact.findMany({
      where: {
        orgId,
        assignedUserId: agentUserId,
      },
      orderBy: {
        enteredAt: 'desc',
      },
    });
  }
}
