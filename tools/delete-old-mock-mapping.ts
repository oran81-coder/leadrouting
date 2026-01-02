import prismaModule from "../packages/core/src/db/prisma.js";
const { getPrisma } = prismaModule as any;
const prisma = getPrisma();

async function main() {
  console.log("🗑️ Deleting old mock mapping for org_1...\n");

  const deleted = await prisma.fieldMappingConfigVersion.deleteMany({
    where: { orgId: "org_1" }
  });

  console.log(`✅ Deleted ${deleted.count} old mapping config(s)`);

  const deletedSchema = await prisma.internalSchemaVersion.deleteMany({
    where: { orgId: "org_1" }
  });

  console.log(`✅ Deleted ${deletedSchema.count} old schema(s)`);

  console.log("\n🎉 Now you can start fresh with your REAL Monday.com boards!");
  console.log("   Just refresh the Field Mapping page and select your 'leads' board.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

