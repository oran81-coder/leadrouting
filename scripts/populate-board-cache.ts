/**
 * Script to populate Monday board cache with board names
 * This helps the UI display board names instead of IDs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function populateBoardCache() {
  console.log("[populate-board-cache] Fetching all proposals...");

  const proposals = await prisma.routingProposal.findMany({
    select: {
      boardId: true,
    },
    distinct: ['boardId'],
  });

  console.log(`[populate-board-cache] Found ${proposals.length} unique board IDs`);

  const ORG_ID = "org_1";

  for (const proposal of proposals) {
    const boardId = proposal.boardId;
    
    // Check if already in cache
    const existing = await prisma.mondayBoardCache.findUnique({
      where: {
        orgId_boardId: {
          orgId: ORG_ID,
          boardId: boardId,
        },
      },
    });

    if (existing) {
      console.log(`[populate-board-cache] ✓ Board ${boardId} already cached as "${existing.boardName}"`);
      continue;
    }

    // Create a mock board name (in production, this would come from Monday.com API)
    const mockBoardName = `Lead Board ${boardId.slice(-4)}`;

    await prisma.mondayBoardCache.create({
      data: {
        orgId: ORG_ID,
        boardId: boardId,
        boardName: mockBoardName,
      },
    });

    console.log(`[populate-board-cache] ✅ Created cache entry: "${mockBoardName}" for board ${boardId}`);
  }

  console.log("[populate-board-cache] Done!");
}

populateBoardCache()
  .catch((err) => {
    console.error("[populate-board-cache] Error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });

