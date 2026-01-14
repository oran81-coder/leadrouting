import { getPrisma } from "../../../../packages/core/src/db/prisma";
import type { AgentProfile } from "../../../../packages/modules/agent-profiling/src/application/agentProfiler";

/**
 * Repository for AgentProfile persistence
 * Stores computed agent metrics in the database
 */
export class PrismaAgentProfileRepo {
  /**
   * Save or update an agent profile
   */
  async upsert(profile: AgentProfile): Promise<void> {
    const prisma = getPrisma();

    const data = {
      agentUserId: profile.agentUserId,
      agentName: profile.agentName,
      orgId: profile.orgId,

      // Performance
      conversionRate: profile.conversionRate,
      totalLeadsHandled: profile.totalLeadsHandled,
      totalLeadsConverted: profile.totalLeadsConverted,

      // Revenue
      avgDealSize: profile.avgDealSize,
      totalRevenue: profile.totalRevenue,

      // Speed
      avgResponseTime: profile.avgResponseTime,
      avgTimeToClose: profile.avgTimeToClose,

      // Capacity
      availability: profile.availability,
      currentActiveLeads: profile.currentActiveLeads,
      dailyLeadsToday: profile.dailyLeadsToday,

      // Momentum
      hotStreakCount: profile.hotStreakCount,
      hotStreakActive: profile.hotStreakActive,

      // Burnout
      burnoutScore: profile.burnoutScore,
      timeSinceLastWin: profile.timeSinceLastWin !== null ? BigInt(Math.round(profile.timeSinceLastWin)) : null,
      timeSinceLastActivity: profile.timeSinceLastActivity !== null ? BigInt(Math.round(profile.timeSinceLastActivity)) : null,

      // Domain
      industryScores: JSON.stringify(profile.industryScores),

      // Metadata
      computedAt: profile.computedAt,
      dataWindowDays: profile.dataWindowDays,
    };

    await prisma.agentProfile.upsert({
      where: {
        orgId_agentUserId: {
          orgId: profile.orgId,
          agentUserId: profile.agentUserId,
        },
      },
      update: data,
      create: data,
    });
  }

  /**
   * Get agent profile by ID
   */
  async get(orgId: string, agentUserId: string): Promise<AgentProfile | null> {
    const prisma = getPrisma();

    const row = await prisma.agentProfile.findUnique({
      where: {
        orgId_agentUserId: {
          orgId,
          agentUserId,
        },
      },
    });

    if (!row) return null;

    return this.rowToProfile(row);
  }

  /**
   * Get all agent profiles for an org
   */
  async listByOrg(orgId: string): Promise<AgentProfile[]> {
    const prisma = getPrisma();

    const rows = await prisma.agentProfile.findMany({
      where: { orgId },
      orderBy: { computedAt: 'desc' },
    });

    return rows.map(row => this.rowToProfile(row));
  }

  /**
   * Get eligible agents (availability > 0)
   */
  async listEligibleAgents(orgId: string): Promise<AgentProfile[]> {
    const prisma = getPrisma();

    const rows = await prisma.agentProfile.findMany({
      where: {
        orgId,
        availability: { gt: 0 },
      },
      orderBy: [
        { availability: 'desc' },
        { conversionRate: 'desc' },
      ],
    });

    return rows.map(row => this.rowToProfile(row));
  }

  /**
   * Delete all profiles for an org (cleanup)
   */
  async deleteByOrg(orgId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.agentProfile.deleteMany({ where: { orgId } });
  }

  /**
   * Delete a specific agent profile
   */
  async delete(orgId: string, agentUserId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.agentProfile.delete({
      where: {
        orgId_agentUserId: { orgId, agentUserId },
      },
    });
  }

  /**
   * Convert database row to AgentProfile
   */
  private rowToProfile(row: any): AgentProfile {
    return {
      agentUserId: row.agentUserId,
      agentName: row.agentName,
      orgId: row.orgId,

      // Performance
      conversionRate: row.conversionRate,
      totalLeadsHandled: row.totalLeadsHandled,
      totalLeadsConverted: row.totalLeadsConverted,

      // Revenue
      avgDealSize: row.avgDealSize,
      totalRevenue: row.totalRevenue,

      // Speed
      avgResponseTime: row.avgResponseTime,
      avgTimeToClose: row.avgTimeToClose,

      // Capacity
      availability: row.availability,
      currentActiveLeads: row.currentActiveLeads,
      dailyLeadsToday: row.dailyLeadsToday,

      // Momentum
      hotStreakCount: row.hotStreakCount,
      hotStreakActive: row.hotStreakActive,

      // Burnout
      burnoutScore: row.burnoutScore,
      timeSinceLastWin: row.timeSinceLastWin !== null ? Number(row.timeSinceLastWin) : null,
      timeSinceLastActivity: row.timeSinceLastActivity !== null ? Number(row.timeSinceLastActivity) : null,

      // Domain
      industryScores: JSON.parse(row.industryScores),
      domainProfile: null, // Not stored in DB, computed on demand

      // Metadata
      computedAt: row.computedAt,
      dataWindowDays: row.dataWindowDays,
    };
  }
}

