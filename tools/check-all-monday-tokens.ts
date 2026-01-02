import prismaModule from "../packages/core/src/db/prisma.js";
import cryptoModule from "../packages/core/src/crypto/seal.js";

const { getPrisma } = prismaModule as any;
const { openSealed } = cryptoModule as any;

const prisma = getPrisma();

async function main() {
  console.log("🔍 Checking ALL Monday.com tokens in database...\n");

  const allCreds = await prisma.mondayCredential.findMany();

  if (allCreds.length === 0) {
    console.log("❌ No Monday credentials found in database");
    return;
  }

  console.log(`Found ${allCreds.length} credential(s):\n`);

  for (const cred of allCreds) {
    console.log(`📋 OrgId: ${cred.orgId}`);
    console.log(`   Endpoint: ${cred.endpoint}`);
    console.log(`   Token (encrypted): ${cred.tokenEnc.substring(0, 30)}...`);
    
    try {
      const decrypted = openSealed(cred.tokenEnc);
      console.log(`   Token (decrypted):`);
      console.log(`     Length: ${decrypted.length}`);
      console.log(`     First 20 chars: ${decrypted.substring(0, 20)}...`);
      
      if (decrypted.startsWith("eyJ")) {
        console.log(`     ✅ VALID JWT format (real Monday token)`);
      } else if (decrypted.includes("demo") || decrypted.includes("mock") || decrypted.includes("test")) {
        console.log(`     ❌ MOCK/TEST token - NOT VALID!`);
      } else {
        console.log(`     ⚠️  Unknown format`);
      }
    } catch (err: any) {
      console.error(`     ❌ Failed to decrypt:`, err.message);
    }
    
    console.log("");
  }

  console.log("\n🔧 To fix for a specific org:");
  console.log("   1. Find your real orgId from the JWT token in browser console");
  console.log("   2. Go to Admin page while logged in as that user");
  console.log("   3. Paste REAL Monday.com token and click Connect");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

