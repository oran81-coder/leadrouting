import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();
    const ORG_ID = 'org_1';

    console.log('='.repeat(60));
    console.log('DEBUG: KPI WEIGHT CONFIGURATION');
    console.log('='.repeat(60));

    // 1. Get MetricsConfig
    const config = await prisma.metricsConfig.findUnique({
        where: { orgId: ORG_ID }
    });

    if (!config) {
        console.log('❌ No MetricsConfig found for org_1');
        await prisma.$disconnect();
        return;
    }

    console.log('Found MetricsConfig:');

    // Check column-based weights (if they exist in this schema version)
    const weights = {
        workload: config.weightAvailability,
        conversionHistorical: config.weightConversionHistorical,
        recentPerformance: config.weightRecentPerformance,
        responseTime: config.weightResponseTime,
        avgTimeToClose: config.weightAvgTimeToClose,
        avgDealSize: config.weightAvgDealSize,
        industryMatch: config.weightDomainExpertise,
        hotStreak: config.weightHotAgent
    };

    console.log('\nColumn Weights:');
    console.table(weights);

    // Check JSON weights (override)
    console.log('\nJSON Weights (kpiWeights field):');
    if (config.kpiWeights) {
        console.log(typeof config.kpiWeights === 'string'
            ? JSON.parse(config.kpiWeights)
            : config.kpiWeights
        );
    } else {
        console.log('(null)');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
