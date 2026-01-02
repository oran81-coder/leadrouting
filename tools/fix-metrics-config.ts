import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();

async function fixMetricsConfig() {
  try {
    const orgId = "cmjt563ps000037hg6i4dvl7m"; // Your org
    const boardId = "18393182279"; // From the mapping

    console.log(`Updating MetricsConfig for org ${orgId}...`);
    
    const updated = await prisma.metricsConfig.update({
      where: { orgId },
      data: {
        leadBoardIds: boardId,
      },
    });

    console.log("✅ MetricsConfig updated successfully!");
    console.log(`  leadBoardIds: "${updated.leadBoardIds}"`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMetricsConfig();
