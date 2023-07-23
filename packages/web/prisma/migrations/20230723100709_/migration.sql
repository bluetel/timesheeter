/*
  Warnings:

  - A unique constraint covering the columns `[togglProjectId,workspaceId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[togglTaskId,workspaceId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[jiraTicketId,workspaceId]` on the table `TicketForTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[togglTimeEntryId,workspaceId]` on the table `TimesheetEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Project_togglProjectId_key";

-- DropIndex
DROP INDEX "Task_togglTaskId_key";

-- DropIndex
DROP INDEX "TicketForTask_jiraTicketId_key";

-- DropIndex
DROP INDEX "TimesheetEntry_togglTimeEntryId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Project_togglProjectId_workspaceId_key" ON "Project"("togglProjectId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_togglTaskId_workspaceId_key" ON "Task"("togglTaskId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_jiraTicketId_workspaceId_key" ON "TicketForTask"("jiraTicketId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_togglTimeEntryId_workspaceId_key" ON "TimesheetEntry"("togglTimeEntryId", "workspaceId");
