/**
 * Capacity Calculator Service
 * 
 * Calculates how many leads each agent has received in different time windows
 */

import { getPrisma } from "../../../../packages/core/src/db/prisma";

export interface AgentCapacityStatus {
  agentUserId: string;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
  dailyReached: boolean;
  weeklyReached: boolean;
  monthlyReached: boolean;
  hasCapacityIssue: boolean; // true if any limit reached
}

export class CapacityCalculatorService {
  private prisma = getPrisma();

  /**
   * Calculate current capacity for a specific agent
   */
  async calculateAgentCapacity(
    orgId: string,
    agentUserId: string,
    limits: {
      dailyLimit: number | null;
      weeklyLimit: number | null;
      monthlyLimit: number | null;
    }
  ): Promise<AgentCapacityStatus> {
    const now = new Date();
    
    // Calculate time boundaries
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count APPROVED proposals in each time window
    const [dailyCount, weeklyCount, monthlyCount] = await Promise.all([
      this.countApprovedProposals(orgId, agentUserId, startOfDay),
      this.countApprovedProposals(orgId, agentUserId, startOfWeek),
      this.countApprovedProposals(orgId, agentUserId, startOfMonth)
    ]);

    const dailyReached = limits.dailyLimit !== null && dailyCount >= limits.dailyLimit;
    const weeklyReached = limits.weeklyLimit !== null && weeklyCount >= limits.weeklyLimit;
    const monthlyReached = limits.monthlyLimit !== null && monthlyCount >= limits.monthlyLimit;

    return {
      agentUserId,
      dailyCount,
      weeklyCount,
      monthlyCount,
      dailyReached,
      weeklyReached,
      monthlyReached,
      hasCapacityIssue: dailyReached || weeklyReached || monthlyReached
    };
  }

  /**
   * Calculate capacity for all agents
   */
  async calculateAllAgentsCapacity(
    orgId: string,
    agentUserIds: string[],
    limits: {
      dailyLimit: number | null;
      weeklyLimit: number | null;
      monthlyLimit: number | null;
    }
  ): Promise<Map<string, AgentCapacityStatus>> {
    const results = await Promise.all(
      agentUserIds.map(agentUserId =>
        this.calculateAgentCapacity(orgId, agentUserId, limits)
      )
    );

    return new Map(results.map(r => [r.agentUserId, r]));
  }

  /**
   * Count approved proposals for an agent since a given date
   */
  private async countApprovedProposals(
    orgId: string,
    agentUserId: string,
    since: Date
  ): Promise<number> {
    // Count proposals where:
    // 1. Status is APPROVED
    // 2. The action.assignee matches the agentUserId
    // 3. decidedAt (approval time) is after 'since'
    
    // Note: Prisma doesn't support JSON path queries in count()
    // So we fetch and filter in memory
    const proposals = await this.prisma.routingProposal.findMany({
      where: {
        orgId,
        status: 'APPROVED',
        decidedAt: {
          gte: since
        }
      },
      select: {
        action: true
      }
    });

    // Filter proposals where action.assignee matches agentUserId
    const count = proposals.filter(p => {
      try {
        const action = typeof p.action === 'string' ? JSON.parse(p.action) : p.action;
        return action?.assignee === agentUserId;
      } catch {
        return false;
      }
    }).length;

    return count;
  }

  /**
   * Get capacity warning message
   */
  getCapacityWarning(status: AgentCapacityStatus, limits: {
    dailyLimit: number | null;
    weeklyLimit: number | null;
    monthlyLimit: number | null;
  }): string | null {
    const warnings: string[] = [];

    if (status.dailyReached && limits.dailyLimit) {
      warnings.push(`Daily limit reached (${status.dailyCount}/${limits.dailyLimit})`);
    }
    
    if (status.weeklyReached && limits.weeklyLimit) {
      warnings.push(`Weekly limit reached (${status.weeklyCount}/${limits.weeklyLimit})`);
    }
    
    if (status.monthlyReached && limits.monthlyLimit) {
      warnings.push(`Monthly limit reached (${status.monthlyCount}/${limits.monthlyLimit})`);
    }

    return warnings.length > 0 ? warnings.join('; ') : null;
  }
}

