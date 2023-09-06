-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "privateUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_privateUserId_fkey" FOREIGN KEY ("privateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
