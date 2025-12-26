import { getPrisma } from "./packages/core/src/db/prisma";

async function main() {
  const prisma = getPrisma();

  try {
    const mapping = await prisma.fieldMappingConfigVersion.findFirst({
      where: { orgId: "org_1" },
      orderBy: { version: "desc" },
    });

    console.log("\n📋 Mapping Config:");
    console.log("Version:", mapping?.version);
    console.log("\nPayload:");
    if (mapping?.payload) {
      const config = JSON.parse(mapping.payload);
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log("No mapping found");
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

