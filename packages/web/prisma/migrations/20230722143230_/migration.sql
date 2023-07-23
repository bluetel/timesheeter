/*
  Warnings:

  - A unique constraint covering the columns `[togglProjectId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[togglTaskId]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[jiraTicketId]` on the table `TicketForTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[togglTimeEntryId]` on the table `TimesheetEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Project_togglProjectId_key" ON "Project"("togglProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_togglTaskId_key" ON "Task"("togglTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketForTask_jiraTicketId_key" ON "TicketForTask"("jiraTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_togglTimeEntryId_key" ON "TimesheetEntry"("togglTimeEntryId");
