import { PrismaClient } from "@prisma/client";

async function checkOrganization() {
  const prisma = new PrismaClient();
  
  console.log("\n=== Organizations in database ===");
  const orgs = await prisma.organization.findMany();
  console.log(JSON.stringify(orgs, null, 2));
  
  console.log("\n=== Looking for organization with ID: cmjq2ces90000rbcw8s5iqlcz ===");
  const targetOrg = await prisma.organization.findUnique({
    where: { id: "cmjq2ces90000rbcw8s5iqlcz" }
  });
  
  if (targetOrg) {
    console.log("✅ Organization found:", JSON.stringify(targetOrg, null, 2));
  } else {
    console.log("❌ Organization NOT found. Need to create it.");
    
    // Create the organization
    const newOrg = await prisma.organization.create({
      data: {
        id: "cmjq2ces90000rbcw8s5iqlcz",
        name: "oran81-org",
        displayName: "Oran's Organization",
        email: "oran81@gmail.com",
        isActive: true,
        tier: "standard",
        createdBy: "system"
      }
    });
    console.log("✅ Organization created:", JSON.stringify(newOrg, null, 2));
  }
  
  await prisma.$disconnect();
}

checkOrganization().catch(console.error);

