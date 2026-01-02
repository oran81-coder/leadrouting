// Test Outcomes Dashboard API
async function main() {
  const API_KEY = "dev_key_123";
  const BASE_URL = "http://localhost:3000";

  console.log("\n=== Testing Outcomes Dashboard ===\n");

  const response = await fetch(`${BASE_URL}/outcomes/stats`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      windowDays: 30,
    }),
  });

  const data = await response.json();
  
  console.log(`Status: ${response.status}`);
  console.log(`OK: ${data.ok}`);
  
  if (data.error) {
    console.log(`❌ Error: ${data.error}`);
    return;
  }

  console.log(`\n📊 Outcomes Statistics:`);
  console.log(`  Total Leads: ${data.totalLeads || 0}`);
  console.log(`  Assigned: ${data.assignedLeads || 0}`);
  console.log(`  Closed Won: ${data.closedWonLeads || 0}`);
  console.log(`  Conversion Rate: ${data.conversionRate ? (data.conversionRate * 100).toFixed(1) : 0}%`);
  
  if (data.agentStats && data.agentStats.length > 0) {
    console.log(`\n👥 Agent Statistics (${data.agentStats.length} agents):`);
    for (const agent of data.agentStats.slice(0, 3)) {
      console.log(`  - ${agent.agentName}: ${agent.leadsHandled} leads, ${agent.closedWon} won`);
    }
  } else {
    console.log(`\n⚠️  No agent statistics available`);
  }

  console.log(`\n✅ Outcomes Dashboard test completed!`);
}

main().catch((error) => {
  console.error("❌ Test failed with error:", error.message);
  process.exit(1);
});

