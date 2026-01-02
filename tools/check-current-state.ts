import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();

async function checkCurrentState() {
  try {
    console.log("=== Checking Current State ===\n");

    // Get the new organization (not the old default one)
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`Organizations found: ${orgs.length}`);
    orgs.forEach(org => {
      console.log(`  - ${org.id}: ${org.name} (Monday WS: ${org.mondayWorkspaceId})`);
    });

    // Check the newest org's mapping and metrics
    if (orgs.length > 0) {
      const newestOrg = orgs[0];
      console.log(`\n=== Checking Newest Org: ${newestOrg.id} ===`);

      // Check mapping
      const mapping = await prisma.fieldMappingConfigVersion.findFirst({
        where: { orgId: newestOrg.id },
        orderBy: { version: 'desc' },
      });
      
      if (mapping) {
        console.log(`\nMapping found: version ${mapping.version}`);
        const config = JSON.parse(mapping.payload as string);
        console.log(`  Primary Board: ${config.primaryBoardId}`);
        console.log(`  Mappings:`, Object.keys(config.mappings || {}).length, 'fields');
      } else {
        console.log(`\n❌ No mapping found for this org`);
      }

      // Check MetricsConfig
      const metrics = await prisma.metricsConfig.findUnique({
        where: { orgId: newestOrg.id },
      });
      
      if (metrics) {
        console.log(`\nMetricsConfig found:`);
        console.log(`  leadBoardIds: "${metrics.leadBoardIds}"`);
        console.log(`  assignedPeopleColumnId: "${metrics.assignedPeopleColumnId}"`);
      } else {
        console.log(`\n❌ No MetricsConfig found for this org`);
      }

      // Check LeadFact
      const leadFactCount = await prisma.leadFact.count({
        where: { orgId: newestOrg.id },
      });
      console.log(`\nLeadFacts: ${leadFactCount} records`);

      // Check Proposals
      const proposalCount = await prisma.routingProposal.count({
        where: { orgId: newestOrg.id },
      });
      console.log(`Proposals: ${proposalCount} records`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCurrentState();
