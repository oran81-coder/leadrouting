import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();

    const profiles = await prisma.agentProfile.findMany({
        take: 5
    });

    console.log(`Checking ${profiles.length} agent profiles for Metric Data Availability:`);
    console.log('----------------------------------------------------------------');

    profiles.forEach(p => {
        console.log(`Agent: ${p.agentName} (${p.agentUserId})`);

        // 1. Availability / Workload
        console.log(`  [x] Workload/Avail: ${p.availability} (Active Leads: ${p.currentActiveLeads})`);

        // 2. Industry Match
        const industries = p.industryScores ? Object.keys(p.industryScores).length : 0;
        console.log(`  [${industries > 0 ? 'x' : ' '}] Industry Match: ${industries} industries recorded`);
        if (industries > 0) console.log(`      Example: ${JSON.stringify(p.industryScores)}`);

        // 3. Historical Conversion
        console.log(`  [${p.conversionRate !== null ? 'x' : ' '}] Conversion: ${p.conversionRate} (Converted: ${p.totalLeadsConverted}/${p.totalLeadsHandled})`);

        // 4. Recent Performance (currently uses conversion)
        // 5. Response Time
        console.log(`  [${p.avgResponseTime ? 'x' : ' '}] Response Time: ${p.avgResponseTime}s`);

        // 6. Time to Close
        console.log(`  [${p.avgTimeToClose ? 'x' : ' '}] Time to Close: ${p.avgTimeToClose}s`);

        // 7. Avg Deal Size
        console.log(`  [${p.avgDealSize ? 'x' : ' '}] Avg Deal Size: $${p.avgDealSize}`);

        // 8. Hot Streak
        console.log(`  [x] Hot Streak: Active=${p.hotStreakActive}, Count=${p.hotStreakCount}`);

        console.log('---');
    });

    await prisma.$disconnect();
}

main().catch(console.error);
