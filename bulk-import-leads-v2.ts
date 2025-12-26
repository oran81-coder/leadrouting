import { getPrisma } from "./packages/core/src/db/prisma";
import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";
import { logger } from "./packages/core/src/shared/logger";

const ORG_ID = "org_1";
const API_BASE = "http://localhost:3000";
const API_KEY = "dev_key_123";

async function bulkImportLeads() {
  const prisma = getPrisma();

  try {
    console.log('\n📥 Bulk Importing Leads from Monday.com\n');
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

    // 3. Fetch all items
    console.log(`\n📊 Fetching items from board...`);
    const query = `
      query {
        boards(ids: [${boardId}]) {
          items_page(limit: 100) {
            items {
              id
              name
              created_at
              column_values {
                id
                text
                type
                value
              }
            }
          }
        }
      }
    `;

    const result = await mondayClient.query(query);
    const items = result.data?.boards?.[0]?.items_page?.items || [];
    console.log(`✅ Found ${items.length} items`);

    if (items.length === 0) {
      console.log('\n⚠️  No items in board.');
      process.exit(0);
    }

    // 4. Process each item via routing API
    console.log(`\n🔄 Processing items...`);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        // Check if already exists
        const existing = await prisma.routingProposal.findFirst({
          where: {
            orgId: ORG_ID,
            boardId: boardId,
            itemId: item.id,
          },
        });

        if (existing) {
          console.log(`   ⏭️  ${item.id} (${item.name}) - already exists`);
          skipCount++;
          continue;
        }

        console.log(`   🔄 ${item.id} (${item.name})...`);

        // Call routing execute API
        const response = await fetch(`${API_BASE}/routing/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify({
            item: {
              id: item.id,
              boardId: boardId,
              name: item.name,
              created_at: item.created_at,
              column_values: item.column_values,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(`API error: ${response.status} - ${error.error || 'Unknown'}`);
        }

        const data = await response.json();
        console.log(`   ✅ Proposal created: ${data.proposalId || 'OK'}`);
        successCount++;

      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 SUMMARY:\n');
    console.log(`   Total Items: ${items.length}`);
    console.log(`   ✅ Successfully Imported: ${successCount}`);
    console.log(`   ⏭️  Skipped (exist): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n✨ Import complete!\n');
    console.log('👉 Refresh Manager Screen to see all proposals!\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    logger.error("Bulk import failed", { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bulkImportLeads();

