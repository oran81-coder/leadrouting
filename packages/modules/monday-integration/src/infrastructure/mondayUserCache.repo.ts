import { getPrisma } from "../../../../core/src/db/prisma";

export type MondayUserCached = { userId: string; name: string; email: string; updatedAt: string };

export class PrismaMondayUserCacheRepo {
  async upsertMany(orgId: string, users: Array<{ id: string; name: string; email: string }>): Promise<void> {
    const prisma = getPrisma();
    // naive batch upsert: per user (Phase 1 ok). Can be optimized later.
    for (const u of users) {
      await prisma.mondayUserCache.upsert({
        where: { orgId_userId: { orgId, userId: String(u.id) } },
        update: { name: u.name ?? "", email: u.email ?? "" },
        create: { orgId, userId: String(u.id), name: u.name ?? "", email: u.email ?? "" },
      });
    }
  }

  async list(orgId: string): Promise<MondayUserCached[]> {
    const prisma = getPrisma();
    const rows = await prisma.mondayUserCache.findMany({ where: { orgId }, take: 500 });
    return rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async findByEmail(orgId: string, email: string): Promise<MondayUserCached[]> {
    const prisma = getPrisma();
    const rows = await prisma.mondayUserCache.findMany({ where: { orgId, email: email } });
    return rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async findByNameCI(orgId: string, nameLower: string): Promise<MondayUserCached[]> {
    const prisma = getPrisma();
    // sqlite doesn't have ILIKE; store compare in app: fetch by org and filter
    const rows = await prisma.mondayUserCache.findMany({ where: { orgId }, take: 500 });
    return rows
      .filter((r) => (r.name ?? "").toLowerCase() === nameLower)
      .map((r) => ({
        userId: r.userId,
        name: r.name,
        email: r.email,
        updatedAt: r.updatedAt.toISOString(),
      }));
  }
}
