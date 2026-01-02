import prismaModule from "../packages/core/src/db/prisma.js";
import mondayClientFactoryModule from "../packages/modules/monday-integration/src/application/monday.clientFactory.js";
import cryptoModule from "../packages/core/src/crypto/seal.js";

const { getPrisma } = prismaModule as any;
const { createMondayClient } = mondayClientFactoryModule as any;
const { openSealed } = cryptoModule as any;
const prisma = getPrisma();

async function main() {
  console.log("🔍 Inspecting REAL Monday.com board for org_1...\n");

  // Get Monday credentials
  const cred = await prisma.mondayCredential.findUnique({
    where: { orgId: "org_1" }
  });

  if (!cred) {
    console.log("❌ No Monday credential found for org_1");
    return;
  }

  const token = openSealed(cred.tokenEnc);
  const client = createMondayClient({ token, endpoint: cred.endpoint });

  console.log("✅ Monday client created\n");
  console.log("📊 Fetching boards...\n");

  // Fetch boards
  const boards = await client.listBoards();
  console.log(`Found ${boards.length} board(s):\n`);

  for (const board of boards) {
    console.log(`📋 Board: ${board.name}`);
    console.log(`   ID: ${board.id}`);
    
    // Fetch columns for this board
    console.log(`   Fetching columns...`);
    const columns = await client.listBoardColumns(board.id);
    console.log(`   Found ${columns.length} column(s):\n`);
    
    for (const col of columns.slice(0, 15)) { // Show first 15 columns
      console.log(`     - ${col.title} (${col.id})`);
      console.log(`       Type: ${col.type}`);
      
      // If it's a status column, show labels
      if (col.type === "status" || col.type === "color") {
        try {
          const labels = await client.listStatusLabels(board.id, col.id);
          console.log(`       Labels: ${labels.map((l: any) => l.label).join(", ")}`);
        } catch (e: any) {
          console.log(`       (Could not fetch labels: ${e.message})`);
        }
      }
    }
    
    if (columns.length > 15) {
      console.log(`     ... and ${columns.length - 15} more columns`);
    }
    
    console.log("");
  }

  console.log("\n💡 Next steps:");
  console.log("   1. Choose the board you want to use");
  console.log("   2. Map your internal fields to the columns above");
  console.log("   3. Make sure to map 'deal_won_status_column' and 'deal_status'");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

