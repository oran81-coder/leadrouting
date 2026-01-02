import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function checkMappingDetails() {
  console.log(`📋 Checking Field Mapping for org ${orgId}...\n`);

  const mapping = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId },
    orderBy: { version: 'desc' },
  });

  if (!mapping) {
    console.log("❌ No mapping found");
    return;
  }

  console.log(`✅ Mapping version: ${mapping.version}`);
  console.log(`Created at: ${mapping.createdAt}`);
  
  const payload = JSON.parse(mapping.payload);
  console.log(`\nPrimary Board: ${payload.primaryBoardId}`);
  console.log(`\nMappings:`);
  
  Object.entries(payload.mappings || {}).forEach(([field, config]: [string, any]) => {
    console.log(`  ${field}:`);
    console.log(`    columnId: ${config.columnId}`);
    if (config.value) {
      console.log(`    value: ${config.value}`);
    }
  });

  // Check MetricsConfig
  console.log(`\n📊 Checking MetricsConfig...`);
  const metricsConfig = await prisma.metricsConfig.findUnique({
    where: { orgId },
  });

  if (metricsConfig) {
    console.log(`  closedWonStatusColumnId: "${metricsConfig.closedWonStatusColumnId}"`);
    console.log(`  closedWonStatusValue: "${metricsConfig.closedWonStatusValue}"`);
  } else {
    console.log("  ❌ No MetricsConfig found");
  }

  await prisma.$disconnect();
}

checkMappingDetails();
