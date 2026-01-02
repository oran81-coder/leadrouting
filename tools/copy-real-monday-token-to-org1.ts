import prismaModule from "../packages/core/src/db/prisma.js";
const { getPrisma } = prismaModule as any;
const prisma = getPrisma();

async function main() {
  console.log("🔄 Copying real Monday token from oran81's org to org_1...\n");

  // Get the real token from oran81's org
  const realCred = await prisma.mondayCredential.findUnique({
    where: { orgId: "cmjq2ces90000rbcw8s5iqlcz" }
  });

  if (!realCred) {
    console.log("❌ Real token not found for oran81's org");
    return;
  }

  console.log("✅ Found real token!");
  console.log(`   Token (encrypted): ${realCred.tokenEnc.substring(0, 30)}...`);
  console.log(`   Endpoint: ${realCred.endpoint}\n`);

  // Update org_1 with the real token
  await prisma.mondayCredential.upsert({
    where: { orgId: "org_1" },
    update: {
      tokenEnc: realCred.tokenEnc,
      endpoint: realCred.endpoint,
    },
    create: {
      orgId: "org_1",
      tokenEnc: realCred.tokenEnc,
      endpoint: realCred.endpoint,
    },
  });

  console.log("✅ Updated org_1 with real Monday token!");
  console.log("\n🎉 Now you can log in as admin@org1.com (password: password123)");
  console.log("   and use your REAL Monday.com boards!\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

