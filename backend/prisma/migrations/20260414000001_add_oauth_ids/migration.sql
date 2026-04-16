-- AlterTable: kakaoId, naverId 추가
ALTER TABLE "User" ADD COLUMN "kakaoId" TEXT;
ALTER TABLE "User" ADD COLUMN "naverId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_kakaoId_key" ON "User"("kakaoId");
CREATE UNIQUE INDEX "User_naverId_key" ON "User"("naverId");
