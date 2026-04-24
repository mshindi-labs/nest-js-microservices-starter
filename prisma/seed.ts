import 'dotenv/config';
import { PrismaClient, AccountType } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';
import * as bcrypt from 'bcrypt';
import {
  SEED_ORG_ID,
  SEED_USER_ID,
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
} from '@app/common/constants/auth-constants';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const adapter =
  process.env.DB_ADAPTER === 'neon'
    ? new PrismaNeon({ connectionString: DATABASE_URL })
    : new PrismaPg({ connectionString: DATABASE_URL });

const prisma = new PrismaClient({ adapter } as never);

// Stable UUIDs for idempotent re-runs
const SYSTEM_ROLES = ['other', 'superadmin'] as const;
const ORG_ROLES = ['owner', 'admin', 'member'] as const;

async function upsertSystemRole(name: string): Promise<{ id: string }> {
  const existing = await prisma.roles.findFirst({
    where: { name, organizationId: null },
  });
  if (existing) return existing;
  return prisma.roles.create({ data: { name, organizationId: null } });
}

async function upsertOrgRole(
  name: string,
  organizationId: string,
): Promise<{ id: string }> {
  const existing = await prisma.roles.findFirst({
    where: { name, organizationId },
  });
  if (existing) return existing;
  return prisma.roles.create({ data: { name, organizationId } });
}

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Step 1 — System roles (organizationId = null)
  console.log('Creating system roles...');
  for (const name of SYSTEM_ROLES) {
    await upsertSystemRole(name);
    console.log(`  ✓ System role: ${name}`);
  }

  // Step 2 — Default organization
  console.log('Creating default organization...');
  await prisma.organization.upsert({
    where: { id: SEED_ORG_ID },
    create: { id: SEED_ORG_ID, name: 'Default Organization', isActive: true },
    update: {},
  });
  console.log('  ✓ Default Organization');

  // Step 3 — Org-scoped roles for default org
  console.log('Creating org-scoped roles for default organization...');
  const orgRoles: Record<string, { id: string }> = {};
  for (const name of ORG_ROLES) {
    orgRoles[name] = await upsertOrgRole(name, SEED_ORG_ID);
    console.log(`  ✓ Org role: ${name}`);
  }

  // Step 4 — Superadmin user
  console.log('Creating superadmin user...');
  await prisma.user.upsert({
    where: { id: SEED_USER_ID },
    create: { id: SEED_USER_ID, name: 'Super Admin' },
    update: {},
  });
  console.log('  ✓ User: Super Admin');

  // Step 5 — Superadmin account
  console.log('Creating superadmin account...');
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);
  await prisma.account.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    create: {
      userId: SEED_USER_ID,
      email: SEED_ADMIN_EMAIL,
      password: passwordHash,
      accountType: AccountType.EMAIL,
      isEmailVerified: true,
      isActive: true,
    },
    update: {},
  });
  console.log(`  ✓ Account: ${SEED_ADMIN_EMAIL}`);

  // Step 6 — Membership: superadmin → default org → owner role
  console.log('Creating superadmin membership...');
  const ownerRole = orgRoles['owner'];
  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: SEED_USER_ID,
        organizationId: SEED_ORG_ID,
      },
    },
    create: {
      userId: SEED_USER_ID,
      organizationId: SEED_ORG_ID,
      roleId: ownerRole.id,
      isActive: true,
    },
    update: {},
  });
  console.log('  ✓ Membership: Super Admin → Default Organization (owner)');

  console.log('\nSeeding complete.');
  console.log(`Admin email: ${SEED_ADMIN_EMAIL}`);
  console.log(`Admin password: ${SEED_ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
