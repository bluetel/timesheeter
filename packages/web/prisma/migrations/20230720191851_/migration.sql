/*
  Warnings:

  - You are about to drop the column `togglTimesheetEntryId` on the `TimesheetEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "togglProjectId" BIGINT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "togglTaskId" BIGINT;

-- AlterTable
ALTER TABLE "TicketForTask" ADD COLUMN     "jiraTicketId" TEXT;

-- AlterTable
ALTER TABLE "TimesheetEntry" DROP COLUMN "togglTimesheetEntryId",
ADD COLUMN     "togglTimeEntryId" BIGINT;
