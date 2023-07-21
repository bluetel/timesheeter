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
