import { getPrisma } from "../packages/core/src/db/prisma";

async function main() {
  const prisma = getPrisma();
  
  // Check all MondayUserCache records
  const users = await prisma.mondayUserCache.findMany({
    select: {
      orgId: true,
      userId: true,
      name: true,
      email: true,
    },
  });
  
  console.log(`\n📊 MondayUserCache Records: ${users.length}\n`);
  
  if (users.length === 0) {
    console.log("❌ No users found in cache!");
  } else {
    users.forEach((u, i) => {
      console.log(`${i + 1}. User ${u.userId}`);
      console.log(`   OrgId: ${u.orgId}`);
      console.log(`   Name: ${u.name}`);
      console.log(`   Email: ${u.email}\n`);
    });
  }
  
  // Check LeadFact to see which userIds are referenced
  const facts = await prisma.leadFact.findMany({
    where: {
      assignedUserId: { not: null },
    },
    select: {
      orgId: true,
      assignedUserId: true,
    },
    distinct: ["assignedUserId"],
  });
  
  console.log(`\n📋 Unique Agent IDs in LeadFact: ${facts.length}\n`);
  
  facts.forEach((f, i) => {
    console.log(`${i + 1}. AgentId: ${f.assignedUserId}`);
    console.log(`   OrgId: ${f.orgId}\n`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);

