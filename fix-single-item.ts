import { getPrisma } from "./packages/core/src/db/prisma";
import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";

const ORG_ID = "org_1";
const ITEM_ID = "10855864067";

async function fixSingleItem() {
  const prisma = getPrisma();

  try {
    const mondayClient = await createMondayClientForOrg(ORG_ID);
    
    const query = `
      query {
        items(ids: [${ITEM_ID}]) {
          id
          name
        }
      }
    `;

    const result = await mondayClient.query(query);
    const item = result.data?.items?.[0];

    if (!item) {
      console.log(`❌ Item ${ITEM_ID} not found`);
      process.exit(1);
    }

    console.log(`Item: ${item.id} - "${item.name}"`);

    await prisma.routingProposal.updateMany({
      where: {
        orgId: ORG_ID,
        itemId: ITEM_ID
      },
      data: {
        itemName: item.name
      }
    });

    console.log(`✅ Updated!`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixSingleItem();

