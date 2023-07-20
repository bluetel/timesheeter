/*
  Warnings:

  - You are about to drop the column `taskId` on the `TicketForTask` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ticketForTaskId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "TicketForTask" DROP CONSTRAINT "TicketForTask_taskId_fkey";

-- DropIndex
DROP INDEX "TicketForTask_taskId_key";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "ticketForTaskId" TEXT;

-- AlterTable
ALTER TABLE "TicketForTask" DROP COLUMN "taskId";

-- CreateIndex
CREATE UNIQUE INDEX "Task_ticketForTaskId_key" ON "Task"("ticketForTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ticketForTaskId_fkey" FOREIGN KEY ("ticketForTaskId") REFERENCES "TicketForTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
