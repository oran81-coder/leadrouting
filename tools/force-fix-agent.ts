
import { PrismaClient } from "@prisma/client";
import { createMondayClientForOrg } from "../packages/modules/monday-integration/src/application/monday.orgClient";
import { refreshMondayUsersCache } from "../packages/modules/monday-integration/src/application/monday.people";
import { calculateAllAgentProfiles } from "../packages/modules/agent-profiling/src/application/agentProfiler";
import { PrismaAgentProfileRepo } from "../apps/api/src/infrastructure/agentProfile.repo";
import { PrismaMondayUserCacheRepo } from "../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";

const prisma = new PrismaClient();
const ORG_ID = "cmjt563ps000037hg6i4dvl7m";
const TARGET_AGENT_ID = "97865279";

async function main() {
    console.log(`--- Force Fix Agent Names for Org: ${ORG_ID} ---`);

    // 1. Check current cache
    const userCacheRepo = new PrismaMondayUserCacheRepo();
    const cachedBefore = await userCacheRepo.getByUserId(ORG_ID, TARGET_AGENT_ID);
    console.log(`Current cache for ${TARGET_AGENT_ID}:`, cachedBefore ? cachedBefore.name : "MISSING");

    // 2. Force Refresh User Cache from Monday API
    console.log("Step 1: Refreshing Monday User Cache...");
    const client = await createMondayClientForOrg(ORG_ID);
    if (!client) {
        throw new Error("Could not create Monday client. Check credentials.");
    }
    const count = await refreshMondayUsersCache(client, ORG_ID);
    console.log(`✅ Cache refreshed. Fetched ${count} users.`);

    // 3. Verify target agent is now in cache
    const cachedAfter = await userCacheRepo.getByUserId(ORG_ID, TARGET_AGENT_ID);
    if (cachedAfter) {
        console.log(`✅ Target agent resolved: ${cachedAfter.name} (${cachedAfter.email})`);
    } else {
        console.warn(`⚠️ Target agent ${TARGET_AGENT_ID} NOT found in Monday users list after refresh.`);
    }

    // 4. Recompute Agent Profiles
    console.log("Step 2: Recomputing all agent profiles...");
    const profiles = await calculateAllAgentProfiles(ORG_ID);
    const profileRepo = new PrismaAgentProfileRepo();

    for (const p of profiles) {
        await profileRepo.upsert(p);
    }
    console.log(`✅ Recomputed ${profiles.length} agent profiles.`);

    // 5. Final Check
    const finalProfile = await profileRepo.get(ORG_ID, TARGET_AGENT_ID);
    console.log(`Final Profile Name for ${TARGET_AGENT_ID}:`, finalProfile ? finalProfile.agentName : "NOT FOUND");

    console.log("\n--- Done! Please refresh the dashboard. ---");
}

main()
    .catch((err) => {
        console.error("❌ Error:", err.message);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
