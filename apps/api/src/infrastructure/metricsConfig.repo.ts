import { getPrisma } from "../../../../packages/core/src/db/prisma";

const ORG_ID = "org_1";

export class PrismaMetricsConfigRepo {
  async get() {
    const prisma = getPrisma();
    return prisma.metricsConfig.findUnique({ where: { orgId: ORG_ID } });
  }

  async getOrCreateDefaults() {
    const prisma = getPrisma();
    const existing = await prisma.metricsConfig.findUnique({ where: { orgId: ORG_ID } });
    if (existing) return existing;

    return prisma.metricsConfig.create({
      data: {
        orgId: ORG_ID,
        leadBoardIds: "",
          enableIndustryPerf: true,
          enableConversion: true,
          enableAvgDealSize: true,
          enableHotStreak: true,
          enableResponseSpeed: true,
          enableBurnout: true,
          enableAvailabilityCap: true,

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

  async update(patch: any) {
    const prisma = getPrisma();
    return prisma.metricsConfig.update({ where: { orgId: ORG_ID }, data: patch });
  }

  /**
   * Phase 2: Get KPI weights configuration
   */
  async getWeights() {
    const prisma = getPrisma();
    const config = await prisma.metricsConfig.findUnique({ where: { orgId: ORG_ID } });
    
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
  async updateWeights(weights: any, settings: any) {
    const prisma = getPrisma();
    
    // Ensure config exists
    await this.getOrCreateDefaults();
    
    return prisma.metricsConfig.update({
      where: { orgId: ORG_ID },
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
