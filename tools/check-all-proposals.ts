import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();

async function checkAllProposals() {
  console.log("=== Checking ALL Proposals ===\n");

  const proposals = await prisma.routingProposal.findMany({
    select: {
      id: true,
      orgId: true,
      itemName: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`Total proposals: ${proposals.length}\n`);
  
  proposals.forEach(p => {
    console.log(`- ${p.itemName || p.id.substring(0, 8)} (org: ${p.orgId.substring(0, 10)}..., status: ${p.status}, created: ${p.createdAt.toISOString()})`);
  });

  await prisma.$disconnect();
}

checkAllProposals();
