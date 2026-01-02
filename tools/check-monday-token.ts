import prismaModule from "../packages/core/src/db/prisma.js";
import cryptoModule from "../packages/core/src/crypto/seal.js";

const { getPrisma } = prismaModule as any;
const { openSealed } = cryptoModule as any;

const prisma = getPrisma();

async function main() {
  console.log("🔍 Checking Monday.com token for org_1...\n");

  const cred = await prisma.mondayCredential.findUnique({
    where: { orgId: "org_1" }
  });

  if (!cred) {
    console.log("❌ No Monday credential found for org_1");
    return;
  }

  console.log("✅ Credential found!");
  console.log("   Endpoint:", cred.endpoint);
  console.log("   Token (encrypted):", cred.tokenEnc.substring(0, 50) + "...");
  
  try {
    const decrypted = openSealed(cred.tokenEnc);
    console.log("\n📋 Token (decrypted):");
    console.log("   Length:", decrypted.length);
    console.log("   First 20 chars:", decrypted.substring(0, 20) + "...");
    console.log("   Last 10 chars:", "..." + decrypted.substring(decrypted.length - 10));
    
    // Check if it looks like a valid Monday token (should start with "eyJ")
    if (decrypted.startsWith("eyJ")) {
      console.log("   ✓ Token appears to be in JWT format (starts with eyJ)");
    } else if (decrypted.includes("demo") || decrypted.includes("mock") || decrypted.includes("test")) {
      console.log("   ⚠️  WARNING: This looks like a MOCK/TEST token!");
    } else {
      console.log("   ⚠️  Token format doesn't match expected Monday.com token format");
    }
    
  } catch (err: any) {
    console.error("\n❌ Failed to decrypt token:", err.message);
  }
  
  console.log("\n📝 To fix:");
  console.log("   1. Get real token from Monday.com (Developer Center → API Token → Show)");
  console.log("   2. Go to Admin page in the app");
  console.log("   3. Paste token and click Connect");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

