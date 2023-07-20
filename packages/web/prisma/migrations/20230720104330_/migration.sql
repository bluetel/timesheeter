/*
  Warnings:

  - You are about to drop the column `taskNumber` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `taskPrefixId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_taskPrefixId_fkey";

-- DropIndex
DROP INDEX "Task_taskPrefixId_taskNumber_key";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "taskNumber",
DROP COLUMN "taskPrefixId";

-- CreateTable
CREATE TABLE "TicketForTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prefixId" TEXT NOT NULL,
    "taskId" TEXT,

    CONSTRAINT "TicketForTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_taskId_key" ON "TicketForTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_prefixId_workspaceId_key" ON "TicketForTask"("prefixId", "workspaceId");

-- AddForeignKey
ALTER TABLE "TicketForTask" ADD CONSTRAINT "TicketForTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketForTask" ADD CONSTRAINT "TicketForTask_prefixId_fkey" FOREIGN KEY ("prefixId") REFERENCES "TaskPrefix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketForTask" ADD CONSTRAINT "TicketForTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
