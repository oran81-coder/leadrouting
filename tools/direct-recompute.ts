
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    try {
        console.log(`--- Direct Profile Recompute for Org ${orgId} ---`);

        // 1. Get all agents with facts
        const agents = await prisma.leadFact.findMany({
            where: { orgId, assignedUserId: { not: null } },
            select: { assignedUserId: true },
            distinct: ["assignedUserId"],
        });

        console.log(`Found ${agents.length} agents.`);

        for (const { assignedUserId } of agents) {
            if (!assignedUserId) continue;

            console.log(`Computing profile for agent ${assignedUserId}...`);

            // Calculate conversion rate manually for now
            const allLeads = await prisma.leadFact.findMany({
                where: { orgId, assignedUserId }
            });

            const total = allLeads.length;
            const converted = allLeads.filter(l => l.closedWonAt !== null).length;
            console.log(`Debug: agent=${assignedUserId}, total=${total}, converted=${converted}`);
            const convRate = total > 0 ? converted / total : 0;

            const revenue = allLeads.reduce((sum, l) => sum + (l.dealAmount || 0), 0);
            const avgDeal = converted > 0 ? revenue / converted : 0;

            // Save to AgentProfile
            await prisma.agentProfile.upsert({
                where: { orgId_agentUserId: { orgId, agentUserId: assignedUserId } },
                update: {
                    conversionRate: convRate,
                    totalLeadsHandled: total,
                    totalLeadsConverted: converted,
                    totalRevenue: revenue,
                    avgDealSize: avgDeal,
                    computedAt: new Date(),
                    industryScores: JSON.stringify({}),
                    availability: 1.0,
                    currentActiveLeads: total - converted,
                    dailyLeadsToday: 0,
                    hotStreakCount: 0,
                    hotStreakActive: false,
                    burnoutScore: 0
                },
                create: {
                    orgId,
                    agentUserId: assignedUserId,
                    conversionRate: convRate,
                    totalLeadsHandled: total,
                    totalLeadsConverted: converted,
                    totalRevenue: revenue,
                    avgDealSize: avgDeal,
                    computedAt: new Date(),
                    industryScores: JSON.stringify({}),
                    availability: 1.0,
                    currentActiveLeads: total - converted,
                    dailyLeadsToday: 0,
                    hotStreakCount: 0,
                    hotStreakActive: false,
                    burnoutScore: 0
                }
            });

            console.log(`   ✅ Saved. Conv Rate: ${(convRate * 100).toFixed(1)}%, Revenue: $${revenue}`);
        }

        console.log('--- Recompute Complete ---');

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
main();
