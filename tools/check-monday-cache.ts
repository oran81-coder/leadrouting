import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  const orgId = "cmjt563ps000037hg6i4dvl7m";

  console.log("\n=== Monday User Cache ===");
  const cache = await prisma.mondayUserCache.findMany({
    where: { orgId },
  });

  console.log(`Found ${cache.length} cached users:`);
  for (const c of cache) {
    console.log(`  - ${c.userId}: ${c.name}`);
  }

  console.log("\n=== Agents with metrics ===");
  const agents = await prisma.agentMetricsSnapshot.findMany({
    where: { orgId },
    select: { agentUserId: true },
    distinct: ["agentUserId"],
  });

  console.log(`Found ${agents.length} agents with metrics:`);
  for (const a of agents) {
    console.log(`  - ${a.agentUserId}`);
  }

  console.log("\n=== LeadFacts assigned users ===");
  const leadFacts = await prisma.leadFact.findMany({
    where: { 
      orgId,
      assignedUserId: { not: null }
    },
    select: { assignedUserId: true },
    distinct: ["assignedUserId"],
  });

  console.log(`Found ${leadFacts.length} unique assigned users in LeadFacts:`);
  for (const lf of leadFacts) {
    console.log(`  - ${lf.assignedUserId}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
