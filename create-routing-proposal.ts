import { getPrisma } from "./packages/core/src/db/prisma";
import { PrismaInternalSchemaRepo } from "./packages/modules/internal-schema/src/infrastructure/internalSchema.repo";
import { PrismaFieldMappingConfigRepo } from "./packages/modules/field-mapping/src/infrastructure/mappingConfig.repo";
import { PrismaRoutingStateRepo } from "./packages/modules/routing-state/src/infrastructure/routingState.repo";
import { PrismaRuleSetRepo } from "./packages/modules/rule-engine/src/infrastructure/rules.repo";
import { normalizeEntityRecord } from "./packages/core/src/schema/normalization";
import type { AgentProfile } from "./packages/modules/agent-profiling/src/application/agentProfiler";

/**
 * Create Routing Proposal with Real Agent Profiles
 * This demonstrates the full routing flow with scoring
 */

async function main() {
  const prisma = getPrisma();
  const ORG_ID = 'org_1';
  
  console.log("=".repeat(60));
  console.log("CREATE ROUTING PROPOSAL - FULL FLOW");
  console.log("=".repeat(60));
  
  // Get routing state
  const stateRepo = new PrismaRoutingStateRepo();
  const state = await stateRepo.get(ORG_ID);
  
  if (!state?.isEnabled) {
    console.error("\n❌ Routing is not enabled!");
    process.exit(1);
  }
  
  console.log(`\n✅ Routing enabled (v${state.schemaVersion}/v${state.mappingVersion}/v${state.rulesVersion})`);
  
  // Load configurations
  const schemaRepo = new PrismaInternalSchemaRepo();
  const mappingRepo = new PrismaFieldMappingConfigRepo();
  const rulesRepo = new PrismaRuleSetRepo();
  
  const schema = await schemaRepo.getByVersion(ORG_ID, state.schemaVersion!);
  const mapping = await mappingRepo.getByVersion(ORG_ID, state.mappingVersion!);
  const rules = await rulesRepo.getByVersion(ORG_ID, state.rulesVersion!);
  
  if (!schema || !mapping || !rules) {
    console.error("\n❌ Missing configuration!");
    process.exit(1);
  }
  
  console.log(`\n✅ Loaded configurations`);
  
  // Load Agent Profiles from database
  console.log(`\n👥 Loading Agent Profiles...`);
  const agents = await prisma.agentProfile.findMany({
    where: { orgId: ORG_ID }
  });
  
  console.log(`  Found ${agents.length} agents:`);
  for (const agent of agents) {
    console.log(`    - ${agent.agentUserId}: ${agent.totalLeadsHandled} leads, ${agent.totalLeadsConverted} converted`);
  }
  
  if (agents.length === 0) {
    console.error("\n❌ No agents found! Run /admin/compute-agent-profiles first.");
    process.exit(1);
  }
  
  // Create a test lead
  const testLead = {
    lead_source: "Website",
    lead_industry: "Furniture", 
    lead_deal_size: 10000,
    deal_status: "New Lead"
  };
  
  console.log(`\n📋 Test Lead:`);
  console.log(`  Industry: ${testLead.lead_industry}`);
  console.log(`  Deal Size: ${testLead.lead_deal_size}`);
  console.log(`  Status: ${testLead.deal_status}`);
  
  // Normalize
  const normalized = normalizeEntityRecord(schema, testLead);
  console.log(`\n✅ Normalized values:`, normalized.values);
  
  // Calculate scores for each agent using weights
  const weights = rules.weights || {};
  console.log(`\n🎯 Calculating scores with weights:`, weights);
  
  const agentScores = agents.map(agent => {
    let totalScore = 0;
    const breakdown: Record<string, number> = {};
    
    // Industry match
    if (weights.lead_industry && testLead.lead_industry) {
      const industryScores = typeof agent.industryScores === 'string' 
        ? JSON.parse(agent.industryScores)
        : (agent.industryScores || {});
      
      const industryScore = industryScores[testLead.lead_industry] || 0;
      const points = industryScore * (weights.lead_industry / 100);
      totalScore += points;
      breakdown.lead_industry = points;
    }
    
    // Deal size match
    if (weights.lead_deal_size && testLead.lead_deal_size && agent.avgDealSize) {
      const sizeDiff = Math.abs(testLead.lead_deal_size - agent.avgDealSize);
      const sizeScore = Math.max(0, 100 - (sizeDiff / 1000)); // Simple scoring
      const points = sizeScore * (weights.lead_deal_size / 100);
      totalScore += points;
      breakdown.lead_deal_size = points;
    }
    
    // Conversion rate
    if (weights.conversionRate && agent.conversionRate !== null) {
      const points = agent.conversionRate * (weights.conversionRate / 100);
      totalScore += points;
      breakdown.conversionRate = points;
    }
    
    // Availability
    if (weights.availability) {
      const points = agent.availability * (weights.availability / 100);
      totalScore += points;
      breakdown.availability = points;
    }
    
    // Hot streak
    if (weights.hotStreakActive && agent.hotStreakActive) {
      const points = weights.hotStreakActive;
      totalScore += points;
      breakdown.hotStreakActive = points;
    }
    
    return {
      agentUserId: agent.agentUserId,
      agentName: agent.agentName || agent.agentUserId,
      totalScore: Math.round(totalScore),
      breakdown,
      agent
    };
  });
  
  // Sort by score
  agentScores.sort((a, b) => b.totalScore - a.totalScore);
  
  console.log(`\n📊 Agent Scores:`);
  for (const score of agentScores) {
    console.log(`  ${score.agentName}: ${score.totalScore} points`);
    for (const [key, value] of Object.entries(score.breakdown)) {
      if (value > 0) {
        console.log(`    - ${key}: +${Math.round(value)}`);
      }
    }
  }
  
  const topAgent = agentScores[0];
  
  // Create proposal in database
  console.log(`\n💾 Creating proposal in database...`);
  
  const proposal = await prisma.routingProposal.create({
    data: {
      orgId: ORG_ID,
      idempotencyKey: `test_${Date.now()}`,
      boardId: '18393182279',
      itemId: 'test_lead_' + Date.now(),
      status: 'PROPOSED',
      
      normalizedValues: JSON.stringify(testLead),
      
      selectedRule: JSON.stringify({
        id: 'rule_default_pool',
        name: 'Default Agent Pool',
        priority: 100
      }),
      
      action: JSON.stringify({
        type: 'assign_agent',
        value: topAgent.agentUserId,
        agentName: topAgent.agentName,
        score: topAgent.totalScore,
        confidence: topAgent.totalScore >= 80 ? 'high' : topAgent.totalScore >= 50 ? 'medium' : 'low'
      }),
      
      explainability: JSON.stringify({
        summary: `Recommended ${topAgent.agentName} with score ${topAgent.totalScore}/100`,
        recommendedAgent: {
          agentUserId: topAgent.agentUserId,
          agentName: topAgent.agentName,
          score: topAgent.totalScore,
          confidence: topAgent.totalScore >= 80 ? 'high' : topAgent.totalScore >= 50 ? 'medium' : 'low',
          breakdown: topAgent.breakdown
        },
        alternativeAgents: agentScores.slice(1, 4).map(s => ({
          agentUserId: s.agentUserId,
          agentName: s.agentName,
          score: s.totalScore
        })),
        weights,
        versions: {
          schema: state.schemaVersion,
          mapping: state.mappingVersion,
          rules: state.rulesVersion
        }
      })
    }
  });
  
  const action = JSON.parse(proposal.action || '{}');
  const explainability = JSON.parse(proposal.explainability || '{}');
  
  console.log(`\n✅ PROPOSAL CREATED!`);
  console.log(`   ID: ${proposal.id}`);
  console.log(`   Status: ${proposal.status}`);
  console.log(`   Recommended Agent: ${action.agentName} (${action.value})`);
  console.log(`   Score: ${action.score}/100`);
  console.log(`   Confidence: ${action.confidence}`);
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ PROPOSAL READY FOR MANAGER APPROVAL!`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\nNext: View in Manager UI or approve via API`);
  console.log(`  GET /manager/proposals`);
  console.log(`  POST /manager/proposals/${proposal.id}/approve`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

