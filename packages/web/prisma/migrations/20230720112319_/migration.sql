/*
  Warnings:

  - You are about to drop the column `ticketForTaskId` on the `Task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[taskId]` on the table `TicketForTask` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `taskId` to the `TicketForTask` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_ticketForTaskId_fkey";

-- DropIndex
DROP INDEX "Task_ticketForTaskId_key";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "ticketForTaskId";

-- AlterTable
ALTER TABLE "TicketForTask" ADD COLUMN     "taskId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_taskId_key" ON "TicketForTask"("taskId");

-- AddForeignKey
ALTER TABLE "TicketForTask" ADD CONSTRAINT "TicketForTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
