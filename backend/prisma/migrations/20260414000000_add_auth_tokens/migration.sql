-- AlterTable: password를 nullable로, googleId 추가
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateTable: RefreshToken
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: ApiUsage
CREATE TABLE "ApiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'anonymous',
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiUsage_userId_idx" ON "ApiUsage"("userId");
CREATE INDEX "ApiUsage_ipAddress_idx" ON "ApiUsage"("ipAddress");
CREATE INDEX "ApiUsage_timestamp_idx" ON "ApiUsage"("timestamp");
