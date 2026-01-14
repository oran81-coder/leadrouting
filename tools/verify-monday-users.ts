
import { createMondayClientForOrg } from "../apps/api/src/services/monday.orgClient";
import { PrismaMondayUserCacheRepo } from "../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";
import { getPrisma } from "../packages/core/src/db/prisma";

const ORG_ID = "cmjt563ps000037hg6i4dvl7m";

async function main() {
    const client = await createMondayClientForOrg(ORG_ID);
    if (!client) {
        console.error("Could not create Monday client.");
        return;
    }

    console.log("Fetching users from Monday API...");
    const users = await (client as any).fetchUsers();
    console.log(`Found ${users.length} users in Monday API.`);

    const targetId = "97865279";
    const target = users.find((u: any) => String(u.id) === targetId);

    if (target) {
        console.log("✅ Target user found in Monday API:");
        console.log(JSON.stringify(target, null, 2));
    } else {
        console.log("❌ Target user NOT found in Monday API.");
        console.log("Showing first 10 users:");
        console.log(JSON.stringify(users.slice(0, 10), null, 2));
    }

    // Also check local DB
    const repo = new PrismaMondayUserCacheRepo();
    const cached = await repo.getByUserId(ORG_ID, targetId);
    console.log("\nLocal Cache Status:");
    if (cached) {
        console.log("✅ User found in local cache:");
        console.log(JSON.stringify(cached, null, 2));
    } else {
        console.log("❌ User NOT found in local cache.");
    }
}

main()
    .catch(console.error)
    .finally(() => getPrisma().$disconnect());
