/**
 * Script to update old proposals with mock new-format explainability
 * This helps test the new UI without waiting for real routing events
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateOldProposals() {

  console.log("[update-old-proposals] Finding old proposals with simple string explanations...");

  const proposals = await prisma.routingProposal.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  console.log(`[update-old-proposals] Found ${proposals.length} proposals`);

  for (const proposal of proposals) {
    // Create mock new-format explainability with all 8 metrics
    const mockExplainability = {
      summary: `✨ Best match based on industry expertise and availability. ${proposal.suggestedAssigneeName || 'This agent'} has strong performance in this domain with high availability.`,
      recommendedAgent: {
        agentUserId: proposal.suggestedAssigneeRaw || "agent_123",
        agentName: proposal.suggestedAssigneeName || "Top Agent",
        score: proposal.matchScore || 85,
        rank: 1,
        confidence: "high",
        summary: "Strong domain expertise with excellent availability and recent performance",
        primaryReasons: [
          "🎯 Industry expertise: 92/100",
          "⚡ High availability: 8/10 slots free",
          "📈 Recent hot streak: 5 deals in 7 days"
        ],
        secondaryReasons: [
          "Fast response time: avg 2.3 hours",
          "Strong conversion rate: 35%"
        ]
      },
      alternatives: [
        {
          agentUserId: "agent_alt_1",
          agentName: "Second Best Agent",
          score: 78,
          rank: 2,
          summary: "Good performance but slightly lower availability",
        },
        {
          agentUserId: "agent_alt_2",
          agentName: "Third Choice Agent",
          score: 72,
          rank: 3,
          summary: "Solid performer with moderate workload",
        }
      ],
      breakdown: {
        industryMatch: 92,
        availability: 80,
        conversionRate: 75,
        hotStreak: 85,
        responseSpeed: 65,
        dealSize: 70,
        burnout: 82,
        recentPerformance: 78
      }
    };

    await prisma.routingProposal.update({
      where: { id: proposal.id },
      data: {
        explainability: JSON.stringify(mockExplainability),
      },
    });

    console.log(`[update-old-proposals] ✅ Updated proposal ${proposal.id}`);
  }

  console.log("[update-old-proposals] Done!");
}

updateOldProposals()
  .catch((err) => {
    console.error("[update-old-proposals] Error:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

