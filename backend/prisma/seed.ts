import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env'));

  const prismaUrl = process.env.DATABASE_URL;
  if (!prismaUrl) {
    throw new Error('DATABASE_URL가 설정되지 않았습니다.');
  }

  const seedUsers = [
    {
      email: process.env.SEED_ADMIN_EMAIL ?? process.env.EMAIL_USER ?? 'jaylenyu96@gmail.com',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!',
      role: 'ADMIN' as const,
      adminReadOnly: false,
    },
    {
      email: process.env.SEED_PUBLICADMIN_EMAIL ?? 'publicadmin@ai-planner.local',
      password: process.env.SEED_PUBLICADMIN_PASSWORD ?? 'PublicAdmin1234!',
      role: 'ADMIN' as const,
      adminReadOnly: true,
    },
  ];

  const prisma = new PrismaClient();

  try {
    for (const seedUser of seedUsers) {
      const hashedPassword = await bcrypt.hash(seedUser.password, 10);

      const user = await prisma.user.upsert({
        where: { email: seedUser.email },
        update: {
          password: hashedPassword,
          emailVerified: true,
          role: seedUser.role,
          adminReadOnly: seedUser.adminReadOnly,
        },
        create: {
          email: seedUser.email,
          password: hashedPassword,
          emailVerified: true,
          role: seedUser.role,
          adminReadOnly: seedUser.adminReadOnly,
        },
      });

      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    }

    console.log('seed complete');
    for (const seedUser of seedUsers) {
      console.log(
        `${seedUser.adminReadOnly ? 'admin(read-only)' : seedUser.role.toLowerCase()}: ${seedUser.email} / ${seedUser.password}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
