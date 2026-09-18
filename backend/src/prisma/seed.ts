import bcrypt from 'bcryptjs';
import { prisma } from './client';

async function main() {
  console.log('🌱 Cleaning all mock data and resetting to pristine dual-partner vault...');

  // Clean all existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emergencyAccessRequest.deleteMany();
  await prisma.secretNote.deleteMany();
  await prisma.sharedNote.deleteMany();
  await prisma.passwordVaultItem.deleteMany();
  await prisma.futurePlan.deleteMany();
  await prisma.businessItem.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('VaultPass123!', 12);

  // 1. Create User 1 (Adarsh - Role AD)
  await prisma.user.create({
    data: {
      id: 'user-alice-001',
      email: 'user1@looser.vault',
      passwordHash: defaultPassword,
      name: 'Adarsh',
      role: 'AD',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      totpEnabled: false,
      lastLogin: new Date(),
      lastCheckIn: new Date(),
      sirenSoundPref: true,
      themePref: 'dark',
    },
  });

  // 2. Create User 2 (Bob Vance - Role NS)
  await prisma.user.create({
    data: {
      id: 'user-bob-002',
      email: 'user2@looser.vault',
      passwordHash: defaultPassword,
      name: 'Bob Vance',
      role: 'NS',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      totpEnabled: false,
      lastLogin: new Date(),
      lastCheckIn: new Date(),
      sirenSoundPref: true,
      themePref: 'dark',
    },
  });

  console.log('✅ Clean setup complete: user1@looser.vault & user2@looser.vault initialized. Zero mock seeding data in the database.');
}

main()
  .catch((e) => {
    console.error('❌ Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
