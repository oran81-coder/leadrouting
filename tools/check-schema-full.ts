import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const ORG_ID = process.env.DEFAULT_ORG_ID || "cmjq2ces90000rbcw8s5iqlcz";

  console.log("\n=== Full Schema Payload ===");
  const schemaVersion = await prisma.internalSchemaVersion.findFirst({
    where: { orgId: ORG_ID },
    orderBy: { version: "desc" },
  });
  
  if (!schemaVersion) {
    console.log("❌ NO SCHEMA FOUND");
  } else {
    console.log("✅ Schema found, version:", schemaVersion.version);
    const payload = JSON.parse(String(schemaVersion.payload));
    console.log("\nFull payload:");
    console.log(JSON.stringify(payload, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);

