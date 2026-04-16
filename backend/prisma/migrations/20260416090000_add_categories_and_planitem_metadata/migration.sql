-- AlterTable: Plan metadata and optimistic lock
ALTER TABLE "Plan" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Plan" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: PlanItem storage metadata
ALTER TABLE "PlanItem" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlanItem" ADD COLUMN "link" TEXT;
ALTER TABLE "PlanItem" ADD COLUMN "source" TEXT;
ALTER TABLE "PlanItem" ADD COLUMN "distanceFromPrev" DOUBLE PRECISION;

-- CreateTable: Category
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Plan_userId_idx" ON "Plan"("userId");
CREATE INDEX "Plan_categoryId_idx" ON "Plan"("categoryId");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- Foreign keys
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlanItem" DROP CONSTRAINT "PlanItem_planId_fkey";
ALTER TABLE "PlanItem" ADD CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
