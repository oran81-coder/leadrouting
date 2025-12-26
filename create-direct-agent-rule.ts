import { getPrisma } from "./packages/core/src/db/prisma";

/**
 * Create a rule that assigns directly to agent 97679373
 */

async function main() {
  const prisma = getPrisma();
  
  const ruleSet = {
    version: 13, // New version
    updatedAt: new Date().toISOString(),
    rules: [
      {
        id: "rule_assign_owner_1",
        name: "Assign to OWNER 1",
        description: "Route all leads to agent 97679373 (OWNER 1)",
        priority: 100,
        enabled: true,
        when: [], // No conditions = always match
        then: {
          type: "assign_agent_id",
          value: "97679373"  // Real agent ID from Monday
        }
      }
    ],
    weights: {
      lead_industry: 35,
      lead_deal_size: 25,
      conversionRate: 20,
      availability: 10,
      avgDealSize: 5,
      hotStreakActive: 3,
      burnoutScore: 2
    }
  };
  
  console.log("Creating new rule...");
  
  const result = await prisma.ruleSetVersion.create({
    data: {
      orgId: 'org_1',
      version: ruleSet.version,
      payload: JSON.stringify(ruleSet),
      createdBy: 'system'
    }
  });
  
  console.log(`✅ Rule created: v${result.version}`);
  console.log(`   Agent: 97679373`);
  
  // Update routing state to use new rules
  await prisma.routingState.update({
    where: { orgId: 'org_1' },
    data: { rulesVersion: ruleSet.version }
  });
  
  console.log(`✅ Routing state updated to use rules v${ruleSet.version}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);

