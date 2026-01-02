import { getPrisma } from "../packages/core/src/db/prisma";
import { PrismaMetricsConfigRepo } from "../apps/api/src/infrastructure/metricsConfig.repo";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function syncMappingToMetrics() {
  console.log(`🔄 Syncing Field Mapping to MetricsConfig for org ${orgId}...\n`);

  // Get latest mapping
  const mapping = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId },
    orderBy: { version: 'desc' },
  });

  if (!mapping) {
    console.log("❌ No mapping found");
    return;
  }

  const payload = JSON.parse(mapping.payload);
  console.log(`✅ Found mapping version ${mapping.version}`);
  console.log(`Primary Board: ${payload.primaryBoardId}`);

  // Extract relevant fields
  const assignedPeopleCol = payload.mappings?.assigned_agent?.columnId || null;
  const closedWonCol = payload.mappings?.deal_won_status_column?.columnId || null;
  const closedWonValue = payload.mappings?.deal_won_status_column?.value || "Done"; // Default to "Done" if not specified
  const dealAmountCol = payload.mappings?.lead_deal_size?.columnId || null;
  const industryCol = payload.mappings?.lead_industry?.columnId || null;

  console.log(`\nExtracted from mapping:`);
  console.log(`  assignedPeopleCol: ${assignedPeopleCol}`);
  console.log(`  closedWonCol: ${closedWonCol}`);
  console.log(`  closedWonValue: ${closedWonValue}`);
  console.log(`  dealAmountCol: ${dealAmountCol}`);
  console.log(`  industryCol: ${industryCol}`);

  // Update MetricsConfig
  const metricsRepo = new PrismaMetricsConfigRepo();
  await metricsRepo.update(orgId, {
    leadBoardIds: payload.primaryBoardId,
    assignedPeopleColumnId: assignedPeopleCol,
    closedWonStatusColumnId: closedWonCol,
    closedWonStatusValue: closedWonValue,
    dealAmountColumnId: dealAmountCol,
    industryColumnId: industryCol,
  });

  console.log(`\n✅ MetricsConfig updated successfully!`);

  // Verify
  const updated = await prisma.metricsConfig.findUnique({
    where: { orgId },
  });

  console.log(`\n📊 Updated MetricsConfig:`);
  console.log(`  closedWonStatusColumnId: "${updated?.closedWonStatusColumnId}"`);
  console.log(`  closedWonStatusValue: "${updated?.closedWonStatusValue}"`);
  console.log(`  dealAmountColumnId: "${updated?.dealAmountColumnId}"`);
  console.log(`  industryColumnId: "${updated?.industryColumnId}"`);

  await prisma.$disconnect();
}

syncMappingToMetrics();
