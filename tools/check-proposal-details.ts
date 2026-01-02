import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const orgId = "cmjt563ps000037hg6i4dvl7m";

  console.log("\n=== Recent Routing Proposals ===\n");
  
  const proposals = await prisma.routingProposal.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  for (const p of proposals) {
    console.log(`\n📋 Proposal: ${p.itemName || p.itemId}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Status: ${p.status}`);
    console.log(`   Created: ${p.createdAt.toISOString()}`);
    
    // Check explainability field
    if (p.explainability) {
      console.log(`   ✅ Has explainability data`);
      const explain = typeof p.explainability === 'string' 
        ? JSON.parse(p.explainability) 
        : p.explainability;
      
      console.log(`   Explainability keys:`, Object.keys(explain));
      
      if (explain.topRecommendation) {
        console.log(`   Top Recommendation:`, explain.topRecommendation);
      }
      
      if (explain.recommendations && Array.isArray(explain.recommendations)) {
        console.log(`   Number of recommendations: ${explain.recommendations.length}`);
        if (explain.recommendations[0]) {
          console.log(`   First recommendation:`, explain.recommendations[0]);
        }
      }
    } else {
      console.log(`   ❌ NO explainability data!`);
    }
    
    // Check action field
    if (p.action) {
      console.log(`   Action:`, typeof p.action === 'string' ? JSON.parse(p.action) : p.action);
    } else {
      console.log(`   ❌ NO action data!`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
