import { getPrisma } from "../../../../core/src/db/prisma";

/**
 * Writeback idempotency guard.
 * Ensures a given proposal is applied to Monday at most once.
 *
 * Strategy:
 * - create RoutingApply row with unique (orgId, proposalId)
 * - if unique violation -> already applied (or another worker applying)
 */
export class PrismaRoutingApplyRepo {
  async tryBegin(orgId: string, proposalId: string): Promise<"BEGIN" | "ALREADY"> {
    const prisma = getPrisma();
    try {
      await prisma.routingApply.create({ data: { orgId, proposalId } });
      return "BEGIN";
    } catch (e: any) {
      // Prisma unique error: P2002
      if (e?.code === "P2002") return "ALREADY";
      throw e;
    }
  }

  async getByKey(orgId: string, idempotencyKey: string): Promise<any | null> {
    const prisma = getPrisma();
    const row = await prisma.routingApply.findUnique({
      where: { orgId_proposalId: { orgId, proposalId: idempotencyKey } }
    });
    return row;
  }

  async markComplete(orgId: string, proposalId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingApply.updateMany({
      where: { orgId, proposalId },
      data: { completedAt: new Date() }
    });
  }
}
