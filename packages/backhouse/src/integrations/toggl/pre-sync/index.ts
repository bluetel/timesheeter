import { type TogglIntegrationContext } from '../lib';
import { clearPromptsFromEntry } from '../prompts';
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
 * 2. For each time entry, see if it has been assigned a project
 *
 * 3. If it hasn't, put a message on the entry to instruct the user to add a project
 *
 * 3. Try and match a JIRA styled task prefix, if we can't then we have to do one
 * of two things:
 *
 * - If the project has a description, then we use that as the task name
 *
 * - If the project has no description, then we use the UNCATEGORIZED_TASKS_TASK_NAME variable
 *
 * 4. We check to see if we can find a task with that task number and prefix (or
 * matching the whole description for the case of auto assign prefixes), if we can't then we create a new task
 *
 * 5. We then update the time entry to be assigned to the task
 */
export const preSync = async ({ context }: { context: TogglIntegrationContext }) => {
  const preSyncData = await getPreSyncData({
    context,
  });

  // We record all the entries, this way we know if they were deleted as we will
  // have a synced record without an entry in the response from the Toggl API
  await createTogglSyncRecords({ preSyncData, context });

  const { togglProjects } = preSyncData;
  let { togglTasks, timesheeterProjects } = preSyncData;

  const togglTimeEntriesWithoutTask = preSyncData.togglTimeEntries.filter((timeEntry) => !timeEntry.task_id);
  if (togglTimeEntriesWithoutTask.length === 0) {
    return;
  }

  for (const timeEntry of togglTimeEntriesWithoutTask) {
    console.log(`toggl - Pre Sync - Matching Time Entry ${timeEntry.id} to Project`);
    const searchMatch = await matchTimeEntryToProject({
      context,
      timeEntry,
      togglProjects,
      timesheeterProjects,
      togglTasks,
    });

    if (!searchMatch) {
      continue;
    }

    const { matchedProject, updatedTimesheeterProjects, taskName } = searchMatch;

    timesheeterProjects = updatedTimesheeterProjects;

    // Remove any prompts from the description as they are only used in the
    // matchTimeEntryToProject function
    const timeEntryNoPrompt = await clearPromptsFromEntry({
      context,
      togglTimeEntry: timeEntry,
    });

    const { updatedTogglTasks } = await matchTimeEntryToTask({
      context,
      timeEntry: timeEntryNoPrompt,
      matchedProject,
      togglTasks,
      taskName,
    });

    togglTasks = updatedTogglTasks;
  }
};
