/**
 * Quick script to verify board cache is working
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkCache() {
  const boards = await prisma.mondayBoardCache.findMany();
  console.log("[check-cache] Board cache entries:");
  boards.forEach(b => {
    console.log(`  - Board ${b.boardId}: "${b.boardName}"`);
  });

  const proposals = await prisma.routingProposal.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
  
  console.log("\n[check-cache] Recent proposals:");
  for (const p of proposals) {
    const board = await prisma.mondayBoardCache.findUnique({
      where: {
        orgId_boardId: {
          orgId: "org_1",
          boardId: p.boardId,
        },
      },
    });
    console.log(`  - Proposal ${p.id.slice(0, 8)}... has boardId ${p.boardId} → "${board?.boardName || 'NOT FOUND'}"`);
  }
}

checkCache()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });

