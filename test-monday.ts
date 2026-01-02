import { createMondayClientForOrg } from './packages/modules/monday-integration/src/application/monday.orgClient';

async function main() {
    const ORG_ID = "cmjt563ps000037hg6i4dvl7m";
    console.log(`Testing Monday client for Org: ${ORG_ID}`);

    const client = await createMondayClientForOrg(ORG_ID);
    if (!client) {
        console.error("❌ Failed to create Monday client - no credentials found");
        return;
    }

    try {
        const boardIds = ["18393182279"];
        console.log(`Fetching items for boards: ${boardIds.join(', ')}`);
        const samples = await (client as any).fetchBoardSamples(boardIds, 10);
        console.log(`✅ Success! Fetched ${samples?.length || 0} boards.`);
        if (samples && samples.length > 0) {
            console.log(`Board ID: ${samples[0].boardId}, Items count: ${samples[0].items?.length || 0}`);
            if (samples[0].items?.length > 0) {
                console.log(`Newest item: ${samples[0].items[0].name} (ID: ${samples[0].items[0].id})`);
            }
        }
    } catch (err) {
        console.error("❌ Failed to fetch from Monday:", err);
    }
}

main().catch(console.error);
