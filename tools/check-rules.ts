import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function checkRules() {
  console.log(`Checking rules for org ${orgId}...\n`);

  const rules = await prisma.ruleSetVersion.findMany({
    where: { orgId },
    orderBy: { version: 'desc' },
  });

  console.log(`Found ${rules.length} rule versions`);

  if (rules.length === 0) {
    console.log("\n❌ No rules found!");
    console.log("\nTo use Scoring Engine without rules, you can either:");
    console.log("1. Create a default \"Catch-All\" rule via Admin page");
    console.log("2. Modify routing.routes.ts to always use scoring engine even when no rules");
  } else {
    rules.forEach(r => {
      console.log(`  - Version ${r.version}: created ${r.createdAt.toISOString()}`);
    });
  }

  await prisma.$disconnect();
}

checkRules();
