import { TogglIntegrationContext } from '../lib';
import { createTogglSyncRecords } from '../sync-records';
import { getPreSyncData } from './data';
import { matchTimeEntryToProject } from './projects';
import { matchTimeEntryToTask } from './tasks';

/**
 * Toggl time entries do not require a task, however timesheeter timesheet entries do require a task.
 *
 * Therefore before syncing we need to auto-create tasks (and projects if necessary) for any time entries
 * that do not have a task.
 *
 * ### Steps
 *
 * 1. Get all time entries that do not have a task
 *
 * 2. For each time entry, try and parse a task number and prefix (or auto assign expression) from the description
 *
 * 3. If we can parse a task number and prefix (or auto assign expression), then try and find a project with that prefix (or auto assign expression)
 *
 * 4. If we can't find a project with that prefix (or auto assign expression), then create a new project
 *
 * - The new project should have a name like "Auto created by Timesheeter - {prefix}/{auto assign expression}"
 *
 * - The new project should have the task prefix or auto assign expression set in the project config
 *
 * - If we can't find any matching task prefix or auto assign expression, then add to a project called the UNCATEGORIZED_TASKS_PROJECT_NAME variable
 * this may need to be created if it doesn't exist
 *
 * 5. We check to see if we can find a task with that task number and prefix (or
 * matching the whole description for the case of auto assign prefixes), if we can't then we create a new task
 *
 * 6. We then update the time entry to be assigned to the task
 */
export const preSync = async ({ context }: { context: TogglIntegrationContext }) => {
  const preSyncData = await getPreSyncData({
    context,
  });

  // We record all the entries, this way we know if they were deleted as we will
  // have a synced record without an entry in the response from the Toggl API
  await createTogglSyncRecords({ preSyncData, context });

  let { togglTimeEntries, togglProjects, togglTasks, timesheeterProjects, uncategorizedTasksProject } = preSyncData;

  const togglTimeEntriesWithoutTask = togglTimeEntries.filter((timeEntry) => !timeEntry.task_id);

  if (togglTimeEntriesWithoutTask.length === 0) {
    return;
  }

  for (const timeEntry of togglTimeEntriesWithoutTask) {
    const searchMatch = await matchTimeEntryToProject({
      context,
      timeEntry,
      togglProjects,
      timesheeterProjects,
      uncategorizedTasksProject,
      togglTasks,
    });

    if (!searchMatch) {
      continue;
    }

    const { matchedProject, updatedTogglProjects, updatedTimesheeterProjects, taskName, autoAssignTrimmedDescription } =
      searchMatch;

    togglProjects = updatedTogglProjects;
    timesheeterProjects = updatedTimesheeterProjects;

    const { updatedTogglTasks } = await matchTimeEntryToTask({
      context,
      timeEntry,
      matchedProject,
      togglTasks,
      taskName,
      autoAssignTrimmedDescription,
    });

    togglTasks = updatedTogglTasks;
  }
};
