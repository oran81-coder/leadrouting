// Simple script to check Manager proposals
async function main() {
  const response = await fetch("http://localhost:3000/manager/proposals", {
    method: "GET",
    headers: {
      "x-api-key": "dev_key_123",
    },
  });

  const data = await response.json();
  console.log("\n=== Manager Proposals ===");
  console.log(`Status: ${response.status}`);
  console.log(`OK: ${data.ok}`);
  console.log(`Total proposals: ${data.items?.length || 0}`);
  
  if (data.items && data.items.length > 0) {
    console.log("\n--- Proposals ---");
    for (const proposal of data.items) {
      console.log(`\n${proposal.itemName} (${proposal.itemId})`);
      console.log(`  Status: ${proposal.status}`);
      console.log(`  Agent: ${proposal.action?.label || 'N/A'}`);
      console.log(`  Created: ${proposal.createdAt}`);
    }
  } else {
    console.log("\n❌ No proposals found");
  }
}

main().catch(console.error);

