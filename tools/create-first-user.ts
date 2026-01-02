import { getPrisma } from "../packages/core/src/db/prisma";
import bcrypt from "bcryptjs";

const prisma = getPrisma();

async function createFirstUser() {
  try {
    console.log("Creating first user...");

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id: "cmjq2ces90000rbcw8s5iqlcz" },
    });

    if (!org) {
      console.error("Organization not found!");
      process.exit(1);
    }

    console.log(`Found organization: ${org.name}`);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { orgId: org.id },
    });

    if (existingUser) {
      console.log(`User already exists: ${existingUser.email}`);
      console.log(`You can login with this email and password`);
      return;
    }

    // Create first admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    const user = await prisma.user.create({
      data: {
        email: "admin@example.com",
        username: "admin",
        passwordHash: hashedPassword,
        role: "admin",
        orgId: org.id,
        firstName: "Admin",
        lastName: "User",
        isActive: true,
      },
    });

    console.log("\n✅ First user created successfully!");
    console.log("\nLogin credentials:");
    console.log("  Email: admin@example.com");
    console.log("  Password: admin123");
    console.log("\n⚠️  Please change this password after first login!");

  } catch (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createFirstUser();
