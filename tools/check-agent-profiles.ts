import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orgId = "cmjt563ps000037hg6i4dvl7m";

  console.log("\n=== Agent Profiles ===\n");
  
  const profiles = await prisma.agentProfile.findMany({
    where: { orgId },
  });

  console.log(`Found ${profiles.length} agent profiles:`);
  for (const p of profiles) {
    console.log(`  - ${p.agentUserId}: ${p.agentName || 'Unknown'}`);
    console.log(`     Industry: ${p.industryMatch || 'N/A'}`);
    console.log(`     Response Time: ${p.avgResponseTimeHours || 'N/A'}`);
  }

  console.log("\n=== Agent Metrics Snapshots ===\n");
  
  const metrics = await prisma.agentMetricsSnapshot.findMany({
    where: { orgId },
    orderBy: { computedAt: "desc" },
    take: 5,
  });

  console.log(`Found ${metrics.length} recent metric snapshots`);
  for (const m of metrics) {
    console.log(`  - ${m.agentUserId}: ${m.windowDays} days, conversion: ${m.conversionRate}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
