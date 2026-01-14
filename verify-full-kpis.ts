import { getPrisma } from './packages/core/src/db/prisma';
import { computeScores } from './packages/modules/scoring/src/application/scoring.engine';
import { generateRoutingExplanation } from './packages/modules/explainability/src/application/explainer';
import { formatExplainabilityForStorage } from './apps/api/src/services/advancedRoutingService';
import { convertKPIWeightsToRules } from './packages/modules/scoring/src/application/kpiWeightsToRules';

async function main() {
    const prisma = getPrisma();
    const orgId = "cmjt563ps000037hg6i4dvl7m";

    // 1. Get Ray Chen's Profile
    const agentUserId = '97865279';
    const profileRaw = await prisma.agentProfile.findFirst({ where: { agentUserId } });
    if (!profileRaw) throw new Error('Agent profile not found');

    const agentProfile: any = {
        ...profileRaw,
        industryScores: JSON.parse(profileRaw.industryScores as string)
    };

    // 2. Mock a Lead (LAW industry)
    const lead: any = {
        leadId: 'test-lead-1',
        leadName: 'Stein Law Office',
        industry: 'Law', // Case insensitive check in refactored code
        dealSize: 5000,
        lead_industry: 'law'
    };

    // 3. Get Rules
    const rules = convertKPIWeightsToRules({
        conversionHistorical: 15,
        responseTime: 10,
        workload: 20,
        industryMatch: 20,
        avgTimeToClose: 10,
        avgDealSize: 10,
        recentPerformance: 10,
        hotStreak: 5
    });

    // 4. Run Scoring
    console.log('--- RUNNING SCORING ---');
    const scoringResult = computeScores(lead, [agentProfile], rules);

    // 5. Run Explainer
    console.log('--- RUNNING EXPLAINER ---');
    const explanation = generateRoutingExplanation(lead, scoringResult, new Map([[agentUserId, agentProfile]]));

    // 6. Run Storage Formatter
    console.log('--- RUNNING STORAGE FORMATTER ---');
    const storedExplanation = formatExplainabilityForStorage(explanation);

    console.log('\n=== VERIFICATION RESULTS ===');
    console.log('Stored Breakdown keys:', Object.keys(storedExplanation.breakdown));
    console.log('KPI Scores in Breakdown:');

    const metrics = [
        'kpi_industry_match',
        'kpi_avg_deal_size',
        'kpi_avg_time_to_close',
        'kpi_conversion_historical',
        'kpi_response_time'
    ];

    metrics.forEach(m => {
        console.log(`${m}: ${storedExplanation.breakdown[m]}`);
    });

    await prisma.$disconnect();
}

main().catch(console.error);
