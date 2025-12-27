/**
 * Populate Monday Users Cache with mock data for development
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function populateMondayUsers() {
  const ORG_ID = "org_1";

  console.log("[populate-monday-users] Checking existing users...");

  const existingUsers = await prisma.mondayUserCache.findMany({
    where: { orgId: ORG_ID },
  });

  console.log(`[populate-monday-users] Found ${existingUsers.length} existing users`);

  if (existingUsers.length === 0) {
    console.log("[populate-monday-users] Creating mock users...");

    const mockUsers = [
      { userId: "agent_1", name: "Oran Chen", email: "oran@example.com" },
      { userId: "agent_2", name: "Jane Doe", email: "jane@example.com" },
      { userId: "agent_3", name: "John Smith", email: "john@example.com" },
      { userId: "agent_4", name: "Sarah Williams", email: "sarah@example.com" },
      { userId: "agent_5", name: "Mike Johnson", email: "mike@example.com" },
    ];

    await prisma.mondayUserCache.createMany({
      data: mockUsers.map((u) => ({
        orgId: ORG_ID,
        ...u,
      })),
    });

    console.log(`[populate-monday-users] ✅ Created ${mockUsers.length} mock users`);
  } else {
    console.log("[populate-monday-users] Users already exist:");
    for (const user of existingUsers) {
      console.log(`  - ${user.name} (${user.userId})`);
    }
  }

  console.log("[populate-monday-users] Done!");
  await prisma.$disconnect();
}

populateMondayUsers().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

