import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating default organization...');
  
  await prisma.organization.upsert({
    where: { id: 'org_1' },
    update: {},
    create: {
      id: 'org_1',
      name: 'Default Organization',
      displayName: 'Default Organization',
      email: 'admin@example.com',
      isActive: true,
      tier: 'standard',
      subscriptionStatus: 'active',
    },
  });
  
  console.log('✅ Default organization created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

