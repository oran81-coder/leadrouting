import { getPrisma } from "./packages/core/src/db/prisma";
import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";
import { logger } from "./packages/core/src/shared/logger";

const ORG_ID = "org_1";

async function updateExistingProposalsWithNames() {
  const prisma = getPrisma();

  try {
    console.log('\n🔄 Updating Existing Proposals with Item Names\n');
    console.log('=' .repeat(60));

    // 1. Get board ID from field mapping
    const mappingRecord = await prisma.fieldMappingConfigVersion.findFirst({
      where: { orgId: ORG_ID },
      orderBy: { version: "desc" },
    });

    if (!mappingRecord) {
      console.error('\n❌ No field mapping found.');
      process.exit(1);
    }

    const mapping = JSON.parse(mappingRecord.payload);
    const boardId = mapping.primaryBoardId;
    console.log(`✅ Primary Board ID: ${boardId}`);

    // 2. Create Monday client
    const mondayClient = await createMondayClientForOrg(ORG_ID);
    console.log(`✅ Monday.com client created`);

    // 3. Get all proposals that don't have itemName
    const proposalsWithoutNames = await prisma.routingProposal.findMany({
      where: {
        orgId: ORG_ID,
        boardId: boardId,
        OR: [
          { itemName: null },
          { itemName: "" }
        ]
      },
    });

    console.log(`\n📊 Found ${proposalsWithoutNames.length} proposals without names`);

    if (proposalsWithoutNames.length === 0) {
      console.log('\n✅ All proposals already have names!');
      process.exit(0);
    }

    // 4. Fetch all items from Monday in one query
    const itemIds = proposalsWithoutNames.map(p => p.itemId);
    console.log(`\n🔄 Fetching ${itemIds.length} items from Monday...`);

    const query = `
      query {
        items(ids: [${itemIds.join(',')}]) {
          id
          name
        }
      }
    `;

    const result = await mondayClient.query(query);
    const items = result.data?.items || [];
    console.log(`✅ Fetched ${items.length} items`);

    // Create a map of itemId -> name
    const itemNameMap = new Map();
    items.forEach((item: any) => {
      itemNameMap.set(item.id, item.name);
    });

    // 5. Update proposals with names
    console.log(`\n🔄 Updating proposals...`);
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const proposal of proposalsWithoutNames) {
      const itemName = itemNameMap.get(proposal.itemId);
      
      if (itemName) {
        await prisma.routingProposal.update({
          where: { id: proposal.id },
          data: { itemName }
        });
        console.log(`   ✅ ${proposal.itemId} → "${itemName}"`);
        updatedCount++;
      } else {
        console.log(`   ⚠️  ${proposal.itemId} - not found in Monday`);
        notFoundCount++;
      }
    }

    // 6. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:\n');
    console.log(`   Total Proposals: ${proposalsWithoutNames.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⚠️  Not Found: ${notFoundCount}`);
    console.log('\n✨ Update complete!\n');
    console.log('👉 Refresh Manager Screen to see updated names!\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    logger.error("Update failed", { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateExistingProposalsWithNames();

