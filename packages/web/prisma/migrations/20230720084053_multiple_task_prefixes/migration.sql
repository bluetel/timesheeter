/*
  Warnings:

  - You are about to drop the column `taskPrefix` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `taskNumber` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "taskPrefix";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "taskNumber",
ADD COLUMN     "taskPrefixId" TEXT;

-- CreateTable
CREATE TABLE "TaskPrefix" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prefix" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "TaskPrefix_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskPrefix" ADD CONSTRAINT "TaskPrefix_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPrefix" ADD CONSTRAINT "TaskPrefix_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskPrefixId_fkey" FOREIGN KEY ("taskPrefixId") REFERENCES "TaskPrefix"("id") ON DELETE SET NULL ON UPDATE CASCADE;
