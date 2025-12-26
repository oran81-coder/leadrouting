import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";
import { logger } from "./packages/core/src/shared/logger";

const ORG_ID = "org_1";
const ITEM_IDS = ["10854426888", "10851881045"];

async function checkMondayItemDates() {
  try {
    logger.info("🔍 Checking Monday.com item dates");
    logger.info("============================================================");

    const client = await createMondayClientForOrg(ORG_ID);

    const query = `
      query GetItems($itemIds: [ID!]) {
        items(ids: $itemIds) {
          id
          name
          created_at
          updated_at
          column_values {
            id
            title
            text
            value
          }
        }
      }
    `;

    const result = await client.query(query, { itemIds: ITEM_IDS });
    const items = result.data?.items || [];

    logger.info(`\n✅ Found ${items.length} items:\n`);

    for (const item of items) {
      logger.info(`  📋 Item ID: ${item.id}`);
      logger.info(`     Name: ${item.name}`);
      logger.info(`     Created At: ${item.created_at}`);
      logger.info(`     Updated At: ${item.updated_at}`);
      
      // Calculate days from creation to now
      if (item.created_at) {
        const created = new Date(item.created_at);
        const now = new Date();
        const days = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        logger.info(`     Age: ${days.toFixed(2)} days old`);
      }
      
      logger.info("");
    }

  } catch (error: any) {
    logger.error(`❌ Error: ${error.message}`, { error });
    process.exit(1);
  }
}

checkMondayItemDates();

