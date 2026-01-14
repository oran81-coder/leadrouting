import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const PROPOSAL_ID = 'cmk4g3ctd0nriz5w2pjfsautb';
    const prisma = getPrisma();

    console.log(`Diagnosing Domain Expertise for Proposal: ${PROPOSAL_ID}`);

    // 1. Fetch Proposal to get Normalized Values (Lead Data)
    const proposal = await prisma.routingProposal.findUnique({
        where: { id: PROPOSAL_ID }
    });

    if (!proposal) {
        console.log('Proposal not found');
        return;
    }

    const orgId = proposal.orgId;
    console.log(`Org ID: ${orgId}`);

    // 1.5 Check what's stored in explainability
    console.log('\n=== EXPLAINABILITY BREAKDOWN ===');
    let explainability = proposal.explainability;
    if (typeof explainability === 'string') {
        explainability = JSON.parse(explainability);
    }
    // @ts-ignore
    const breakdown = explainability?.breakdown;
    if (breakdown) {
        console.log('Breakdown keys:', Object.keys(breakdown));
        if (breakdown.primaryReasons) {
            console.log('\nPrimary Reasons:');
            for (const r of breakdown.primaryReasons) {
                console.log(`  - ruleId: "${r.ruleId}", category: "${r.category}", matchScore: ${r.matchScore}, contribution: ${r.contribution}`);
            }
        }
        if (breakdown.secondaryFactors) {
            console.log('\nSecondary Factors:');
            for (const f of breakdown.secondaryFactors) {
                console.log(`  - ruleId: "${f.ruleId}", category: "${f.category}", matchScore: ${f.matchScore}, contribution: ${f.contribution}`);
            }
        }
        // Check for direct kpi scores in breakdown
        const directKpiKeys = Object.keys(breakdown).filter(k => k.startsWith('kpi_') || !['primaryReasons', 'secondaryFactors', 'gatingSummary'].includes(k));
        if (directKpiKeys.length > 0) {
            console.log('\nDirect KPI Scores in breakdown:');
            for (const k of directKpiKeys) {
                const val = breakdown[k];
                if (typeof val === 'number') {
                    console.log(`  ${k}: ${val}`);
                }
            }
        }
    } else {
        console.log('No breakdown found in explainability');
    }
    console.log('=== END EXPLAINABILITY ===\n');

    let leadData = proposal.normalizedValues;
    if (typeof leadData === 'string') {
        leadData = JSON.parse(leadData);
    }

    // Dump full lead data to debug "undefined" industry
    console.log('Lead Data (Normalized):');
    console.log(JSON.stringify(leadData, null, 2));

    // @ts-ignore
    const leadIndustry = leadData.industry;
    console.log(`Lead Industry (extracted): "${leadIndustry}"`);

    // 2. Fetch Assigned Agent Profile
    let assignedAgentId = null;
    const action = proposal.action ? JSON.parse(proposal.action as string) : null;
    if (action && action.value) {
        assignedAgentId = action.value;
    }

    if (assignedAgentId) {
        // Use findFirst with orgId AND agentUserId to avoid unique constraint error
        const agent = await prisma.agentProfile.findFirst({
            where: {
                agentUserId: assignedAgentId,
                orgId: orgId
            }
        });

        if (agent) {
            console.log(`Assigned Agent: ${agent.agentName} (${agent.agentUserId})`);
            console.log(`Agent Industry Scores (JSON):`);
            // @ts-ignore
            console.log(JSON.stringify(agent.industryScores, null, 2));

            if (leadIndustry) {
                const scores = agent.industryScores as Record<string, number>;

                // Check exact match
                const exactMatch = scores[leadIndustry];
                console.log(`Exact Match ("${leadIndustry}"): ${exactMatch}`);

                // Check case-insensitive match
                const lowerKeys = Object.keys(scores).map(k => k.toLowerCase());
                const matchIndex = lowerKeys.indexOf(leadIndustry.toLowerCase());

                if (matchIndex >= 0) {
                    const actualKey = Object.keys(scores)[matchIndex];
                    console.log(`Case-Insensitive Match found: "${actualKey}" -> ${scores[actualKey]}`);
                } else {
                    console.log('No Case-Insensitive Match found.');

                    // Heuristic check (contains)
                    const partialMatch = Object.keys(scores).find(k => k.toLowerCase().includes(leadIndustry.toLowerCase()) || leadIndustry.toLowerCase().includes(k.toLowerCase()));
                    if (partialMatch) {
                        console.log(`Partial Match potential: "${partialMatch}" -> ${scores[partialMatch]}`);
                    }
                }
            } else {
                console.log('Lead has NO industry defined (field is undefined or null).');
            }
        } else {
            console.log('Agent profile not found.');
        }
    } else {
        console.log('No agent assigned in proposal action.');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
