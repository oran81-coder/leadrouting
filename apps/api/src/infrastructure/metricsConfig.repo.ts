import { getPrisma } from "../../../../packages/core/src/db/prisma";

export class PrismaMetricsConfigRepo {
  async get(orgId: string) {
    const prisma = getPrisma();
    return prisma.metricsConfig.findUnique({ where: { orgId } });
  }

  async getOrCreateDefaults(orgId: string) {
    const prisma = getPrisma();
    console.log("[metricsConfig.repo] getOrCreateDefaults called with orgId:", orgId);
    const existing = await prisma.metricsConfig.findUnique({ where: { orgId } });
    console.log("[metricsConfig.repo] existing config found:", !!existing);
    if (existing) return existing;

    console.log("[metricsConfig.repo] Creating new MetricsConfig for orgId:", orgId);
    return prisma.metricsConfig.create({
      data: {
        orgId,
        leadBoardIds: "",
        
        // Phase 2 weights (sum to 100%)
        weightDomainExpertise: 30,
        weightAvailability: 5,
        weightConversionHistorical: 20,
        weightRecentPerformance: 20,
        weightAvgDealSize: 5,
        weightResponseTime: 5,
        weightAvgTimeToClose: 5,
        weightHotAgent: 10,
        
        // Phase 2 settings
        hotAgentMinDeals: 3,
        hotAgentWindowDays: 7,
        recentPerfWindowDays: 30,
        dailyLeadThreshold: 20,
        
        // Feature toggles
        enableIndustryPerf: true,
        enableConversion: true,
        enableAvgDealSize: true,
        enableHotStreak: true,
        enableResponseSpeed: true,
        enableBurnout: true,
        enableAvailabilityCap: true,
        
        // DEPRECATED fields (for backward compatibility)
        weightIndustryPerf: 25,
        weightConversion: 20,
        weightAvgDeal: 15,
        weightHotStreak: 10,
        weightResponseSpeed: 15,
        weightBurnout: 10,
        weightAvailabilityCap: 5,
      },
    });
  }

  async update(orgId: string, patch: any) {
    const prisma = getPrisma();
    return prisma.metricsConfig.update({ where: { orgId }, data: patch });
  }

  /**
   * Phase 2: Get KPI weights configuration
   */
  async getWeights(orgId: string) {
    const prisma = getPrisma();
    const config = await prisma.metricsConfig.findUnique({ where: { orgId } });
    
    if (!config) {
      // Return defaults if not configured
      return {
        weights: {
          domainExpertise: 30,
          availability: 5,
          conversionHistorical: 20,
          recentPerformance: 20,
          avgDealSize: 5,
          responseTime: 5,
          avgTimeToClose: 5,
          hotAgent: 10,
        },
        settings: {
          hotAgentMinDeals: 3,
          hotAgentWindowDays: 7,
          recentPerfWindowDays: 30,
          dailyLeadThreshold: 20,
        },
      };
    }
    
    return {
      weights: {
        domainExpertise: config.weightDomainExpertise,
        availability: config.weightAvailability,
        conversionHistorical: config.weightConversionHistorical,
        recentPerformance: config.weightRecentPerformance,
        avgDealSize: config.weightAvgDealSize,
        responseTime: config.weightResponseTime,
        avgTimeToClose: config.weightAvgTimeToClose,
        hotAgent: config.weightHotAgent,
      },
      settings: {
        hotAgentMinDeals: config.hotAgentMinDeals,
        hotAgentWindowDays: config.hotAgentWindowDays,
        recentPerfWindowDays: config.recentPerfWindowDays,
        dailyLeadThreshold: config.dailyLeadThreshold,
      },
    };
  }

  /**
   * Phase 2: Update KPI weights
   */
  async updateWeights(orgId: string, weights: any, settings: any) {
    const prisma = getPrisma();
    
    // Ensure config exists
    await this.getOrCreateDefaults(orgId);
    
    return prisma.metricsConfig.update({
      where: { orgId },
      data: {
        weightDomainExpertise: weights.domainExpertise,
        weightAvailability: weights.availability,
        weightConversionHistorical: weights.conversionHistorical,
        weightRecentPerformance: weights.recentPerformance,
        weightAvgDealSize: weights.avgDealSize,
        weightResponseTime: weights.responseTime,
        weightAvgTimeToClose: weights.avgTimeToClose,
        weightHotAgent: weights.hotAgent,
        hotAgentMinDeals: settings.hotAgentMinDeals,
        hotAgentWindowDays: settings.hotAgentWindowDays,
        recentPerfWindowDays: settings.recentPerfWindowDays,
      },
    });
  }
}
