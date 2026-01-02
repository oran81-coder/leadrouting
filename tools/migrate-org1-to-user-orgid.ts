import { getPrisma } from "../packages/core/src/db/prisma";

async function main() {
  const prisma = getPrisma();
  
  const targetOrgId = "cmjq2ces90000rbcw8s5iqlcz"; // oran81@gmail.com orgId
  
  console.log(`\n🔄 Cleaning up duplicate org_1 data...\n`);
  
  // Delete all org_1 data (user already has data under their own orgId)
  
  // 1. Delete MondayUserCache
  const users = await prisma.mondayUserCache.deleteMany({
    where: { orgId: "org_1" },
  });
  console.log(`✅ Deleted ${users.count} org_1 MondayUserCache records`);
  
  // 2. Delete LeadFact
  const leads = await prisma.leadFact.deleteMany({
    where: { orgId: "org_1" },
  });
  console.log(`✅ Deleted ${leads.count} org_1 LeadFact records`);
  
  // 3. Delete AgentMetricsSnapshot
  const metrics = await prisma.agentMetricsSnapshot.deleteMany({
    where: { orgId: "org_1" },
  });
  console.log(`✅ Deleted ${metrics.count} org_1 AgentMetricsSnapshot records`);
  
  // 4. Delete RoutingProposal
  const proposals = await prisma.routingProposal.deleteMany({
    where: { orgId: "org_1" },
  });
  console.log(`✅ Deleted ${proposals.count} org_1 RoutingProposal records`);
  
  // 5. Delete MetricsConfig
  const metricsConfig = await prisma.metricsConfig.deleteMany({
    where: { orgId: "org_1" },
  });
  console.log(`✅ Deleted ${metricsConfig.count} org_1 MetricsConfig records`);
  
  console.log(`\n✅ Migration complete!\n`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

