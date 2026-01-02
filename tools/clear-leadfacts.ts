import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function clearLeadFacts() {
  console.log(`Clearing all LeadFacts for org ${orgId}...\n`);

  const result = await prisma.leadFact.deleteMany({
    where: { orgId },
  });

  console.log(`✅ Deleted ${result.count} LeadFacts`);

  await prisma.$disconnect();
}

clearLeadFacts();
