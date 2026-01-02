import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function checkRoutingState() {
  console.log(`Checking routing state for org ${orgId}...\n`);

  const routingState = await prisma.routingState.findUnique({
    where: { orgId },
  });

  if (!routingState) {
    console.log("❌ No routing state found!");
    console.log("\nTo enable routing, you need to go to Admin page and activate routing.");
    return;
  }

  console.log("✅ Routing State found:");
  console.log(`  isEnabled: ${routingState.isEnabled}`);
  console.log(`  schemaVersion: ${routingState.schemaVersion}`);
  console.log(`  mappingVersion: ${routingState.mappingVersion}`);
  console.log(`  rulesVersion: ${routingState.rulesVersion}`);
  console.log(`  enabledAt: ${routingState.enabledAt}`);

  const settings = await prisma.settings.findUnique({
    where: { orgId },
  });

  if (settings) {
    console.log(`\n✅ Settings found:`);
    console.log(`  mode: ${settings.mode}`);
  } else {
    console.log(`\n❌ No settings found`);
  }

  await prisma.$disconnect();
}

checkRoutingState();
