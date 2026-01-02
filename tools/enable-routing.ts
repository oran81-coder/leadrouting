import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function enableRouting() {
  console.log(`Enabling routing for org ${orgId}...\n`);

  // Get latest schema and mapping versions
  const latestSchema = await prisma.internalSchemaVersion.findFirst({
    where: { orgId },
    orderBy: { version: 'desc' },
  });

  const latestMapping = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId },
    orderBy: { version: 'desc' },
  });

  if (!latestSchema || !latestMapping) {
    console.error("❌ Missing schema or mapping. Cannot enable routing.");
    return;
  }

  console.log(`Found schema version: ${latestSchema.version}`);
  console.log(`Found mapping version: ${latestMapping.version}`);

  // Create or update RoutingState
  const routingState = await prisma.routingState.upsert({
    where: { orgId },
    create: {
      orgId,
      isEnabled: true,
      enabledAt: new Date(),
      enabledBy: "system",
      schemaVersion: latestSchema.version,
      mappingVersion: latestMapping.version,
      rulesVersion: null, // No rules yet
    },
    update: {
      isEnabled: true,
      enabledAt: new Date(),
      enabledBy: "system",
      schemaVersion: latestSchema.version,
      mappingVersion: latestMapping.version,
      rulesVersion: null,
    },
  });

  console.log("\n✅ Routing State enabled!");
  console.log(`  isEnabled: ${routingState.isEnabled}`);
  console.log(`  schemaVersion: ${routingState.schemaVersion}`);
  console.log(`  mappingVersion: ${routingState.mappingVersion}`);

  // Create or update RoutingSettings to MANUAL_APPROVAL mode
  const settings = await prisma.routingSettings.upsert({
    where: { orgId },
    create: {
      orgId,
      mode: "MANUAL_APPROVAL",
    },
    update: {
      mode: "MANUAL_APPROVAL",
    },
  });

  console.log(`\n✅ RoutingSettings configured!`);
  console.log(`  mode: ${settings.mode}`);

  await prisma.$disconnect();
  console.log("\n🎉 Done! Routing is now enabled in MANUAL_APPROVAL mode.");
}

enableRouting();
