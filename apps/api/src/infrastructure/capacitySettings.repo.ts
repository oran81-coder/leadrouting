/**
 * CapacitySettings Repository
 * 
 * Manages global capacity limits for lead distribution
 */

import { getPrisma } from "../../../../packages/core/src/db/prisma";

export interface CapacitySettingsDTO {
  id: string;
  orgId: string;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  updatedBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export class PrismaCapacitySettingsRepo {
  private prisma = getPrisma();

  /**
   * Get capacity settings for org
   */
  async getByOrg(orgId: string): Promise<CapacitySettingsDTO | null> {
    return this.prisma.capacitySettings.findUnique({
      where: { orgId }
    });
  }

  /**
   * Get or create default capacity settings
   */
  async getOrCreateDefaults(orgId: string): Promise<CapacitySettingsDTO> {
    let settings = await this.getByOrg(orgId);
    
    if (!settings) {
      settings = await this.prisma.capacitySettings.create({
        data: {
          orgId,
          dailyLimit: null,   // Unlimited by default
          weeklyLimit: null,
          monthlyLimit: null
        }
      });
    }
    
    return settings;
  }

  /**
   * Update capacity settings
   */
  async update(params: {
    orgId: string;
    dailyLimit?: number | null;
    weeklyLimit?: number | null;
    monthlyLimit?: number | null;
    updatedBy?: string;
  }): Promise<CapacitySettingsDTO> {
    return this.prisma.capacitySettings.upsert({
      where: { orgId: params.orgId },
      update: {
        dailyLimit: params.dailyLimit,
        weeklyLimit: params.weeklyLimit,
        monthlyLimit: params.monthlyLimit,
        updatedBy: params.updatedBy
      },
      create: {
        orgId: params.orgId,
        dailyLimit: params.dailyLimit ?? null,
        weeklyLimit: params.weeklyLimit ?? null,
        monthlyLimit: params.monthlyLimit ?? null,
        updatedBy: params.updatedBy
      }
    });
  }
}

