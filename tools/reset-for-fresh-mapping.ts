import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function resetForFreshMapping() {
  console.log(`🔄 Resetting org ${orgId} for fresh mapping test...\n`);

  // Delete all data that will be auto-created
  await prisma.routingProposal.deleteMany({ where: { orgId } });
  console.log("✅ Deleted all proposals");

  await prisma.leadFact.deleteMany({ where: { orgId } });
  console.log("✅ Deleted all lead facts");

  await prisma.routingState.deleteMany({ where: { orgId } });
  console.log("✅ Deleted routing state");

  await prisma.routingSettings.deleteMany({ where: { orgId } });
  console.log("✅ Deleted routing settings");

  await prisma.ruleSetVersion.deleteMany({ where: { orgId } });
  console.log("✅ Deleted all rules");

  // Keep mapping and schema - we want to trigger the "first mapping" flow
  // by saving it again in the UI

  await prisma.$disconnect();
  console.log("\n🎉 Reset complete! Now go to Field Mapping and save it again.");
  console.log("The system should automatically:");
  console.log("  1. Load 500 leads");
  console.log("  2. Create default Catch-All rule");
  console.log("  3. Enable routing state");
  console.log("  4. Set MANUAL_APPROVAL mode");
  console.log("  5. Create proposals automatically!");
}

resetForFreshMapping();
