import { getPrisma } from "../../../../core/src/db/prisma";

export interface MondayBoard {
  orgId: string;
  boardId: string;
  boardName: string;
}

export class PrismaMondayBoardCacheRepo {
  async upsert(board: MondayBoard): Promise<void> {
    const prisma = getPrisma();
    await prisma.mondayBoardCache.upsert({
      where: {
        orgId_boardId: {
          orgId: board.orgId,
          boardId: board.boardId,
        },
      },
      create: {
        orgId: board.orgId,
        boardId: board.boardId,
        boardName: board.boardName,
      },
      update: {
        boardName: board.boardName,
        updatedAt: new Date(),
      },
    });
  }

  async list(orgId: string): Promise<MondayBoard[]> {
    const prisma = getPrisma();
    const rows = await prisma.mondayBoardCache.findMany({
      where: { orgId },
      orderBy: { boardName: "asc" },
    });
    return rows.map((r) => ({
      orgId: r.orgId,
      boardId: r.boardId,
      boardName: r.boardName,
    }));
  }

  async get(orgId: string, boardId: string): Promise<MondayBoard | null> {
    const prisma = getPrisma();
    const row = await prisma.mondayBoardCache.findUnique({
      where: {
        orgId_boardId: {
          orgId,
          boardId,
        },
      },
    });
    if (!row) return null;
    return {
      orgId: row.orgId,
      boardId: row.boardId,
      boardName: row.boardName,
    };
  }

  async clear(orgId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.mondayBoardCache.deleteMany({
      where: { orgId },
    });
  }

  async refresh(orgId: string, boards: Array<{ id: string; name: string }>): Promise<void> {
    await this.clear(orgId);
    for (const board of boards) {
      await this.upsert({
        orgId,
        boardId: board.id,
        boardName: board.name,
      });
    }
  }
}

