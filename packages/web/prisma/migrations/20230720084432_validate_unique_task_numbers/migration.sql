/*
  Warnings:

  - A unique constraint covering the columns `[taskPrefixId,taskNumber]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "taskNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Task_taskPrefixId_taskNumber_key" ON "Task"("taskPrefixId", "taskNumber");
