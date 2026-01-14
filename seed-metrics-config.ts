import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    console.log('='.repeat(60));
    console.log('SEEDING METRICS CONFIG FOR ALL ORGS');
    console.log('='.repeat(60));

    // 1. Get all organizations
    const orgs = await prisma.organization.findMany();
    console.log(`Found ${orgs.length} organizations.`);

    // 2. Get a valid board ID (or use placeholder)
    const board = await prisma.mondayBoardCache.findFirst();
    const validBoardIds = board ? board.boardId : "12345678";

    for (const org of orgs) {
        console.log(`\nProcessing Org: ${org.displayName} (${org.id})...`);

        const existing = await prisma.metricsConfig.findUnique({
            where: { orgId: org.id }
        });

        if (existing) {
            console.log('✅ MetricsConfig already exists. Updating defaults...');
            await prisma.metricsConfig.update({
                where: { orgId: org.id },
                data: {
                    weightAvailability: 20,
                    weightConversionHistorical: 25,
                    weightRecentPerformance: 15,
                    weightResponseTime: 10,
                    weightAvgTimeToClose: 10,
                    weightAvgDealSize: 10,
                    weightDomainExpertise: 5,
                    weightHotAgent: 5,
                    enableAvailabilityCap: true,
                    enableConversion: true,
                    enableResponseSpeed: true,
                    enableAvgDealSize: true,
                    enableIndustryPerf: true,
                    enableHotStreak: true,
                }
            });
        } else {
            console.log('🛠️ Creating new MetricsConfig...');
            await prisma.metricsConfig.create({
                data: {
                    orgId: org.id,
                    weightAvailability: 20,
                    weightConversionHistorical: 25,
                    weightRecentPerformance: 15,
                    weightResponseTime: 10,
                    weightAvgTimeToClose: 10,
                    weightAvgDealSize: 10,
                    weightDomainExpertise: 5,
                    weightHotAgent: 5,
                    enableAvailabilityCap: true,
                    enableConversion: true,
                    enableResponseSpeed: true,
                    enableAvgDealSize: true,
                    enableIndustryPerf: true,
                    enableHotStreak: true,
                    conversionWindowDays: 90,
                    avgDealWindowDays: 90,
                    responseWindowDays: 30,
                    recentPerfWindowDays: 30,
                    hotAgentMinDeals: 3,
                    hotAgentWindowDays: 7,
                    leadBoardIds: validBoardIds
                }
            });
        }
    }

    console.log('\n✅ MetricsConfig seeded successfully for all organizations!');
    await prisma.$disconnect();
}

main().catch(console.error);
