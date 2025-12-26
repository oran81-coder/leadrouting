import { getPrisma } from "./packages/core/src/db/prisma";
import { logger } from "./packages/core/src/shared/logger";

const ORG_ID = "org_1";

async function checkLeadFacts() {
  const prisma = getPrisma();

  try {
    logger.info("🔍 Checking LeadFacts for Median Time to Close");
    logger.info("============================================================");

    // Get all closed won leads
    const closedLeads = await prisma.leadFact.findMany({
      where: {
        orgId: ORG_ID,
        closedWonAt: { not: null },
      },
      select: {
        itemId: true,
        assignedUserId: true,
        enteredAt: true,
        closedWonAt: true,
        dealAmount: true,
      },
      orderBy: { closedWonAt: "desc" },
    });

    logger.info(`\n✅ Found ${closedLeads.length} closed won leads:\n`);

    for (const lead of closedLeads) {
      const enteredAt = lead.enteredAt;
      const closedWonAt = lead.closedWonAt;
      
      let daysToClose: number | null = null;
      if (enteredAt && closedWonAt) {
        const diff = closedWonAt.getTime() - enteredAt.getTime();
        daysToClose = diff / (1000 * 60 * 60 * 24);
      }

      logger.info(`  📋 Item: ${lead.itemId}`);
      logger.info(`     Agent: ${lead.assignedUserId || "N/A"}`);
      logger.info(`     Entered: ${enteredAt?.toISOString() || "N/A"}`);
      logger.info(`     Closed: ${closedWonAt?.toISOString() || "N/A"}`);
      logger.info(`     Days to Close: ${daysToClose !== null ? daysToClose.toFixed(2) : "N/A"}`);
      logger.info(`     Deal Amount: $${lead.dealAmount || 0}`);
      logger.info("");
    }

    // Calculate median
    const times = closedLeads
      .map((lead) => {
        if (!lead.enteredAt || !lead.closedWonAt) return null;
        const diff = lead.closedWonAt.getTime() - lead.enteredAt.getTime();
        return diff / (1000 * 60 * 60 * 24);
      })
      .filter((d): d is number => d !== null && Number.isFinite(d) && d >= 0);

    if (times.length > 0) {
      times.sort((a, b) => a - b);
      const mid = Math.floor(times.length / 2);
      const median =
        times.length % 2 === 0
          ? (times[mid - 1] + times[mid]) / 2
          : times[mid];
      
      logger.info("============================================================");
      logger.info(`\n📊 MEDIAN TIME TO CLOSE: ${median.toFixed(2)} days\n`);
      logger.info(`   Min: ${Math.min(...times).toFixed(2)} days`);
      logger.info(`   Max: ${Math.max(...times).toFixed(2)} days`);
      logger.info(`   Average: ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)} days`);
    } else {
      logger.info("\n⚠️  No valid time-to-close data found");
    }

  } catch (error: any) {
    logger.error(`❌ Error: ${error.message}`, { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeadFacts();

