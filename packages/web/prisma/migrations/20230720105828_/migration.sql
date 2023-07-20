/*
  Warnings:

  - You are about to drop the column `prefixId` on the `TicketForTask` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[taskPrefixId,workspaceId]` on the table `TicketForTask` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `taskPrefixId` to the `TicketForTask` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TicketForTask" DROP CONSTRAINT "TicketForTask_prefixId_fkey";

-- DropIndex
DROP INDEX "TicketForTask_prefixId_workspaceId_key";

-- AlterTable
ALTER TABLE "TicketForTask" DROP COLUMN "prefixId",
ADD COLUMN     "taskPrefixId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_taskPrefixId_workspaceId_key" ON "TicketForTask"("taskPrefixId", "workspaceId");

-- AddForeignKey
ALTER TABLE "TicketForTask" ADD CONSTRAINT "TicketForTask_taskPrefixId_fkey" FOREIGN KEY ("taskPrefixId") REFERENCES "TaskPrefix"("id") ON DELETE CASCADE ON UPDATE CASCADE;
