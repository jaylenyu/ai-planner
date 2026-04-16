-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: 기존 가입자는 모두 인증된 것으로 처리
UPDATE "User" SET "emailVerified" = true;
