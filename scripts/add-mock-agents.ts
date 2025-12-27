/**
 * Add more mock agents to Monday Users Cache
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addMoreAgents() {
  const ORG_ID = "org_1";

  console.log("[add-agents] Adding more agents...");

  const newAgents = [
    { userId: "agent_2", name: "Jane Doe", email: "jane@example.com" },
    { userId: "agent_3", name: "John Smith", email: "john@example.com" },
    { userId: "agent_4", name: "Sarah Williams", email: "sarah@example.com" },
    { userId: "agent_5", name: "Mike Johnson", email: "mike@example.com" },
  ];

  for (const agent of newAgents) {
    const existing = await prisma.mondayUserCache.findFirst({
      where: { orgId: ORG_ID, userId: agent.userId },
    });

    if (!existing) {
      await prisma.mondayUserCache.create({
        data: {
          orgId: ORG_ID,
          ...agent,
        },
      });
      console.log(`  ✅ Created ${agent.name} (${agent.userId})`);
    } else {
      console.log(`  ⏭️  ${agent.name} (${agent.userId}) already exists`);
    }
  }

  console.log("\n[add-agents] Current agents:");
  const allAgents = await prisma.mondayUserCache.findMany({
    where: { orgId: ORG_ID },
  });
  for (const agent of allAgents) {
    console.log(`  - ${agent.name} (${agent.userId})`);
  }

  console.log("\n[add-agents] Done!");
  await prisma.$disconnect();
}

addMoreAgents().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

