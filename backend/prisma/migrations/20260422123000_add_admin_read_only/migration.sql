-- Add read-only admin flag
ALTER TABLE "User"
ADD COLUMN "adminReadOnly" BOOLEAN NOT NULL DEFAULT false;
