-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "scopedUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_scopedUserId_fkey" FOREIGN KEY ("scopedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
