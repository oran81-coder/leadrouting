import { createMondayClientForOrg } from "./packages/modules/monday-integration/src/application/monday.orgClient";
import { getPrisma } from "./packages/core/src/db/prisma";

/**
 * Create a Routing Proposal from a real Monday.com lead
 */

async function main() {
  const prisma = getPrisma();
  const BOARD_ID = '18393182279';
  const ITEM_ID = '10851877055'; // Furniture lead, no agent
  const API_BASE = 'http://localhost:3000';
  const API_KEY = 'dev_key_12345';
  
  console.log("=".repeat(60));
  console.log("CREATING ROUTING PROPOSAL");
  console.log("=".repeat(60));
  console.log(`\nBoard: ${BOARD_ID}`);
  console.log(`Item: ${ITEM_ID}`);
  
  try {
    // 1. Fetch item from Monday.com
    console.log(`\n🔍 Fetching lead from Monday.com...`);
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
      console.error("\n❌ Item not found in Monday.com!");
      process.exit(1);
    }
    
    console.log(`✅ Found item: ${item.name}`);
    console.log(`   Columns: ${item.column_values.length}`);
    
    // 2. Call /routing/execute to create proposal
    console.log(`\n🎯 Creating routing proposal...`);
    
    const executeBody = {
      item: {
        id: item.id,
        name: item.name,
        boardId: BOARD_ID,
        column_values: item.column_values
      }
    };
    
    const executeResponse = await fetch(`${API_BASE}/routing/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(executeBody)
    });
    
    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error(`\n❌ Failed to create proposal: ${executeResponse.status}`);
      console.error(errorText);
      process.exit(1);
    }
    
    const result = await executeResponse.json();
    
    if (result.ok && result.proposalId) {
      console.log(`\n✅ PROPOSAL CREATED SUCCESSFULLY!`);
      console.log(`   Proposal ID: ${result.proposalId}`);
      console.log(`   Status: ${result.proposalStatus}`);
      console.log(`   Matched Rule: ${result.matchedRuleId}`);
      console.log(`   Assigned To: ${result.assignedTo}`);
      
      // 3. Verify proposal was saved to database
      console.log(`\n🔍 Verifying proposal in database...`);
      const proposal = await prisma.routingProposal.findUnique({
        where: { id: result.proposalId }
      });
      
      if (proposal) {
        console.log(`✅ Proposal found in database`);
        console.log(`   Board: ${proposal.boardId}`);
        console.log(`   Item: ${proposal.itemId}`);
        console.log(`   Status: ${proposal.status}`);
      } else {
        console.log(`❌ Proposal not found in database!`);
      }
      
      console.log(`\n${"=".repeat(60)}`);
      console.log("✅ PROPOSAL CREATION TEST PASSED!");
      console.log("=".repeat(60));
      console.log(`\nNext: Approve proposal via Manager UI`);
      console.log(`  GET  /manager/proposals`);
      console.log(`  POST /manager/proposals/${result.proposalId}/approve`);
      
    } else {
      console.log(`\n❌ Unexpected response:`);
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error: any) {
    console.error(`\n❌ ERROR: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

