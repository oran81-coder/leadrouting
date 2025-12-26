import { getPrisma } from "./packages/core/src/db/prisma";

const prisma = getPrisma();

async function main() {
  const mapping = await prisma.fieldMappingConfigVersion.findFirst({
    where: { orgId: "org_1" },
    orderBy: { version: "desc" },
  });

  if (!mapping) {
    console.log("❌ No mapping found");
    return;
  }

  const config = JSON.parse(mapping.payload);
  console.log("📋 Current Mapping Config:");
  console.log("  Primary Board ID:", config.primaryBoardId || "(missing)");
  console.log("  Primary Board Name:", config.primaryBoardName || "(missing)");
  console.log("  Fields mapped:", Object.keys(config.fields || {}).length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


