/*
  Warnings:

  - A unique constraint covering the columns `[workspaceId,category,togglEntityId,togglProjectId]` on the table `TogglSyncRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TogglSyncRecord_workspaceId_category_togglEntityId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TogglSyncRecord_workspaceId_category_togglEntityId_togglPro_key" ON "TogglSyncRecord"("workspaceId", "category", "togglEntityId", "togglProjectId");
