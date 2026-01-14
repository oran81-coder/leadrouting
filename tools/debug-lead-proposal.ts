import { PrismaClient } from "@prisma/client";
import { executeAdvancedRouting } from "../apps/api/src/services/advancedRoutingService";
import { PrismaMetricsConfigRepo } from "../apps/api/src/infrastructure/metricsConfig.repo";
import { PrismaAgentProfileRepo } from "../apps/api/src/infrastructure/agentProfile.repo";

const prisma = new PrismaClient();
const orgId = "cmjt563ps000037hg6i4dvl7m";

async function debug() {
    console.log("--- DEBUGGING MISSING PROPOSAL ---");

    // 1. Find the lead in LeadFact
    const leadName = "מאיר אבני";
    const lead = await prisma.leadFact.findFirst({
        where: { orgId, itemName: { contains: leadName } }
    });

    if (!lead) {
        console.log(`❌ Lead "${leadName}" not found in LeadFact!`);
        return;
    }

    console.log(`✅ Found Lead: ${lead.itemName} (ID: ${lead.itemId}, Board: ${lead.boardId})`);
    console.log(`   Assigned To: ${lead.assignedUserId || "UNASSIGNED"}`);

    // 2. Check if a proposal exists
    const proposal = await prisma.routingProposal.findFirst({
        where: { orgId, itemId: lead.itemId }
    });

    if (proposal) {
        console.log(`✅ Proposal EXISTS for this lead!`);
        console.log(`   Status: ${proposal.status}`);
        console.log(`   Created At: ${proposal.createdAt.toISOString()}`);
        if (proposal.status !== "PROPOSED") {
            console.log(`   ⚠️ Note: Manager screen usually filters for status=PROPOSED.`);
        }
    } else {
        console.log(`❌ NO PROPOSAL found in RoutingProposal table.`);

        // 3. Try to simulate routing to see why it fails
        console.log("\n--- SIMULATING ROUTING ---");
        const metricsRepo = new PrismaMetricsConfigRepo();
        const config = await metricsRepo.get(orgId);

        const profileRepo = new PrismaAgentProfileRepo();
        const profiles = await profileRepo.listByOrg(orgId);

        const ruleSet = await prisma.ruleSetVersion.findFirst({
            where: { orgId },
            orderBy: { version: "desc" }
        });
        const rules = JSON.parse(ruleSet?.payload || "{}");

        console.log(`   Agents Found: ${profiles.length}`);
        console.log(`   Rules Found: ${rules.rules?.length || 0}`);

        try {
            const result = await executeAdvancedRouting(
                orgId,
                { industry: lead.industry, dealSize: lead.dealAmount },
                lead.itemId,
                lead.itemName,
                profiles,
                config,
                rules
            );
            console.log("   Routing Result Matched:", result.matched);
            if (result.matched) {
                console.log("   Recommended Agent:", result.recommendedAgent?.agentName || result.recommendedAgent?.agentUserId);
            } else {
                console.log("   ❌ Routing simulation did NOT find a match.");
            }
        } catch (err: any) {
            console.error("   ❌ Routing simulation CRASHED:", err.message);
        }
    }

    await prisma.$disconnect();
}

debug().catch(console.error);
