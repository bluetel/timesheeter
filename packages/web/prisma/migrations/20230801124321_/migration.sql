/*
  Warnings:

  - You are about to drop the `TogglSyncRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TogglSyncRecord" DROP CONSTRAINT "TogglSyncRecord_workspaceId_fkey";

-- DropTable
DROP TABLE "TogglSyncRecord";
