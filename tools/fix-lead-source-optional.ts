import { PrismaClient } from "@prisma/client";

async function fixLeadSourceOptional() {
  const prisma = new PrismaClient();
  
  const orgId = "cmjq2ces90000rbcw8s5iqlcz";
  
  // Get latest schema
  const schema = await prisma.internalSchemaVersion.findFirst({
    where: { orgId },
    orderBy: { version: "desc" }
  });
  
  if (!schema) {
    console.log("❌ No schema found");
    await prisma.$disconnect();
    return;
  }
  
  const schemaObj = JSON.parse(schema.payload);
  
  // Find lead_source field and make it optional
  const leadSourceField = schemaObj.fields.find((f: any) => f.id === "lead_source");
  
  if (!leadSourceField) {
    console.log("❌ lead_source field not found");
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Current lead_source: required=${leadSourceField.required}`);
  
  if (!leadSourceField.required) {
    console.log("✅ lead_source is already optional");
    await prisma.$disconnect();
    return;
  }
  
  // Make it optional
  leadSourceField.required = false;
  
  // Create new version
  const newVersion = schema.version + 1;
  
  await prisma.internalSchemaVersion.create({
    data: {
      orgId,
      version: newVersion,
      payload: JSON.stringify(schemaObj),
      createdBy: "system-fix"
    }
  });
  
  console.log(`✅ Created schema version ${newVersion} with lead_source as optional`);
  
  await prisma.$disconnect();
}

fixLeadSourceOptional().catch(console.error);

