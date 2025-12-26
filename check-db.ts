import { getPrisma } from "./packages/core/src/db/prisma";

async function checkDB() {
  const prisma = getPrisma();
  
  const proposals = await prisma.routingProposal.findMany({
    where: { orgId: "org_1" },
    select: {
      id: true,
      itemId: true,
      itemName: true,
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  console.log('\nProposals in DB:');
  proposals.forEach(p => {
    console.log(`  ${p.itemId}: "${p.itemName}"`);
  });

  await prisma.$disconnect();
}

checkDB();

