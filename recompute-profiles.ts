
import { calculateAllAgentProfiles } from './packages/modules/agent-profiling/src/application/agentProfiler';
import { PrismaAgentProfileRepo } from './apps/api/src/infrastructure/agentProfile.repo';
import { getPrisma } from './packages/core/src/db/prisma';

async function main() {
    const orgId = process.env.DEFAULT_ORG_ID || "cmjt563ps000037hg6i4dvl7m";
    const profileRepo = new PrismaAgentProfileRepo();

    console.log(`--- Starting Full Profile Recompute for Org ${orgId} ---`);

    try {
        // Calculate all profiles using fixed logic
        const profiles = await calculateAllAgentProfiles(orgId);

        console.log(`Calculated ${profiles.length} profiles. Saving to database...`);

        // Save to database using fixed repository mapping
        for (const profile of profiles) {
            console.log(`   Upserting ${profile.agentName || profile.agentUserId}...`);
            await profileRepo.upsert(profile);

            if (profile.agentUserId === '97865279') {
                console.log('      Ray Chen Check:', {
                    avgTimeToClose: profile.avgTimeToClose,
                    totalLeadsConverted: profile.totalLeadsConverted
                });
            }
        }

        console.log('--- Recompute Complete ---');
    } catch (err) {
        console.error('Error during recompute:', err);
    } finally {
        const prisma = getPrisma();
        await prisma.$disconnect();
    }
}

main().catch(console.error);
