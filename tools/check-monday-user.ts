
import { PrismaMondayUserCacheRepo } from "../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";
import { getPrisma } from "../packages/core/src/db/prisma";

const ORG_ID = process.env.DEFAULT_ORG_ID || "cmjt563ps000037hg6i4dvl7m";
const USER_ID = "97865279"; // The ID from the user report

async function main() {
    const repo = new PrismaMondayUserCacheRepo();
    const user = await repo.getByUserId(ORG_ID, USER_ID);

    console.log("Checking Monday User Cache for ID:", USER_ID);
    if (user) {
        console.log("Found user:");
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log("User NOT found in cache.");
    }
}

main()
    .catch(console.error)
    .finally(() => getPrisma().$disconnect());
