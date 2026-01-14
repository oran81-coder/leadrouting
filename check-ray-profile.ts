import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const prisma = getPrisma();
    const agentUserId = '97865279'; // Ray Chen

    const profile = await prisma.agentProfile.findFirst({
        where: { agentUserId }
    });

    if (!profile) {
        console.log('Profile not found for Ray Chen');
        return;
    }

    console.log('Ray Chen Profile:');
    console.log({
        agentName: profile.agentName,
        totalLeadsConverted: profile.totalLeadsConverted,
        avgTimeToClose: profile.avgTimeToClose,
        avgResponseTime: profile.avgResponseTime,
        totalLeadsHandled: profile.totalLeadsHandled,
        computedAt: profile.computedAt
    });

    await prisma.$disconnect();
}

main().catch(console.error);
