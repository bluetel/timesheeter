/*
  Warnings:

  - A unique constraint covering the columns `[prefix,projectId]` on the table `TaskPrefix` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TaskPrefix_prefix_workspaceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TaskPrefix_prefix_projectId_key" ON "TaskPrefix"("prefix", "projectId");
