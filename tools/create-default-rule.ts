import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function createDefaultRule() {
  console.log(`Creating default catch-all rule for org ${orgId}...\n`);

  // Create a simple "Catch-All" rule that routes to scoring engine
  const ruleset = {
    rules: [
      {
        id: "default-catch-all",
        name: "Default - Route All Leads",
        conditions: [],  // No conditions = catches all
        action: {
          type: "route_to_scoring_engine",  // Let scoring engine decide
          value: null,
        },
      },
    ],
  };

  const ruleSetVersion = await prisma.ruleSetVersion.create({
    data: {
      orgId,
      version: 1,
      payload: JSON.stringify(ruleset),
      createdBy: "system",
    },
  });

  console.log(`✅ Created RuleSetVersion:`);
  console.log(`  Version: ${ruleSetVersion.version}`);
  console.log(`  ID: ${ruleSetVersion.id}`);

  // Update RoutingState to include rulesVersion
  await prisma.routingState.update({
    where: { orgId },
    data: {
      rulesVersion: 1,
    },
  });

  console.log(`\n✅ Updated RoutingState with rulesVersion: 1`);

  await prisma.$disconnect();
  console.log("\n🎉 Done! Routing is now fully configured.");
}

createDefaultRule();
