/*
  Warnings:

  - A unique constraint covering the columns `[prefix,workspaceId]` on the table `TaskPrefix` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TaskPrefix_prefix_workspaceId_key" ON "TaskPrefix"("prefix", "workspaceId");
