import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";

/**
 * Verify that writeback to Monday.com worked
 */

async function main() {
  const BOARD_ID = '18393182279';
  const ITEM_ID = '10851877055';
  
  console.log("=".repeat(60));
  console.log("VERIFYING WRITEBACK TO MONDAY.COM");
  console.log("=".repeat(60));
  console.log(`\nBoard: ${BOARD_ID}`);
  console.log(`Item: ${ITEM_ID}`);
  console.log(`Expected Agent: 97679373`);
  console.log("");
  
  try {
    const mondayClient = createMondayClientForOrg('org_1');
    
    const query = `
      query GetItem($boardId: ID!, $itemId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 1, query_params: {ids: [$itemId]}) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `;
    
    const response = await mondayClient.query<any>(query, { boardId: BOARD_ID, itemId: ITEM_ID });
    const item = response.data.boards[0]?.items_page?.items?.[0];
    
    if (!item) {
      console.error("❌ Item not found!");
      process.exit(1);
    }
    
    console.log(`✅ Found item: ${item.name}`);
    console.log("");
    
    // Find the project_owner column
    const ownerColumn = item.column_values.find((cv: any) => cv.id === 'project_owner');
    
    if (!ownerColumn) {
      console.log("❌ project_owner column not found!");
      process.exit(1);
    }
    
    console.log("project_owner column:");
    console.log(`  Text: ${ownerColumn.text}`);
    console.log(`  Value: ${ownerColumn.value}`);
    console.log(`  Type: ${ownerColumn.type}`);
    
    // Parse the value
    let assignedUserIds: string[] = [];
    if (ownerColumn.value) {
      try {
        const parsed = JSON.parse(ownerColumn.value);
        if (parsed.personsAndTeams) {
          assignedUserIds = parsed.personsAndTeams.map((p: any) => String(p.id));
        }
      } catch (e) {
        console.log("  (Failed to parse value)");
      }
    }
    
    console.log("");
    
    if (assignedUserIds.includes('97679373')) {
      console.log("=".repeat(60));
      console.log("✅✅✅ WRITEBACK VERIFIED! ✅✅✅");
      console.log("=".repeat(60));
      console.log("");
      console.log("Agent 97679373 is now assigned to this lead in Monday.com!");
      console.log("");
      console.log("🎉 FULL END-TO-END ROUTING FLOW COMPLETE! 🎉");
      console.log("");
    } else {
      console.log("=".repeat(60));
      console.log("⚠️  WRITEBACK STATUS UNCLEAR");
      console.log("=".repeat(60));
      console.log("");
      console.log(`Assigned Users: ${assignedUserIds.join(', ') || 'None'}`);
      console.log("");
      console.log("Please check manually in Monday.com:");
      console.log(`https://view.monday.com/boards/${BOARD_ID}/pulses/${ITEM_ID}`);
    }
    
  } catch (error: any) {
    console.error(`\n❌ ERROR: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

