import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('--- Config Sync & Profile Recompute Utility ---');

        // 1. Identify the source of truth (org with boardIds)
        const sourceConfig = await prisma.metricsConfig.findFirst({
            where: { leadBoardIds: { not: "" } }
        });

        if (!sourceConfig) {
            console.error('❌ No active MetricsConfig with boards found. Please configure a board in the Admin UI first.');
            return;
        }

        console.log(`✅ Source of Truth found: Org ${sourceConfig.orgId}`);
        console.log(`   Boards: ${sourceConfig.leadBoardIds}`);
        console.log(`   Closed Won Status: ${sourceConfig.closedWonStatusColumnId} = ${sourceConfig.closedWonStatusValue}`);

        // 2. Sync to other organizations if they are empty
        const allConfigs = await prisma.metricsConfig.findMany();
        for (const target of allConfigs) {
            if (target.orgId !== sourceConfig.orgId && (!target.leadBoardIds || target.leadBoardIds === "")) {
                console.log(`🔄 Syncing config to Org ${target.orgId}...`);
                await prisma.metricsConfig.update({
                    where: { id: target.id },
                    data: {
                        leadBoardIds: sourceConfig.leadBoardIds,
                        assignedPeopleColumnId: sourceConfig.assignedPeopleColumnId,
                        closedWonStatusColumnId: sourceConfig.closedWonStatusColumnId,
                        closedWonStatusValue: sourceConfig.closedWonStatusValue,
                        dealAmountColumnId: sourceConfig.dealAmountColumnId,
                        industryColumnId: sourceConfig.industryColumnId,
                        enableIndustryPerf: sourceConfig.enableIndustryPerf,
                        enableConversion: sourceConfig.enableConversion,
                        enableAvgDealSize: sourceConfig.enableAvgDealSize,
                        enableHotStreak: sourceConfig.enableHotStreak,
                        enableResponseSpeed: sourceConfig.enableResponseSpeed,
                        enableBurnout: sourceConfig.enableBurnout,
                        enableAvailabilityCap: sourceConfig.enableAvailabilityCap
                    }
                });
            }
        }

        // 3. Trigger Profile Recompute for all orgs with boards
        console.log('\n--- Triggering Profile Recompute ---');
        const activeConfigs = await prisma.metricsConfig.findMany({
            where: { leadBoardIds: { not: "" } }
        });

        const apiKey = process.env.ROUTING_API_KEY || 'dev_key_123';
        const port = process.env.PORT || 3000;

        for (const config of activeConfigs) {
            console.log(`🚀 Triggering for Org ${config.orgId}...`);
            try {
                const res = await fetch(`http://localhost:${port}/agents/profiles/recompute`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify({ orgId: config.orgId })
                });
                const json = (await res.json()) as any;
                if (res.ok) {
                    console.log(`   ✅ Success: ${json.message}`);
                } else {
                    console.error(`   ❌ Failed: ${json.error || json.message}`);
                }
            } catch (err) {
                console.error(`   ❌ Request failed: ${(err as Error).message}`);
            }
        }

        console.log('\n✨ Config Sync Complete.');

    } catch (err) {
        console.error('❌ Unexpected error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
