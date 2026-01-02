import { PrismaClient } from "@prisma/client";
import { normalizeEntityRecord } from "../packages/core/src/schema/normalization";
import { createMondayClientForOrg } from "../packages/modules/monday-integration/src/application/monday.orgClient";

async function main() {
  const prisma = new PrismaClient();
  const ORG_ID = process.env.DEFAULT_ORG_ID || "cmjq2ces90000rbcw8s5iqlcz";

  // Get schema
  const schemaVersion = await prisma.internalSchemaVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });
  
  if (!schemaVersion) {
    console.log("❌ NO SCHEMA FOUND");
    await prisma.$disconnect();
    return;
  }

  const schema = JSON.parse(String(schemaVersion.payload));
  console.log("✅ Schema loaded, version:", schema.version);

  // Get mapping
  const mappingVersion = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });
  
  if (!mappingVersion) {
    console.log("❌ NO MAPPING FOUND");
    await prisma.$disconnect();
    return;
  }

  const mapping = JSON.parse(String(mappingVersion.payload));
  console.log("✅ Mapping loaded, version:", mapping.version);

  // Get a sample item from Monday
  console.log("\n=== Fetching sample item from Monday ===");
  const client = await createMondayClientForOrg(ORG_ID);
  
  const metricsCfg = await prisma.metricsConfig.findUnique({
    where: { orgId: ORG_ID },
  });
  
  const leadBoardIds = String(metricsCfg?.leadBoardIds ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (leadBoardIds.length === 0) {
    console.log("❌ No lead board IDs configured");
    await prisma.$disconnect();
    return;
  }

  console.log("Board IDs:", leadBoardIds);

  const samples = await (client as any).fetchBoardSamples([leadBoardIds[0]], 1);
  const firstItem = samples?.[0]?.items?.[0];

  if (!firstItem) {
    console.log("❌ No items found in board");
    await prisma.$disconnect();
    return;
  }

  console.log("\n=== Sample item ===");
  console.log("ID:", firstItem.id);
  console.log("Name:", firstItem.name);
  console.log("Column values:");
  for (const cv of firstItem.column_values || []) {
    console.log(`  ${cv.id}: ${cv.text} (type: ${cv.type})`);
  }

  // Map Monday item to internal raw
  console.log("\n=== Mapping Monday item to internal format ===");
  const byId = new Map<string, any>();
  for (const cv of firstItem.column_values ?? []) byId.set(cv.id, cv);

  const raw: Record<string, any> = {};
  for (const [fieldId, ref] of Object.entries(mapping.mappings ?? {})) {
    const cv = byId.get((ref as any).columnId);
    if (!cv) {
      console.log(`  ${fieldId}: NOT FOUND (columnId: ${(ref as any).columnId})`);
      continue;
    }
    if (cv.type === 'status' || cv.type === 'dropdown') {
      try {
        raw[fieldId] = cv.value ? JSON.parse(cv.value) : null;
        console.log(`  ${fieldId}: ${JSON.stringify(raw[fieldId])} (from status/dropdown)`);
      } catch {
        raw[fieldId] = cv.text ?? null;
        console.log(`  ${fieldId}: ${raw[fieldId]} (from text fallback)`);
      }
    } else {
      raw[fieldId] = cv.text ?? null;
      console.log(`  ${fieldId}: ${raw[fieldId]} (from text)`);
    }
  }

  // Test normalization
  console.log("\n=== Testing normalization ===");
  const norm = normalizeEntityRecord(schema, "lead", raw);
  
  console.log("\n✅ Normalized values:");
  console.log(JSON.stringify(norm.values, null, 2));
  
  if (norm.errors.length > 0) {
    console.log("\n❌ Normalization errors:");
    for (const err of norm.errors) {
      console.log(`  - ${err.fieldId} (${err.expectedType}): ${err.reason}`);
      console.log(`    Raw value:`, err.rawValue);
    }
  } else {
    console.log("\n✅ No normalization errors!");
  }

  await prisma.$disconnect();
}

main().catch(console.error);

