import { TogglIntegrationContext } from '../lib';
import { getPreSyncData } from './data';

/**
 * Toggl time entries do not require a task, however timesheeter timesheet entries do require a task.
 *
 * Therefore before syncing we need to auto-create tasks (and projects if necessary) for any time entries
 * that do not have a task.
 *
 * ### Algorithm
 *
 * 1. Get all time entries that do not have a task
 *
 * 2. For each time entry, try and parse a task number and prefix (or auto assign expression) from the description
 *
 * 3. If we can parse a task number and prefix (or auto assign expression), then try and find a project with that prefix (or auto assign expression)
 *
 * 4. If we can't find a project with that prefix (or auto assign expression), then create a new project
 *
 * - The new project should have a name like "Auto created from Toggl - {prefix}/{auto assign expression}"
 *
 * - The new project should have the task prefix or auto assign expression set in the project config
 *
 * 5. We check to see if we can find a task with that task number and prefix (or
 * matching the whole description for the case of auto assign prefixes), if we can't then we create a new task
 *
 * 6. We then update the time entry to be assigned to the task
 */
export const preSync = async ({
  context,
  startDate,
  endDate,
}: {
  context: TogglIntegrationContext;
  startDate: Date;
  endDate: Date;
}) => {
  let { togglTimeEntries, togglProjects, togglTasks, timesheeterProjects } = await getPreSyncData({
    context,
    startDate,
    endDate,
  });
};
