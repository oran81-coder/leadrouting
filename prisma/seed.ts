/**
 * Prisma Seed Script
 * 
 * Creates development users for testing authentication:
 * - admin@example.com (Admin role)
 * - manager@example.com (Manager role)
 * - agent@example.com (Agent role)
 * 
 * Password for all users: "Password123!"
 * 
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ORG_ID = "org_1"; // Default org for Phase 1
const DEFAULT_PASSWORD = "Password123!";

async function main() {
  console.log("🌱 Starting seed...");

  // Hash password once for all users (same password for dev convenience)
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: ORG_ID,
        email: "admin@example.com",
      },
    },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      orgId: ORG_ID,
      username: "admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      isActive: true,
    },
  });

  console.log("✅ Created/Updated Admin:", admin.email);

  // Create Manager User
  const manager = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: ORG_ID,
        email: "manager@example.com",
      },
    },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      orgId: ORG_ID,
      username: "manager",
      email: "manager@example.com",
      passwordHash,
      role: "manager",
      firstName: "Manager",
      lastName: "User",
      isActive: true,
    },
  });

  console.log("✅ Created/Updated Manager:", manager.email);

  // Create Agent User
  const agent = await prisma.user.upsert({
    where: {
      orgId_email: {
        orgId: ORG_ID,
        email: "agent@example.com",
      },
    },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      orgId: ORG_ID,
      username: "agent",
      email: "agent@example.com",
      passwordHash,
      role: "agent",
      firstName: "Agent",
      lastName: "User",
      isActive: true,
    },
  });

  console.log("✅ Created/Updated Agent:", agent.email);

  console.log("\n📝 Development Users:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Email: admin@example.com    | Role: admin   | Password: ${DEFAULT_PASSWORD}`);
  console.log(`Email: manager@example.com  | Role: manager | Password: ${DEFAULT_PASSWORD}`);
  console.log(`Email: agent@example.com    | Role: agent   | Password: ${DEFAULT_PASSWORD}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🎉 Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

