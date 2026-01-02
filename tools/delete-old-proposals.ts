import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orgId = "cmjt563ps000037hg6i4dvl7m";

  console.log("\n🗑️  Deleting old proposals with empty explainability...\n");
  
  const result = await prisma.routingProposal.deleteMany({
    where: { orgId },
  });

  console.log(`✅ Deleted ${result.count} proposals`);
  console.log(`\nThe Poller will create new proposals with full explainability on next tick (every 20 seconds)\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
