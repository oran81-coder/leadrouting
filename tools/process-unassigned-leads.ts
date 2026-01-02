import { getPrisma } from "../packages/core/src/db/prisma";
import { executeRouting } from "../apps/api/src/services/routingExecutor";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function processUnassignedLeads() {
  console.log(`Processing unassigned leads for org ${orgId}...`);

  // Get all leads without assignedUserId
  const unassignedLeads = await prisma.leadFact.findMany({
    where: {
      orgId,
      assignedUserId: null,
    },
  });

  console.log(`Found ${unassignedLeads.length} unassigned leads`);

  // Check if they already have proposals
  for (const lead of unassignedLeads) {
    console.log(`\nProcessing: ${lead.itemName || lead.itemId}`);
    
    // Check for existing proposal
    const existingProposal = await prisma.routingProposal.findFirst({
      where: {
        orgId,
        boardId: lead.boardId,
        itemId: lead.itemId,
      },
    });

    if (existingProposal) {
      console.log(`  ⏭️  Already has proposal: ${existingProposal.status}`);
      continue;
    }

    console.log(`  🎯 Creating routing proposal...`);
    
    try {
      // Call routing execute
      const result = await executeRouting({
        orgId,
        boardId: lead.boardId,
        itemId: lead.itemId,
      });
      
      console.log(`  ✅ Created proposal:`, result);
    } catch (error: any) {
      console.error(`  ❌ Failed:`, error.message);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Done!");
}

processUnassignedLeads();
