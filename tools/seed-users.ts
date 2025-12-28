/**
 * Seed Demo Users for Testing
 * 
 * Creates demo users for testing the login system:
 * - admin@org1.com (Organization 1 Admin)
 * - manager@org1.com (Organization 1 Manager)
 * - agent@org1.com (Organization 1 Agent)
 * - super@admin.com (Super Admin - no org)
 * 
 * Usage:
 *   npm run seed:users
 *   # or
 *   ts-node -r tsconfig-paths/register tools/seed-users.ts
 */

import { getPrisma } from "../packages/core/src/db/prisma";
import bcrypt from "bcryptjs";

const prisma = getPrisma();

async function main() {
  console.log("🌱 Seeding demo users...\n");

  // Ensure org_1 exists
  const org1 = await prisma.organization.upsert({
    where: { id: "org_1" },
    create: {
      id: "org_1",
      name: "org_1",
      displayName: "Demo Organization 1",
      email: "contact@org1.com",
      tier: "standard",
      isActive: true,
      subscriptionStatus: "active",
    },
    update: {},
  });
  console.log(`✅ Organization: ${org1.displayName} (${org1.id})`);

  // Common password: "password123"
  const passwordHash = await bcrypt.hash("password123", 10);

  // Create demo users
  const users = [
    {
      id: "user_admin_1",
      email: "admin@org1.com",
      username: "admin",
      passwordHash,
      role: "admin",
      firstName: "Alice",
      lastName: "Admin",
      orgId: org1.id,
      isActive: true,
    },
    {
      id: "user_manager_1",
      email: "manager@org1.com",
      username: "manager",
      passwordHash,
      role: "manager",
      firstName: "Mike",
      lastName: "Manager",
      orgId: org1.id,
      isActive: true,
    },
    {
      id: "user_agent_1",
      email: "agent@org1.com",
      username: "agent",
      passwordHash,
      role: "agent",
      firstName: "Sam",
      lastName: "Sales",
      orgId: org1.id,
      isActive: true,
    },
    {
      id: "user_super_admin",
      email: "super@admin.com",
      username: "superadmin",
      passwordHash,
      role: "super_admin",
      firstName: "Super",
      lastName: "Admin",
      orgId: null, // Super admin has no org
      isActive: true,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      create: userData,
      update: userData,
    });
    console.log(`✅ User: ${user.email} (${user.role})`);
  }

  console.log("\n🎉 Demo users seeded successfully!");
  console.log("\n📝 Login credentials (all users):");
  console.log("   Password: password123\n");
  console.log("👤 Users created:");
  console.log("   • admin@org1.com     (Organization Admin)");
  console.log("   • manager@org1.com   (Manager)");
  console.log("   • agent@org1.com     (Agent)");
  console.log("   • super@admin.com    (Super Admin - System Wide)\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

