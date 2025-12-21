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
}
