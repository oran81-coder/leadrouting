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
}
