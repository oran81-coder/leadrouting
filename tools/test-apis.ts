const API_BASE = 'http://localhost:3000';
const API_KEY = 'dev_key_123';

async function testOutcomesAPI() {
  console.log('\n🔍 Testing Outcomes API...');
  
  try {
    const response = await fetch(`${API_BASE}/outcomes/summary?windowDays=30`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const data: any = await response.json();
    
    if (!response.ok) {
      console.log(`❌ Outcomes API FAILED: ${response.status}`);
      console.log('Error:', data.error);
      return false;
    }
    
    console.log('✅ Outcomes API Response:');
    console.log(`   - Assigned: ${data.kpis.assigned}`);
    console.log(`   - Closed Won: ${data.kpis.closedWon}`);
    console.log(`   - Conversion Rate: ${(data.kpis.conversionRate * 100).toFixed(2)}%`);
    console.log(`   - Agents: ${data.perAgent.length}`);
    
    if (data.perAgent.length > 0) {
      console.log('\n   Agent Details:');
      data.perAgent.forEach((agent: any) => {
        console.log(`      - ${agent.agentName}`);
        console.log(`        Assigned: ${agent.assigned}`);
        console.log(`        Closed Won: ${agent.closedWon}`);
        console.log(`        Conversion: ${(agent.conversionRate * 100).toFixed(2)}%`);
      });
    }
    
    return data.perAgent.length > 0;
  } catch (error: any) {
    console.log(`❌ Outcomes API ERROR: ${error.message}`);
    return false;
  }
}

async function testManagerAPI() {
  console.log('\n🔍 Testing Manager API...');
  
  try {
    const response = await fetch(`${API_BASE}/manager/proposals?limit=10`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const data: any = await response.json();
    
    if (!response.ok) {
      console.log(`❌ Manager API FAILED: ${response.status}`);
      console.log('Error:', data.error);
      return false;
    }
    
    console.log('✅ Manager API Response:');
    console.log(`   - Proposals: ${data.items.length}`);
    
    if (data.items.length > 0) {
      console.log('\n   Proposal Details:');
      data.items.slice(0, 3).forEach((proposal: any) => {
        console.log(`      - ${proposal.itemName || proposal.itemId}`);
        console.log(`        Status: ${proposal.status}`);
        console.log(`        Suggested: ${proposal.suggestedAssigneeName || proposal.suggestedAssigneeRaw}`);
      });
    } else {
      console.log('   ⚠️  No proposals found (this is OK if no unassigned leads exist)');
    }
    
    return true;
  } catch (error: any) {
    console.log(`❌ Manager API ERROR: ${error.message}`);
    return false;
  }
}

async function testPreviewAPI() {
  console.log('\n🔍 Testing Preview API...');
  
  try {
    const response = await fetch(`${API_BASE}/preview/historical?limit=5`, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    const data: any = await response.json();
    
    if (!response.ok) {
      console.log(`❌ Preview API FAILED: ${response.status}`);
      console.log('Error:', data.error);
      return false;
    }
    
    console.log('✅ Preview API Response:');
    console.log(`   - Leads previewed: ${data.results?.length || 0}`);
    
    if (data.results && data.results.length > 0) {
      console.log('\n   Preview Details:');
      data.results.slice(0, 2).forEach((result: any) => {
        console.log(`      - Lead: ${result.leadName || result.leadId}`);
        console.log(`        Winner: ${result.winnerAgentName || result.winnerAgentId}`);
        console.log(`        Candidates: ${result.agents?.length || 0}`);
      });
    }
    
    return data.results && data.results.length > 0;
  } catch (error: any) {
    console.log(`❌ Preview API ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('   API Testing Suite');
  console.log('========================================');
  
  const outcomesOK = await testOutcomesAPI();
  const managerOK = await testManagerAPI();
  const previewOK = await testPreviewAPI();
  
  console.log('\n========================================');
  console.log('   Summary');
  console.log('========================================');
  console.log(`Outcomes API: ${outcomesOK ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`Manager API:  ${managerOK ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log(`Preview API:  ${previewOK ? '✅ WORKING' : '❌ NOT WORKING'}`);
  console.log('========================================\n');
  
  process.exit(outcomesOK && managerOK && previewOK ? 0 : 1);
}

main().catch(console.error);

