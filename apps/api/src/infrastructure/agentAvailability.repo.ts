/**
 * AgentAvailability Repository
 * 
 * Manages agent availability status (excluded/available for routing)
 */

import { getPrisma } from "../../../../packages/core/src/db/prisma";

export interface AgentAvailabilityDTO {
  id: string;
  orgId: string;
  agentUserId: string;
  isAvailable: boolean;
  reason?: string | null;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export class PrismaAgentAvailabilityRepo {
  private prisma = getPrisma();

  /**
   * Get availability for a specific agent
   */
  async getByAgent(orgId: string, agentUserId: string): Promise<AgentAvailabilityDTO | null> {
    return this.prisma.agentAvailability.findUnique({
      where: {
        orgId_agentUserId: { orgId, agentUserId }
      }
    });
  }

  /**
   * Get all agent availability settings for an org
   */
  async listByOrg(orgId: string): Promise<AgentAvailabilityDTO[]> {
    return this.prisma.agentAvailability.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Get only unavailable agents
   */
  async listUnavailableAgents(orgId: string): Promise<AgentAvailabilityDTO[]> {
    return this.prisma.agentAvailability.findMany({
      where: { 
        orgId,
        isAvailable: false
      }
    });
  }

  /**
   * Set agent availability status
   */
  async setAvailability(params: {
    orgId: string;
    agentUserId: string;
    isAvailable: boolean;
    reason?: string;
    updatedBy?: string;
  }): Promise<AgentAvailabilityDTO> {
    return this.prisma.agentAvailability.upsert({
      where: {
        orgId_agentUserId: {
          orgId: params.orgId,
          agentUserId: params.agentUserId
        }
      },
      update: {
        isAvailable: params.isAvailable,
        reason: params.reason,
        updatedBy: params.updatedBy
      },
      create: {
        orgId: params.orgId,
        agentUserId: params.agentUserId,
        isAvailable: params.isAvailable,
        reason: params.reason,
        updatedBy: params.updatedBy
      }
    });
  }

  /**
   * Check if agent is available
   */
  async isAgentAvailable(orgId: string, agentUserId: string): Promise<boolean> {
    const availability = await this.getByAgent(orgId, agentUserId);
    // If no record exists, agent is considered available by default
    return availability?.isAvailable ?? true;
  }

  /**
   * Bulk set availability for multiple agents
   */
  async bulkSetAvailability(params: {
    orgId: string;
    agentUserIds: string[];
    isAvailable: boolean;
    updatedBy?: string;
  }): Promise<number> {
    const operations = params.agentUserIds.map(agentUserId =>
      this.prisma.agentAvailability.upsert({
        where: {
          orgId_agentUserId: {
            orgId: params.orgId,
            agentUserId
          }
        },
        update: {
          isAvailable: params.isAvailable,
          updatedBy: params.updatedBy
        },
        create: {
          orgId: params.orgId,
          agentUserId,
          isAvailable: params.isAvailable,
          updatedBy: params.updatedBy
        }
      })
    );

    await this.prisma.$transaction(operations);
    return operations.length;
  }
}

