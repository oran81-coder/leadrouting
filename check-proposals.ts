import { getPrisma } from "./packages/core/src/db/prisma";

async function main() {
  const prisma = getPrisma();
  
  const proposals = await prisma.routingProposal.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log(`Found ${proposals.length} proposals:`);
  for (const p of proposals) {
    console.log(`- ID: ${p.id}, Status: ${p.status}, Created: ${p.createdAt}`);
    if (p.action) {
      const action = JSON.parse(p.action);
      console.log(`  Agent: ${action.agentName} (${action.value}), Score: ${action.score}`);
    }
  }
  
  await prisma.$disconnect();
}

main();

