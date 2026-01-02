import { getPrisma } from "../packages/core/src/db/prisma";

const prisma = getPrisma();

async function checkUsers() {
  try {
    console.log("=== Checking Database State ===\n");

    // Check organizations
    const orgs = await prisma.organization.findMany();
    console.log(`Organizations: ${orgs.length}`);
    orgs.forEach(org => {
      console.log(`  - ${org.id}: ${org.name} (active: ${org.isActive})`);
    });

    // Check users
    const users = await prisma.user.findMany({
      include: {
        organization: true,
      },
    });
    console.log(`\nUsers: ${users.length}`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Org: ${user.organization?.name || 'N/A'}`);
    });

    // Check credentials
    const creds = await prisma.mondayCredential.findMany();
    console.log(`\nMonday.com Credentials: ${creds.length}`);
    creds.forEach(cred => {
      console.log(`  - Org: ${cred.orgId}, Has token: ${!!cred.accessToken}`);
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
