import { getPrisma } from "../../../../core/src/db/prisma";

export class PrismaIndustryWatchRepo {
  async get(orgId: string, boardId: string, itemId: string) {
    const prisma = getPrisma();
    return prisma.industryWatchState.findUnique({
      where: { orgId_boardId_itemId: { orgId, boardId, itemId } },
    });
  }

  async upsert(orgId: string, boardId: string, itemId: string, patch: { lastIndustry?: string | null }) {
    const prisma = getPrisma();
    return prisma.industryWatchState.upsert({
      where: { orgId_boardId_itemId: { orgId, boardId, itemId } },
      update: { lastIndustry: patch.lastIndustry ?? null, lastCheckedAt: new Date() },
      create: { orgId, boardId, itemId, lastIndustry: patch.lastIndustry ?? null, lastCheckedAt: new Date() },
    });
  }
}
