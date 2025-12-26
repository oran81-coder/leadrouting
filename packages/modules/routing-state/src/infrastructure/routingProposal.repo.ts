import { getPrisma } from "../../../../core/src/db/prisma";

export type ProposalStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "OVERRIDDEN" | "APPLIED";

export interface RoutingProposal {
  id: string;
  idempotencyKey: string;
  orgId: string;
  boardId: string;
  itemId: string;
  status: ProposalStatus;
  normalizedValues: unknown;
  selectedRule?: unknown;
  action?: unknown;
  explainability?: unknown;
  decidedAt?: string | null;
  decidedBy?: string | null;
  decisionNotes?: string | null;
  createdAt: string;
}

export class PrismaRoutingProposalRepo {
  /**
   * Idempotent create: upserts by (orgId, idempotencyKey).
   * Used to prevent duplicates on retries for the same item+versions.
   */
    async create(args: {
    orgId: string;
    idempotencyKey: string;
    boardId: string;
    itemId: string;
    itemName?: string | null;
    normalizedValues: unknown;
    selectedRule?: unknown;
    action?: unknown;
    explainability?: unknown;
  }): Promise<RoutingProposal> {
    const prisma = getPrisma();

    // Preserve APPLIED proposals for idempotency: never reset an already-applied decision back to PROPOSED.
    const existing = await prisma.routingProposal.findUnique({
      where: { orgId_idempotencyKey: { orgId: args.orgId, idempotencyKey: args.idempotencyKey } },
    });
    if (existing && (existing.status as any) === "APPLIED") {
      return existing as any;
    }

    const row = await prisma.routingProposal.upsert({
      where: { orgId_idempotencyKey: { orgId: args.orgId, idempotencyKey: args.idempotencyKey } },
      update: {
        boardId: args.boardId,
        itemId: args.itemId,
        itemName: args.itemName ?? null,
        normalizedValues: JSON.stringify(args.normalizedValues),
        selectedRule: args.selectedRule ? JSON.stringify(args.selectedRule) : null,
        action: args.action ? JSON.stringify(args.action) : null,
        explainability: args.explainability ? JSON.stringify(args.explainability) : null,
        status: "PROPOSED" as any,
      },
      create: {
        orgId: args.orgId,
        idempotencyKey: args.idempotencyKey,
        boardId: args.boardId,
        itemId: args.itemId,
        itemName: args.itemName ?? null,
        normalizedValues: JSON.stringify(args.normalizedValues),
        selectedRule: args.selectedRule ? JSON.stringify(args.selectedRule) : null,
        action: args.action ? JSON.stringify(args.action) : null,
        explainability: args.explainability ? JSON.stringify(args.explainability) : null,
        status: "PROPOSED" as any,
      },
    });
    return row as any;
  }


  async getById(orgId: string, id: string): Promise<RoutingProposal | null> {
    const prisma = getPrisma();
    const row = await prisma.routingProposal.findFirst({ where: { orgId, id } });
    return row ? this.toDto(row) : null;
  }

  async list(args: {
    orgId: string;
    status?: ProposalStatus | "PENDING";
    cursor?: string;
    limit?: number;
    boardId?: string;
    itemId?: string;
  }): Promise<{ items: RoutingProposal[]; nextCursor: string | null }> {
    const prisma = getPrisma();
    
    // Build WHERE clause
    const where: any = { orgId: args.orgId };
    
    // Handle special "PENDING" status filter
    if (args.status === "PENDING") {
      where.status = "PROPOSED";
    } else if (args.status) {
      where.status = args.status;
    }
    
    if (args.boardId) {
      where.boardId = args.boardId;
    }
    
    if (args.itemId) {
      where.itemId = args.itemId;
    }
    
    // Cursor-based pagination
    if (args.cursor) {
      where.id = { lt: args.cursor };
    }
    
    const limit = args.limit ?? 25;
    
    const rows = await prisma.routingProposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine if there's a next page
    });
    
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((r) => this.toDto(r));
    const nextCursor = hasMore ? rows[limit - 1].id : null;
    
    return { items, nextCursor };
  }

  async setDecision(args: {
    orgId: string;
    id: string;
    status: ProposalStatus;
    decidedBy?: string | null;
    decisionNotes?: string | null;
    actionOverride?: unknown;
  }): Promise<RoutingProposal> {
    const prisma = getPrisma();
    const row = await prisma.routingProposal.update({
      where: { id: args.id },
      data: {
        status: args.status as any,
        decidedAt: new Date(),
        decidedBy: args.decidedBy ?? null,
        decisionNotes: args.decisionNotes ?? null,
        action: args.actionOverride ? JSON.stringify(args.actionOverride) : undefined,
      },
    });
    return this.toDto(row);
  }

  async markApplied(_orgId: string, id: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.routingProposal.update({ where: { id }, data: { status: "APPLIED" as any } });
  }

  private toDto(row: any): RoutingProposal {
    return {
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      orgId: row.orgId,
      boardId: row.boardId,
      itemId: row.itemId,
      status: row.status,
      normalizedValues: row.normalizedValues ? JSON.parse(row.normalizedValues) : null,
      selectedRule: row.selectedRule ? JSON.parse(row.selectedRule) : undefined,
      action: row.action ? JSON.parse(row.action) : undefined,
      explainability: row.explainability ? JSON.parse(row.explainability) : undefined,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      decidedBy: row.decidedBy ?? null,
      decisionNotes: row.decisionNotes ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
