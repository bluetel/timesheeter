import { type TogglIntegrationContext } from '../lib';
import { createTogglSyncRecords } from '../sync-records';
import { getPreSyncData } from './data';
import { matchTimeEntryToProject } from './projects';
import { matchTimeEntryToTask } from './tasks';

/**
 * Toggl time entries do not require a task, however timesheeter timesheet entries do require a task.
 *
 * Therefore before syncing we need to auto-create tasks for any time entries
 * that do not have a task. We also need to enforce project selection and ignore any
 * entries that do not have a project.
 *
 * ### Steps
 *
 * 1. Get all time entries that do not have a task
 *
 * 3. Try and match a JIRA styled task prefix, if we can't then we have to do one
 * of two things:
 *
 * - If the entry has a description, then we use that as the task name
 *
 * - If the entry has a description and a colon in it, use the text before the colon as the task name
 *
 * - If the entry has no description or task, we ignore it
 *
 * 4. We check to see if we can find a task with a matching name, if we can't then we create a new task
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

    const { updatedTogglTasks } = await matchTimeEntryToTask({
      context,
      timeEntry,
      matchedProject,
      togglTasks,
      taskName,
    });

    togglTasks = updatedTogglTasks;
  }
};
