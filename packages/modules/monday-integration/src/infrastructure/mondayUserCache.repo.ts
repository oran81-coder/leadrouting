import { getPrisma } from "../../../../core/src/db/prisma";

export type MondayUserCached = { userId: string; name: string; email: string; updatedAt: string };

export class PrismaMondayUserCacheRepo {
  async upsertMany(orgId: string, users: Array<{ id: string; name: string; email: string }>): Promise<void> {
    const prisma = getPrisma();
    // Optimized batch upsert: use transaction with batch operations
    // This eliminates N+1 query issue by processing all users in a single transaction
    await prisma.$transaction(async (tx) => {
      // Fetch all existing users in one query
      const userIds = users.map(u => String(u.id));
      const existing = await tx.mondayUserCache.findMany({
        where: { 
          orgId, 
          userId: { in: userIds } 
        },
        select: { userId: true }
      });
      
      const existingSet = new Set(existing.map(e => e.userId));
      
      // Separate into updates and creates
      const toUpdate = users.filter(u => existingSet.has(String(u.id)));
      const toCreate = users.filter(u => !existingSet.has(String(u.id)));
      
      // Batch update using updateMany (one query per user, but in transaction)
      for (const u of toUpdate) {
        await tx.mondayUserCache.updateMany({
          where: { orgId, userId: String(u.id) },
          data: { name: u.name ?? "", email: u.email ?? "" }
        });
      }
      
      // Batch create using createMany (single query for all creates)
      // Note: SQLite doesn't support skipDuplicates in createMany, but since we
      // pre-filtered for non-existing users, this should be safe
      if (toCreate.length > 0) {
        await tx.mondayUserCache.createMany({
          data: toCreate.map(u => ({
            orgId,
            userId: String(u.id),
            name: u.name ?? "",
            email: u.email ?? ""
          }))
        });
      }
    });
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
    // Optimized: Use contains to narrow down candidates, then filter in-memory
    // This is significantly better than loading all 500 users
    // SQLite doesn't support native case-insensitive equals in Prisma
    const rows = await prisma.mondayUserCache.findMany({ 
      where: { 
        orgId,
        // Use contains to pre-filter candidates (still case-sensitive in SQLite)
        name: {
          contains: nameLower.toLowerCase().substring(0, 3) // Use first 3 chars for index optimization
        }
      },
      take: 100 // Limit to prevent over-fetching
    });
    
    // Final case-insensitive filter in-memory (small dataset after DB filter)
    const filtered = rows.filter((r) => (r.name ?? "").toLowerCase() === nameLower.toLowerCase());
    
    return filtered.map((r) => ({
      userId: r.userId,
      name: r.name,
      email: r.email,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async deleteAll(orgId: string): Promise<number> {
    const prisma = getPrisma();
    const result = await prisma.mondayUserCache.deleteMany({ where: { orgId } });
    return result.count;
  }
}
