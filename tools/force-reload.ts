
import { loadInitial500Leads } from '../apps/api/src/services/initialDataLoader';
import { triggerProfileRecompute } from '../apps/api/src/services/initialDataLoader';

async function main() {
    const orgId = "cmjt563ps000037hg6i4dvl7m"; // The one with data
    console.log(`--- Forcing Data Reload for Org ${orgId} ---`);

    try {
        const result = await loadInitial500Leads(orgId);
        console.log('Load Result:', result);

        if (result.success) {
            console.log('Triggering profile recompute...');
            await triggerProfileRecompute(orgId);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
