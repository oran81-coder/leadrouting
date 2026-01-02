
import { calculateAllAgentProfiles } from '../packages/modules/agent-profiling/src/application/agentProfiler';

async function main() {
    const orgId = "cmjt563ps000037hg6i4dvl7m";
    console.log(`--- Testing Agent Profiler Directly for Org ${orgId} ---`);
    try {
        const profiles = await calculateAllAgentProfiles(orgId);
        console.log(`Result: ${profiles.length} profiles computed.`);
        if (profiles.length > 0) {
            console.log('Sample Profile:', JSON.stringify(profiles[0], null, 2));
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
main();
