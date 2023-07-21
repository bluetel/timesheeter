import { createTogglIntegrationContext, TogglIntegration } from './lib';
import { syncProjects, syncTasks, syncTimesheetEntries } from './sync';

export const handleTogglIntegration = async ({
  integration: {
    config: { apiKey, togglWorkspaceId: unverifiedTogglWorkspaceId, scanPeriod },
    workspaceId,
  },
}: {
  integration: TogglIntegration;
}) => {
  const context = await createTogglIntegrationContext({
    apiKey,
    unverifiedTogglWorkspaceId,
    workspaceId,
  });

  const endDate = new Date();

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - scanPeriod);

  // Before we start syncing, we need to auto-create projects and tasks for any new time entries
  // that have been created in Toggl since the last time we synced

  // Then after that we can sync projects, then tasks, then time entries

  // If we don't do this, then we will end up with time entries that don't have a task,
  // timesheeter requires all time entries to have a task

  const syncedProjectPairs = await syncProjects({ context });

  const syncedTaskPairs = await syncTasks({ context, syncedProjectPairs });

  const syncedTimesheetEntries = await syncTimesheetEntries({
    context,
    startDate,
    endDate,
    syncedProjectPairs,
    syncedTaskPairs,
  });
};
