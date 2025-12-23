import { getPrisma } from "../packages/core/src/db/prisma";

const ORG_ID = "org_1";

async function seedDemoData() {
  const prisma = getPrisma();

  console.log("🌱 Starting demo data seed...");

  // 1. Add users to cache
  const users = [
    { userId: "user_001", name: "David Cohen", email: "david@example.com" },
    { userId: "user_002", name: "Sarah Levi", email: "sarah@example.com" },
    { userId: "user_003", name: "Michael Israeli", email: "michael@example.com" },
    { userId: "user_004", name: "Rachel Mizrahi", email: "rachel@example.com" },
    { userId: "user_005", name: "Yossi Katz", email: "yossi@example.com" },
    { userId: "user_006", name: "Tal Peretz", email: "tal@example.com" },
    { userId: "user_007", name: "Maya Ben David", email: "maya@example.com" },
    { userId: "user_008", name: "Avi Goldstein", email: "avi@example.com" },
  ];

  console.log("📝 Adding users to cache...");
  for (const user of users) {
    await prisma.mondayUserCache.upsert({
      where: { orgId_userId: { orgId: ORG_ID, userId: user.userId } },
      update: { name: user.name, email: user.email },
      create: { orgId: ORG_ID, ...user },
    });
  }
  console.log(`✅ Added ${users.length} users`);

  // 2. Add lead facts
  const now = new Date();
  const leads = [
    // David Cohen - 5 deals
    { itemId: "lead_001", userId: "user_001", daysAgo: 55, closeDaysAgo: 50, amount: 8500, industry: "Technology" },
    { itemId: "lead_002", userId: "user_001", daysAgo: 45, closeDaysAgo: 38, amount: 12000, industry: "Finance" },
    { itemId: "lead_003", userId: "user_001", daysAgo: 30, closeDaysAgo: 22, amount: 6500, industry: "Retail" },
    { itemId: "lead_004", userId: "user_001", daysAgo: 20, closeDaysAgo: 15, amount: 9200, industry: "Technology" },
    { itemId: "lead_005", userId: "user_001", daysAgo: 10, closeDaysAgo: 5, amount: 7800, industry: "Healthcare" },

    // Sarah Levi - 4 deals
    { itemId: "lead_006", userId: "user_002", daysAgo: 48, closeDaysAgo: 42, amount: 15000, industry: "Finance" },
    { itemId: "lead_007", userId: "user_002", daysAgo: 35, closeDaysAgo: 28, amount: 11500, industry: "Technology" },
    { itemId: "lead_008", userId: "user_002", daysAgo: 25, closeDaysAgo: 18, amount: 13200, industry: "Real Estate" },
    { itemId: "lead_009", userId: "user_002", daysAgo: 12, closeDaysAgo: 7, amount: 9800, industry: "Finance" },

    // Michael Israeli - 3 deals
    { itemId: "lead_010", userId: "user_003", daysAgo: 50, closeDaysAgo: 44, amount: 5500, industry: "Retail" },
    { itemId: "lead_011", userId: "user_003", daysAgo: 32, closeDaysAgo: 25, amount: 7200, industry: "Healthcare" },
    { itemId: "lead_012", userId: "user_003", daysAgo: 18, closeDaysAgo: 12, amount: 6800, industry: "Technology" },

    // Rachel Mizrahi - 4 deals
    { itemId: "lead_013", userId: "user_004", daysAgo: 52, closeDaysAgo: 46, amount: 10500, industry: "Finance" },
    { itemId: "lead_014", userId: "user_004", daysAgo: 40, closeDaysAgo: 33, amount: 8900, industry: "Technology" },
    { itemId: "lead_015", userId: "user_004", daysAgo: 28, closeDaysAgo: 20, amount: 12800, industry: "Real Estate" },
    { itemId: "lead_016", userId: "user_004", daysAgo: 15, closeDaysAgo: 9, amount: 7600, industry: "Retail" },

    // Yossi Katz - 3 deals
    { itemId: "lead_017", userId: "user_005", daysAgo: 47, closeDaysAgo: 40, amount: 4200, industry: "Retail" },
    { itemId: "lead_018", userId: "user_005", daysAgo: 33, closeDaysAgo: 26, amount: 5800, industry: "Healthcare" },
    { itemId: "lead_019", userId: "user_005", daysAgo: 22, closeDaysAgo: 16, amount: 6200, industry: "Technology" },

    // Tal Peretz - 3 deals
    { itemId: "lead_020", userId: "user_006", daysAgo: 44, closeDaysAgo: 37, amount: 9500, industry: "Finance" },
    { itemId: "lead_021", userId: "user_006", daysAgo: 29, closeDaysAgo: 21, amount: 11200, industry: "Technology" },
    { itemId: "lead_022", userId: "user_006", daysAgo: 14, closeDaysAgo: 8, amount: 8700, industry: "Real Estate" },

    // Maya Ben David - 2 deals
    { itemId: "lead_023", userId: "user_007", daysAgo: 38, closeDaysAgo: 30, amount: 14500, industry: "Finance" },
    { itemId: "lead_024", userId: "user_007", daysAgo: 19, closeDaysAgo: 11, amount: 13800, industry: "Technology" },

    // Avi Goldstein - 2 deals
    { itemId: "lead_025", userId: "user_008", daysAgo: 41, closeDaysAgo: 34, amount: 3800, industry: "Retail" },
    { itemId: "lead_026", userId: "user_008", daysAgo: 24, closeDaysAgo: 17, amount: 4500, industry: "Healthcare" },
  ];

  console.log("💰 Adding lead facts...");
  for (const lead of leads) {
    const enteredAt = new Date(now.getTime() - lead.daysAgo * 24 * 60 * 60 * 1000);
    const closedWonAt = new Date(now.getTime() - lead.closeDaysAgo * 24 * 60 * 60 * 1000);

    await prisma.leadFact.upsert({
      where: {
        orgId_boardId_itemId: {
          orgId: ORG_ID,
          boardId: "board_main",
          itemId: lead.itemId,
        },
      },
      update: {
        assignedUserId: lead.userId,
        enteredAt,
        closedWonAt,
        dealAmount: lead.amount,
        industry: lead.industry,
      },
      create: {
        orgId: ORG_ID,
        boardId: "board_main",
        itemId: lead.itemId,
        assignedUserId: lead.userId,
        enteredAt,
        closedWonAt,
        dealAmount: lead.amount,
        industry: lead.industry,
      },
    });
  }
  console.log(`✅ Added ${leads.length} lead facts`);

  // 3. Calculate and display summary
  const totalRevenue = leads.reduce((sum, lead) => sum + lead.amount, 0);
  const avgDeal = totalRevenue / leads.length;

  console.log("\n📊 Demo Data Summary:");
  console.log(`   👥 Agents: ${users.length}`);
  console.log(`   💼 Deals: ${leads.length}`);
  console.log(`   💰 Total Revenue: $${totalRevenue.toLocaleString()}`);
  console.log(`   📈 Avg Deal: $${Math.round(avgDeal).toLocaleString()}`);
  console.log(`   ✅ Conversion Rate: 100% (all closed/won)`);
  console.log(`   📅 Date Range: Last 60 days`);

  console.log("\n🎉 Demo data seed completed successfully!");
  console.log("🔄 Refresh your Outcomes screen to see the data!");
}

seedDemoData()
  .then(() => {
    console.log("✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error seeding demo data:", error);
    process.exit(1);
  });

