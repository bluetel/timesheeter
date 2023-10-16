import { cleanupDeletedObjects } from './cleanup-deleted-objects';
import { createTogglIntegrationContext, type TogglIntegration } from './lib';
import { preSync } from './pre-sync';
import { syncProjects, syncTasks, syncTimesheetEntries } from './sync';
import { applyTaskDescriptions } from './toggl-task-descriptions';

export const handleTogglIntegration = async ({
  integration: {
    config: { apiKey, togglWorkspaceId: unverifiedTogglWorkspaceId, scanPeriod, emailMap },
    workspaceId,
  },
}: {
  integration: TogglIntegration;
}) => {
  const context = await createTogglIntegrationContext({
    apiKey,
    unverifiedTogglWorkspaceId,
    workspaceId,
    emailMap,
    scanPeriod,
  });

  // Before we start syncing, we need to auto-create projects and tasks for any new time entries
  // that have been created in Toggl since the last time we synced

  // If we don't do this, then we will end up with time entries that don't have a task,
  // timesheeter requires all time entries to have a task, and all tasks to have a project
  await preSync({ context });

  // Now we can sync projects, then tasks, then time entries
  const syncedProjectPairs = await syncProjects({ context });

  const syncedTaskPairs = await syncTasks({ context, syncedProjectPairs });

  const syncedTimesheetEntryPairs = await syncTimesheetEntries({
    context,
    syncedTaskPairs,
  });

  // We can handle these concurrently to speed things up
  await Promise.all([
    applyTaskDescriptions({ context, syncedTaskPairs }),

    // Once an object has been confirmed as deleted, we can delete all delete references to it
    cleanupDeletedObjects({
      context,
      syncedProjectPairs,
      syncedTaskPairs,
      syncedTimesheetEntryPairs,
    }),
  ]);
};
