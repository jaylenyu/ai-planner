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

  const email = process.env.SEED_USER_EMAIL ?? 'test@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'test1234';
  const hashedPassword = await bcrypt.hash(password, 10);

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        emailVerified: true,
      },
      create: {
        email,
        password: hashedPassword,
        emailVerified: true,
      },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    console.log('seed complete');
    console.log(`email: ${email}`);
    console.log(`password: ${password}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
