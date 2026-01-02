
import { calculateAgentProfile } from './packages/modules/agent-profiling/src/application/agentProfiler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Connecting to database...");
    const agents = await prisma.agentProfile.findMany({ take: 1 });

    if (agents.length === 0) {
        console.log("No agents found to test.");
        return;
    }

    const agent = agents[0];
    console.log(`Found agent: ${agent.agentName || agent.agentUserId}`);

    // Force a recalculation to verify logical fixes
    // We can't easily see the weights used inside calculateAgentProfile, 
    // but we can fetch the config to show what SHOULD be used.
    const config = await prisma.metricsConfig.findFirst({ where: { orgId: agent.orgId } });
    console.log("\n--- Active KPI Weights (from DB) ---");
    if (config) {
        console.log(`Domain Expertise: ${config.weightDomainExpertise}%`);
        console.log(`Availability: ${config.weightAvailability}%`);
        console.log(`Historical Conv: ${config.weightConversionHistorical}%`);
        console.log(`Recent Perf: ${config.weightRecentPerformance}%`);
        console.log(`Avg Deal Size: ${config.weightAvgDealSize}%`);
        console.log(`Response Time: ${config.weightResponseTime}%`);
        console.log(`Time to Close: ${config.weightAvgTimeToClose}%`);
        console.log(`Hot Streak: ${config.weightHotAgent}%`);
    } else {
        console.log("No config found, using defaults.");
    }

    console.log("\nRunning calculation...");
    try {
        const profile = await calculateAgentProfile(agent.agentUserId, agent.orgId);

        console.log("\n--- Verification Results ---");
        console.log(`Avg Deal Size: $${profile.avgDealSize?.toLocaleString() ?? 'N/A'}`);
        console.log(`Avg Time To Close: ${profile.avgTimeToClose ? (profile.avgTimeToClose / 3600).toFixed(1) + ' hours' : 'N/A'} (NEW FIELD)`);
        console.log(`Industry Scores (Domain Expertise): ${JSON.stringify(profile.industryScores)}`);

        if (Object.keys(profile.industryScores).length > 0) {
            console.log("✅ SUCCESS: Domain expertise is now populating (threshold lowered).");
        } else {
            console.log("⚠️ NOTICE: Domain expertise still empty. Ensure agent has at least 1 closed deal with an industry set.");
        }

        if (profile.avgTimeToClose !== undefined) {
            console.log("✅ SUCCESS: avgTimeToClose field exists and calculated.");
        }

    } catch (error) {
        console.error("Error calculating profile:", error);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
