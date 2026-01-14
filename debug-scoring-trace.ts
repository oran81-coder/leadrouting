import { getPrisma } from './packages/core/src/db/prisma';
import { convertKPIWeightsToRules, extractKPIWeightsFromMetricsConfig } from './packages/modules/scoring/src/application/kpiWeightsToRules';
import { evaluateRulesForAgent } from './packages/modules/rule-engine/src/application/ruleEvaluator';

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('DEBUG: SCORING LOGIC TRACE');
    console.log('='.repeat(60));

    // 1. Find the Org
    const org = await prisma.organization.findFirst({
        where: { displayName: { contains: 'oran' } } // Assuming user is in this org
    });

    if (!org) {
        console.log('❌ Org not found!');
        return;
    }

    console.log(`🏢 Org: ${org.displayName} (${org.id})`);

    // 2. Load Config
    const config = await prisma.metricsConfig.findUnique({
        where: { orgId: org.id }
    });

    if (!config) {
        console.log('❌ Config not found!');
        return;
    }

    // 3. Extract Weights
    const weights = extractKPIWeightsFromMetricsConfig(config);
    console.log('\n⚖️  Weights:', weights);

    // 4. Generate Rules
    const rules = convertKPIWeightsToRules(weights);
    console.log(`\n📏 Generated ${rules.length} rules.`);

    // 5. Find Agent "Oran Chen"
    const agent = await prisma.agentProfile.findFirst({
        where: {
            orgId: org.id,
            agentName: { contains: 'Chen' }
        }
    });

    if (!agent) {
        console.log('❌ Agent "Oran Chen" not found!');
        return;
    }

    console.log(`\n👤 Agent: ${agent.agentName}`);
    console.log(`   - conversionRate: ${agent.conversionRate}`);
    console.log(`   - avgResponseTime: ${agent.avgResponseTime}`);
    console.log(`   - avgDealSize: ${agent.avgDealSize}`);
    console.log(`   - industryScores: ${agent.industryScores}`);
    console.log(`   - availability: ${agent.availability}`);

    // 6. Evaluate
    const leadContext = {
        industry: 'Legal', // Example industry
        dealValue: 5000
    };

    console.log(`\n🧪 Evaluating with lead context:`, leadContext);

    const evaluation = evaluateRulesForAgent(leadContext as any, agent, rules);

    console.log('\n📊 Evaluation Results:');
    console.table(evaluation.results.map(r => ({
        rule: r.ruleName,
        applied: r.applied,
        matchScore: r.matchScore.toFixed(2),
        contribution: r.contribution.toFixed(2),
        explanation: r.explanation,
        condition: r.conditionDetails
    })));

    await prisma.$disconnect();
}

main().catch(console.error);
