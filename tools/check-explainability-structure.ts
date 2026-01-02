import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orgId = "cmjt563ps000037hg6i4dvl7m";

  console.log("\n=== Explainability Structure Check ===\n");
  
  const proposal = await prisma.routingProposal.findFirst({
    where: { orgId, status: "PROPOSED" },
    orderBy: { createdAt: "desc" },
  });

  if (!proposal) {
    console.log("No proposals found!");
    await prisma.$disconnect();
    return;
  }

  console.log(`Proposal: ${proposal.itemName} (${proposal.id})\n`);

  if (proposal.explainability) {
    const explain = typeof proposal.explainability === 'string' 
      ? JSON.parse(proposal.explainability) 
      : proposal.explainability;
    
    console.log("Full explainability structure:");
    console.log(JSON.stringify(explain, null, 2));
    
    console.log("\n\n=== Key Fields ===");
    console.log("summary:", explain.summary);
    console.log("\ntopAgent:", explain.topAgent);
    console.log("\nbreakdown:", JSON.stringify(explain.breakdown, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
