/**
 * Seed Monday.com Token for Testing
 * 
 * Creates a demo Monday.com token for org_1
 */

import { getPrisma } from "../packages/core/src/db/prisma";
import { seal } from "../packages/core/src/crypto/seal";

const prisma = getPrisma();

async function main() {
  console.log("🌱 Seeding Monday.com token for org_1...\n");

  // Use a dummy token for testing
  const dummyToken = "monday_demo_token_123456789";
  const encryptedToken = seal(dummyToken);

  // Create or update Monday credential for org_1
  const credential = await prisma.mondayCredential.upsert({
    where: { orgId: "org_1" },
    create: {
      orgId: "org_1",
      tokenEnc: encryptedToken,
      endpoint: "https://api.monday.com/v2",
    },
    update: {
      tokenEnc: encryptedToken,
      endpoint: "https://api.monday.com/v2",
    },
  });

  console.log(`✅ Monday.com credential created for org_1`);
  console.log(`   Token: ${dummyToken}`);
  console.log(`\n🎉 Monday.com token seeded successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding token:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

