/**
 * Seed script for Agent Profiles - Test Data
 * 
 * Creates sample agent profiles for testing the Agent Profiling API
 * 
 * Run: npx tsx prisma/seed-agents.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Agent Profiles...");

  const ORG_ID = "org_1";

  // Sample agents with realistic performance data
  const agents = [
    {
      agentUserId: "agent_sarah_001",
      agentName: "Sarah Johnson",
      conversionRate: 0.42, // 42%
      totalLeadsHandled: 85,
      totalLeadsConverted: 36,
      avgDealSize: 15000,
      totalRevenue: 540000,
      avgResponseTime: 1200, // 20 minutes
      availability: 0.75,
      currentActiveLeads: 12,
      dailyLeadsToday: 3,
      hotStreakCount: 5,
      hotStreakActive: true,
      burnoutScore: 15,
      timeSinceLastWin: BigInt(3600000 * 12), // 12 hours
      timeSinceLastActivity: BigInt(3600000 * 2), // 2 hours
      industryScores: JSON.stringify({ "SaaS": 92, "FinTech": 78, "Healthcare": 65 }),
      dataWindowDays: 90,
    },
    {
      agentUserId: "agent_mike_002",
      agentName: "Mike Chen",
      conversionRate: 0.35, // 35%
      totalLeadsHandled: 120,
      totalLeadsConverted: 42,
      avgDealSize: 22000,
      totalRevenue: 924000,
      avgResponseTime: 1800, // 30 minutes
      availability: 0.85,
      currentActiveLeads: 8,
      dailyLeadsToday: 2,
      hotStreakCount: 3,
      hotStreakActive: false,
      burnoutScore: 25,
      timeSinceLastWin: BigInt(3600000 * 48), // 48 hours
      timeSinceLastActivity: BigInt(3600000 * 4), // 4 hours
      industryScores: JSON.stringify({ "E-commerce": 88, "Retail": 82, "Manufacturing": 70 }),
      dataWindowDays: 90,
    },
    {
      agentUserId: "agent_emma_003",
      agentName: "Emma Williams",
      conversionRate: 0.55, // 55% - top performer
      totalLeadsHandled: 65,
      totalLeadsConverted: 36,
      avgDealSize: 18000,
      totalRevenue: 648000,
      avgResponseTime: 600, // 10 minutes - very fast
      availability: 0.95,
      currentActiveLeads: 5,
      dailyLeadsToday: 1,
      hotStreakCount: 8,
      hotStreakActive: true,
      burnoutScore: 5, // Low burnout
      timeSinceLastWin: BigInt(3600000 * 6), // 6 hours
      timeSinceLastActivity: BigInt(3600000 * 1), // 1 hour
      industryScores: JSON.stringify({ "SaaS": 95, "EdTech": 90, "Media": 85 }),
      dataWindowDays: 90,
    },
    {
      agentUserId: "agent_david_004",
      agentName: "David Martinez",
      conversionRate: 0.28, // 28%
      totalLeadsHandled: 95,
      totalLeadsConverted: 27,
      avgDealSize: 12000,
      totalRevenue: 324000,
      avgResponseTime: 2400, // 40 minutes
      availability: 0.60,
      currentActiveLeads: 18,
      dailyLeadsToday: 5,
      hotStreakCount: 1,
      hotStreakActive: false,
      burnoutScore: 45, // High burnout warning
      timeSinceLastWin: BigInt(3600000 * 96), // 96 hours (4 days)
      timeSinceLastActivity: BigInt(3600000 * 8), // 8 hours
      industryScores: JSON.stringify({ "Real Estate": 75, "Construction": 68, "Hospitality": 60 }),
      dataWindowDays: 90,
    },
    {
      agentUserId: "agent_lisa_005",
      agentName: "Lisa Anderson",
      conversionRate: 0.48, // 48%
      totalLeadsHandled: 78,
      totalLeadsConverted: 37,
      avgDealSize: 25000,
      totalRevenue: 925000,
      avgResponseTime: 900, // 15 minutes
      availability: 0.80,
      currentActiveLeads: 10,
      dailyLeadsToday: 2,
      hotStreakCount: 6,
      hotStreakActive: true,
      burnoutScore: 20,
      timeSinceLastWin: BigInt(3600000 * 18), // 18 hours
      timeSinceLastActivity: BigInt(3600000 * 3), // 3 hours
      industryScores: JSON.stringify({ "FinTech": 94, "Insurance": 86, "Banking": 80 }),
      dataWindowDays: 90,
    },
  ];

  // Upsert agents (create or update if exists)
  for (const agent of agents) {
    const result = await prisma.agentProfile.upsert({
      where: {
        orgId_agentUserId: {
          orgId: ORG_ID,
          agentUserId: agent.agentUserId,
        },
      },
      update: agent,
      create: {
        orgId: ORG_ID,
        ...agent,
      },
    });
    console.log(`✓ Created/Updated agent: ${agent.agentName} (${agent.agentUserId})`);
  }

  console.log(`\n✅ Successfully seeded ${agents.length} agent profiles!`);
  console.log("\nAgent Summary:");
  console.log("─".repeat(80));
  agents.forEach((a) => {
    console.log(
      `${a.agentName.padEnd(20)} | Conv: ${(a.conversionRate * 100).toFixed(0)}% | ` +
      `Avail: ${(a.availability * 100).toFixed(0)}% | Hot: ${a.hotStreakActive ? "🔥" : "❄️"} | ` +
      `Burnout: ${a.burnoutScore}`
    );
  });
  console.log("─".repeat(80));
}

main()
  .catch((e) => {
    console.error("❌ Error seeding agents:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

