ALTER TABLE "User" ADD COLUMN "nickname" TEXT;

UPDATE "User"
SET "nickname" = COALESCE(NULLIF(split_part("email", '@', 1), ''), 'user-' || substr("id", 1, 8));

ALTER TABLE "User" ALTER COLUMN "nickname" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
