/*
  Warnings:

  - A unique constraint covering the columns `[taskPrefixId,number]` on the table `TicketForTask` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TicketForTask_taskPrefixId_workspaceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_taskPrefixId_number_key" ON "TicketForTask"("taskPrefixId", "number");
