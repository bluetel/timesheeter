import { matchTaskRegex } from '@timesheeter/web';
import { RawTogglProject, RawTogglTask, RawTogglTimeEntry, toggl } from '../api';
import { TogglIntegrationContext } from '../lib';
import { resolveTaskNumberFromTogglDescriptions } from '../toggl-task-descriptions';

export const matchTimeEntryToTask = async ({
  context,
  timeEntry,
  matchedProject,
  togglTasks,
  taskName,
  autoAssignTrimmedDescription,
}: {
  context: TogglIntegrationContext;
  timeEntry: RawTogglTimeEntry;
  matchedProject: RawTogglProject;
  togglTasks: RawTogglTask[];
  taskName: string;
  autoAssignTrimmedDescription: string | null;
}) => {
  let updatedTogglTasks = togglTasks;

  // The matched task needs to be in the same project as the time entry
  const matchingTask = togglTasks.find(
    (togglTask) =>
      resolveTaskNumberFromTogglDescriptions(togglTask.name) === taskName && togglTask.project_id === matchedProject.id
  );

  if (!timeEntry.stop) {
    throw new Error(
      `Time entry ${timeEntry.id} has no stop time, this should have been filtered out while getting pre-sync data`
    );
  }

  const matchResult = matchTaskRegex(timeEntry.description ?? '');

  let timeEntryUpdatedDescription = matchResult.variant === 'with-task' ? matchResult.description ?? '' : '';

  if (autoAssignTrimmedDescription) {
    timeEntryUpdatedDescription = autoAssignTrimmedDescription;
  }

  if (matchingTask) {
    toggl.timeEntries.put({
      axiosClient: context.axiosClient,
      path: { workspace_id: context.togglWorkspaceId, time_entry_id: timeEntry.id },
      body: {
        // We only set the desciption if we got a match result with a custom description
        description: timeEntryUpdatedDescription,
        task_id: matchingTask.id,
        created_with: 'timesheeter',
        tag_action: 'add',
        workspace_id: context.togglWorkspaceId,
        start: timeEntry.start,
        stop: timeEntry.stop,
        billable: timeEntry.billable,
        project_id: matchedProject.id,
        user_id: timeEntry.user_id,
      },
    });

    return { updatedTogglTasks };
  }

  const newTask = await toggl.tasks.post({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId, project_id: matchedProject.id },
    body: {
      name: taskName,
      active: true,
      estimated_seconds: 0,
      workspace_id: context.togglWorkspaceId,
      project_id: matchedProject.id,
      user_id: null,
    },
  });

  // Update the time entry with the new task
  await toggl.timeEntries.put({
    axiosClient: context.axiosClient,
    path: { workspace_id: context.togglWorkspaceId, time_entry_id: timeEntry.id },
    body: {
      description: timeEntryUpdatedDescription,
      task_id: newTask.id,
      created_with: 'timesheeter',
      tag_action: 'add',
      workspace_id: context.togglWorkspaceId,
      start: timeEntry.start,
      stop: timeEntry.stop,
      billable: timeEntry.billable,
      project_id: matchedProject.id,
      user_id: timeEntry.user_id,
    },
  });

  updatedTogglTasks = [...updatedTogglTasks, newTask];

  return { updatedTogglTasks };
};
