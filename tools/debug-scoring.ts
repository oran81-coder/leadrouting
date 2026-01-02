
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const leadCount = await prisma.leadFact.count();
        const proposalCount = await prisma.routingProposal.count();
        const agentProfileCount = await prisma.agentProfile.count();

        const distinctAgentsInLeads = await prisma.leadFact.groupBy({
            by: ['assignedUserId'],
            where: { assignedUserId: { not: null } },
            _count: { assignedUserId: true }
        });

        console.log(`Leads: ${leadCount}`);
        console.log(`Proposals: ${proposalCount}`);
        console.log(`Agent Profiles in DB: ${agentProfileCount}`);
        console.log(`Distinct Agents in LeadFact: ${distinctAgentsInLeads.length}`);
        distinctAgentsInLeads.forEach(a => {
            console.log(`  Agent ID: ${a.assignedUserId}, Lead Count: ${a._count.assignedUserId}`);
        });

        if (proposalCount > 0) {
            console.log('\n--- Recent Proposals ---');
            const proposals = await prisma.routingProposal.findMany({
                take: 3,
                orderBy: { createdAt: 'desc' },
            });
            proposals.forEach(p => {
                console.log(`ID: ${p.id}, Status: ${p.status}, Lead: ${p.itemName}`);
                if (p.explainability) {
                    try {
                        const explain = JSON.parse(p.explainability as string);
                        console.log(`  Summary: ${explain.summary}`);
                        if (explain.topAgent) {
                            console.log(`  Top Agent: ${explain.topAgent.agentName} (ID: ${explain.topAgent.agentUserId})`);
                            console.log(`  Score: ${explain.topAgent.score}`);
                        }
                        if (explain.breakdown) {
                            console.log(`  Breakdown:`);
                            const kpiKeys = ['workload', 'conversionHistorical', 'recentPerformance', 'responseTime', 'avgTimeToClose', 'avgDealSize', 'industryMatch', 'hotStreak'];
                            kpiKeys.forEach(k => {
                                if (explain.breakdown[k] !== undefined) {
                                    console.log(`    ${k}: ${explain.breakdown[k]}`);
                                }
                            });
                        }
                    } catch (e) {
                        console.log(`  (Could not parse explainability)`);
                    }
                }
            });
        }

        if (agentProfileCount > 0) {
            const profiles = await prisma.agentProfile.findMany();
            console.log('\n--- Agent Profiles ---');
            profiles.forEach(p => {
                console.log(`Agent: ${p.agentName} (${p.agentUserId})`);
                console.log(`  Conversion: ${p.conversionRate}`);
                console.log(`  Availability: ${p.availability}`);
                console.log(`  Industry Scores: ${p.industryScores}`);
            });
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
