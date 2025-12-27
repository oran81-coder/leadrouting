/**
 * Organization Repository
 * Phase 7.3: Multi-Tenant Support
 * 
 * Manages organization entities for multi-tenant architecture
 */

import { PrismaClient, Organization, Prisma } from "@prisma/client";

export interface CreateOrganizationInput {
  name: string;
  displayName?: string;
  email?: string;
  phone?: string;
  tier?: string;
  mondayWorkspaceId?: string;
  createdBy?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationInput {
  displayName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  tier?: string;
  mondayWorkspaceId?: string;
  settings?: Record<string, any>;
}

export class PrismaOrganizationRepo {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get organization by ID
   */
  async get(orgId: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id: orgId },
    });
  }

  /**
   * Get organization by name (unique)
   */
  async getByName(name: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { name },
    });
  }

  /**
   * Get organization by Monday.com workspace ID
   */
  async getByMondayWorkspace(
    mondayWorkspaceId: string
  ): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: { mondayWorkspaceId },
    });
  }

  /**
   * List all organizations (with optional filters)
   */
  async list(filters?: {
    isActive?: boolean;
    tier?: string;
    limit?: number;
    offset?: number;
  }): Promise<Organization[]> {
    const where: Prisma.OrganizationWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.tier) {
      where.tier = filters.tier;
    }

    return this.prisma.organization.findMany({
      where,
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create a new organization
   */
  async create(input: CreateOrganizationInput): Promise<Organization> {
    const settingsJson =
      input.settings ? JSON.stringify(input.settings) : "{}";

    return this.prisma.organization.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        email: input.email,
        phone: input.phone,
        tier: input.tier || "standard",
        mondayWorkspaceId: input.mondayWorkspaceId,
        createdBy: input.createdBy,
        settings: settingsJson,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update an organization
   */
  async update(
    orgId: string,
    input: UpdateOrganizationInput
  ): Promise<Organization> {
    const data: Prisma.OrganizationUpdateInput = {
      updatedAt: new Date(),
    };

    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.email !== undefined) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.tier !== undefined) data.tier = input.tier;
    if (input.mondayWorkspaceId !== undefined)
      data.mondayWorkspaceId = input.mondayWorkspaceId;
    if (input.settings !== undefined)
      data.settings = JSON.stringify(input.settings);

    return this.prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }

  /**
   * Delete an organization (soft delete by setting isActive = false)
   */
  async softDelete(orgId: string): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Hard delete an organization (CASCADE will delete all related data)
   * USE WITH EXTREME CAUTION - this will delete ALL tenant data!
   */
  async hardDelete(orgId: string): Promise<void> {
    await this.prisma.organization.delete({
      where: { id: orgId },
    });
  }

  /**
   * Count total organizations
   */
  async count(filters?: {
    isActive?: boolean;
    tier?: string;
  }): Promise<number> {
    const where: Prisma.OrganizationWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.tier) {
      where.tier = filters.tier;
    }

    return this.prisma.organization.count({ where });
  }

  /**
   * Check if organization name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.OrganizationWhereInput = { name };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.organization.count({ where });
    return count > 0;
  }

  /**
   * Get organization with statistics
   */
  async getWithStats(orgId: string): Promise<{
    organization: Organization;
    stats: {
      totalUsers: number;
      totalProposals: number;
      totalLeads: number;
      totalAgents: number;
    };
  } | null> {
    const organization = await this.get(orgId);
    if (!organization) return null;

    const [totalUsers, totalProposals, totalLeads, totalAgents] =
      await Promise.all([
        this.prisma.user.count({ where: { orgId } }),
        this.prisma.routingProposal.count({ where: { orgId } }),
        this.prisma.leadFact.count({ where: { orgId } }),
        this.prisma.agentProfile.count({ where: { orgId } }),
      ]);

    return {
      organization,
      stats: {
        totalUsers,
        totalProposals,
        totalLeads,
        totalAgents,
      },
    };
  }
}

