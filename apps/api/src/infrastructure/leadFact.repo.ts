import { getPrisma } from "../../../../packages/core/src/db/prisma";

export class PrismaLeadFactRepo {
  async upsert(orgId: string, boardId: string, itemId: string, patch: any) {
    const prisma = getPrisma();
    return prisma.leadFact.upsert({
      where: { orgId_boardId_itemId: { orgId, boardId, itemId } },
      update: patch,
      create: { orgId, boardId, itemId, ...patch },
    });
  }

  async get(orgId: string, boardId: string, itemId: string) {
    const prisma = getPrisma();
    return prisma.leadFact.findUnique({ where: { orgId_boardId_itemId: { orgId, boardId, itemId } } });
  }

  async create(data: any) {
    const prisma = getPrisma();
    return prisma.leadFact.create({ data });
  }

  async update(orgId: string, boardId: string, itemId: string, patch: any) {
    const prisma = getPrisma();
    return prisma.leadFact.update({
      where: { orgId_boardId_itemId: { orgId, boardId, itemId } },
      data: patch,
    });
  }

  async listByAgentInWindow(orgId: string, agentUserId: string, since: Date) {
    const prisma = getPrisma();
    return prisma.leadFact.findMany({
      where: {
        orgId: orgId,
        assignedUserId: agentUserId,
        OR: [
          { enteredAt: { gte: since } },
          { closedWonAt: { gte: since } },
          { firstTouchAt: { gte: since } },
        ],
      },
    });
  }

  async listClosedWonSince(orgId: string, since: Date) {
    const prisma = getPrisma();
    return prisma.leadFact.findMany({
      where: {
        orgId: orgId,
        closedWonAt: { gte: since },
        assignedUserId: { not: null },
      },
    });
  }

  async listSince(orgId: string, since: Date) {
    const prisma = getPrisma();
    return prisma.leadFact.findMany({
      where: {
        orgId: orgId,
        enteredAt: { gte: since },
      },
    });
  }

  async listAgentsWithFacts(orgId: string) {
    const prisma = getPrisma();
    const rows = await prisma.leadFact.findMany({
      where: { orgId: orgId, assignedUserId: { not: null } },
      select: { assignedUserId: true },
      distinct: ["assignedUserId"],
    });
    return rows.map((r) => r.assignedUserId!).filter(Boolean);
  }

  /**
   * @deprecated Use countActiveLeadsByAgent() instead (smart auto-detection)
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

  /**
   * Phase 2: Count "active" leads for an agent using smart detection
   * "Active" = Assigned to agent AND NOT (Won/Lost/Excluded)
   * Used for availability calculation with auto-detection logic
   * 
   * @param orgId - Organization ID
   * @param agentUserId - Monday user ID of the agent
   * @param closedWonStatuses - Statuses that indicate deal won
   * @param closedLostStatuses - Optional statuses that indicate deal lost
   * @param excludedStatuses - Optional list of statuses to exclude (e.g., "Spam", "Archived")
   * @returns Count of active leads
   */
  async countActiveLeadsByAgent(
    orgId: string,
    agentUserId: string,
    closedWonStatuses: string[],
    closedLostStatuses?: string[],
    excludedStatuses?: string[]
  ): Promise<number> {
    const prisma = getPrisma();

    // Build list of statuses to exclude
    const excludedStatusList = [...closedWonStatuses];
    if (closedLostStatuses && closedLostStatuses.length > 0) {
      excludedStatusList.push(...closedLostStatuses);
    }
    if (excludedStatuses && excludedStatuses.length > 0) {
      excludedStatusList.push(...excludedStatuses);
    }

    return prisma.leadFact.count({
      where: {
        orgId,
        assignedUserId: agentUserId,              // Must be assigned to this agent
        statusValue: { notIn: excludedStatusList } // Not in closed/excluded statuses
      }
    });
  }
}
