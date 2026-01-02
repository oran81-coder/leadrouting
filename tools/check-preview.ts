// Simple script to check Preview API
async function main() {
  const response = await fetch("http://localhost:3000/preview/historical", {
    method: "POST",
    headers: {
      "x-api-key": "dev_key_123",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      windowDays: 90,
    }),
  });

  const data = await response.json();
  console.log("\n=== Preview Historical ===");
  console.log(`Status: ${response.status}`);
  console.log(`OK: ${data.ok}`);
  console.log(`Total leads: ${data.leads?.length || 0}`);
  
  if (data.error) {
    console.log(`\n❌ Error: ${data.error}`);
  }
  
  if (data.leads && data.leads.length > 0) {
    console.log(`\n✅ First 5 leads:`);
    for (const lead of data.leads.slice(0, 5)) {
      console.log(`  - ${lead.name} (${lead.itemId}) - Industry: ${lead.industry}, Status: ${lead.status}`);
    }
    console.log(`\n... and ${Math.max(0, data.leads.length - 5)} more leads`);
  }
  
  console.log(`\n📊 Statistics:`);
  console.log(`  Total: ${data.totalLeads || 0}`);
  console.log(`  Routed: ${data.routedLeads || 0}`);
  console.log(`  Closed Won: ${data.closedWonLeads || 0}`);
  console.log(`  Success Rate: ${data.systemSuccessRate ? (data.systemSuccessRate * 100).toFixed(1) : 0}%`);
}

main().catch(console.error);

