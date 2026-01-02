import fetch from "node-fetch";

const API_BASE = "http://localhost:3000";
const ORG_ID = "cmjt563ps000037hg6i4dvl7m";

// Take one unassigned lead and create a proposal
async function testRoutingForOneLead() {
  console.log("Testing routing execution...\n");

  // Get the access token (from your browser)
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWp0NTYzenAwMDA0MzdoZzZ3N2lmcnU1IiwiZW1haWwiOiJvcmFuODFAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwib3JnSWQiOiJjbWp0NTYzcHMwMDAwMzdoZzZpNGR2bDdtIiwidXNlcm5hbWUiOiJvcmFuODEiLCJzZXNzaW9uSWQiOiJjbWp0NTY0MGswMDA2MzdoZ3BwemJ2MndsIiwiaWF0IjoxNzY3MTMyNjc2LCJleHAiOjE3NjcxMzYyNzYsImF1ZCI6ImxlYWQtcm91dGluZy1hcHAiLCJpc3MiOiJsZWFkLXJvdXRpbmctYXBpIn0.LD6pXznIHig8WTVifaqL_kEZzBRb8vBwvYh_048-0lo";

  // Test with one lead
  const boardId = "18393182279";
  const itemId = "10877028882"; // From the initial load

  console.log(`Calling routing/execute for:`)  ;
  console.log(`  Board: ${boardId}`);
  console.log(`  Item: ${itemId}`);

  try {
    const response = await fetch(`${API_BASE}/routing/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        boardId,
        itemId,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("\n✅ Success!", result);
    } else {
      console.error("\n❌ Failed:", result);
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
  }
}

testRoutingForOneLead();
