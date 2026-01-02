import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const ORG_ID = process.env.DEFAULT_ORG_ID || "cmjq2ces90000rbcw8s5iqlcz";

  console.log("\n=== Checking Schema ===");
  const schemaVersion = await prisma.internalSchemaVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });
  
  if (!schemaVersion) {
    console.log("❌ NO SCHEMA FOUND");
  } else {
    console.log("✅ Schema found, version:", schemaVersion.version);
    const payload = JSON.parse(String(schemaVersion.payload));
    console.log("\nLead entity fields:");
    const leadFields = payload.entities?.lead?.fields || {};
    for (const [fieldId, field] of Object.entries(leadFields)) {
      console.log(`  - ${fieldId}: type=${(field as any).type}, required=${(field as any).required}`);
    }
  }

  console.log("\n=== Checking Mapping ===");
  const mappingVersion = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });
  
  if (!mappingVersion) {
    console.log("❌ NO MAPPING FOUND");
  } else {
    console.log("✅ Mapping found, version:", mappingVersion.version);
    const payload = JSON.parse(String(mappingVersion.payload));
    console.log("\nMappings:");
    const mappings = payload.mappings || {};
    for (const [fieldId, mapping] of Object.entries(mappings)) {
      console.log(`  - ${fieldId} -> columnId: ${(mapping as any).columnId}`);
    }
  }

  console.log("\n=== Checking RoutingState ===");
  const routingState = await prisma.routingState.findUnique({
    where: { orgId: ORG_ID },
  });
  
  if (!routingState) {
    console.log("❌ NO ROUTING STATE FOUND");
  } else {
    console.log("✅ Routing state found:");
    console.log(`  - isEnabled: ${routingState.isEnabled}`);
    console.log(`  - schemaVersion: ${routingState.schemaVersion}`);
    console.log(`  - mappingVersion: ${routingState.mappingVersion}`);
    console.log(`  - rulesVersion: ${routingState.rulesVersion}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

