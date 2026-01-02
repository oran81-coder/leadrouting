import prismaModule from "../packages/core/src/db/prisma.js";
const { getPrisma } = prismaModule as any;

async function main() {
  const prisma = getPrisma();
  const orgId = "cmjq2ces90000rbcw8s5iqlcz";
  
  console.log(`🗑️  Deleting corrupted mapping records for orgId: ${orgId}...\n`);
  
  // Delete field mapping config versions
  const deletedMappings = await prisma.fieldMappingConfigVersion.deleteMany({ 
    where: { orgId } 
  });
  console.log(`✅ Deleted ${deletedMappings.count} FieldMappingConfigVersion records`);
  
  // Delete internal schema versions
  const deletedSchemas = await prisma.internalSchemaVersion.deleteMany({ 
    where: { orgId } 
  });
  console.log(`✅ Deleted ${deletedSchemas.count} InternalSchemaVersion records`);
  
  console.log("\n🎉 Successfully cleaned corrupted mappings from database!");
  console.log("   User can now create a fresh mapping configuration.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error deleting mapping records:", e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });

