
import { PrismaMondayUserCacheRepo } from "../packages/modules/monday-integration/src/infrastructure/mondayUserCache.repo";
import { getPrisma } from "../packages/core/src/db/prisma";
import * as fs from "fs";

const ORG_ID = "cmjt563ps000037hg6i4dvl7m";

async function main() {
    const repo = new PrismaMondayUserCacheRepo();
    const users = await repo.list(ORG_ID);

    let output = `Debug Cache Report - ${new Date().toISOString()}\n`;
    output += `Org ID: ${ORG_ID}\n`;
    output += `Total users in cache: ${users.length}\n\n`;

    const targetId = "97865279";
    const target = users.find(u => u.userId === targetId);

    if (target) {
        output += `✅ Target user ${targetId} FOUND:\n`;
        output += JSON.stringify(target, null, 2) + "\n";
    } else {
        output += `❌ Target user ${targetId} NOT found in cache.\n`;
    }

    output += "\nAll users in cache:\n";
    output += users.map(u => `${u.userId}: ${u.name} (${u.email})`).join("\n");

    fs.writeFileSync("cache-debug-report.txt", output);
    console.log("Report written to cache-debug-report.txt");
}

main()
    .catch(err => {
        fs.writeFileSync("cache-debug-report.txt", "ERROR: " + err.message);
    })
    .finally(() => getPrisma().$disconnect());
