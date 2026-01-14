import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    // 1. Check Ray Chen's Profile
    const agentUserId = '97865279'; // Ray Chen
    const profile = await prisma.agentProfile.findFirst({
        where: { agentUserId }
    });

    console.log('=== AGENT PROFILE (Ray Chen) ===');
    if (profile) {
        console.log(JSON.stringify({
            agentName: profile.agentName,
            totalLeadsConverted: profile.totalLeadsConverted,
            avgDealSize: profile.avgDealSize,
            avgTimeToClose: profile.avgTimeToClose,
            industryScores: JSON.parse(profile.industryScores as string),
            computedAt: profile.computedAt
        }, null, 2));
    } else {
        console.log('Profile not found');
    }

    // 2. Check the 3 Latest Proposals
    const latestProposals = await prisma.routingProposal.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
    });

    console.log('\n=== LATEST PROPOSALS ===');
    latestProposals.forEach((p, i) => {
        console.log(`\nProposal ${i + 1}:`);
        console.log(`ID: ${p.id}`);
        console.log(`Created At: ${p.createdAt}`);
        console.log(`Item Name: ${p.itemName}`);
        console.log(`Explainability (Keys):`, p.explainability ? Object.keys(JSON.parse(p.explainability as string)) : 'null');

        if (p.explainability) {
            const explain = JSON.parse(p.explainability as string);
            if (explain.breakdown) {
                console.log(`Breakdown KPI Scores:`, explain.breakdown.kpiScores || 'No kpiScores');
                console.log(`Primary Reasons:`, explain.breakdown.primaryReasons?.map((r: any) => ({ ruleId: r.ruleId, score: r.matchScore })));
                console.log(`Secondary Factors:`, explain.breakdown.secondaryFactors?.map((r: any) => ({ ruleId: r.ruleId, score: r.matchScore })));
            }
        }
    });

    await prisma.$disconnect();
}

main().catch(console.error);
