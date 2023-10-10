import { matchTaskRegex } from '@timesheeter/web';
import { type RawTogglProject, type RawTogglTask, type RawTogglTimeEntry, toggl } from '../api';
import { type TogglIntegrationContext } from '../lib';
import { resolveTaskNumberFromTogglDescriptions } from '../toggl-task-descriptions';

export const matchTimeEntryToTask = async ({
  context,
  timeEntry,
  matchedProject,
  togglTasks,
  taskName,
}: {
  context: TogglIntegrationContext;
  timeEntry: RawTogglTimeEntry;
  matchedProject: RawTogglProject;
  togglTasks: RawTogglTask[];
  taskName: string;
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

  const timeEntryUpdatedDescription = matchResult.variant === 'with-task' ? matchResult.description ?? '' : '';

  if (matchingTask) {
    await toggl.timeEntries.put({
      axiosClient: context.axiosClient,
      path: { workspace_id: context.togglWorkspaceId, time_entry_id: timeEntry.id },
      body: {
        // We only set the desciption if we got a match result with a custom description
        description: timeEntryUpdatedDescription,
        task_id: matchingTask.id,
        created_with: 'timesheeter',
        tag_action: 'add',
        tag_ids: [],
        workspace_id: context.togglWorkspaceId,
        start: timeEntry.start,
        stop: timeEntry.stop,
        project_id: matchedProject.id,
        user_id: timeEntry.user_id,
        billable: matchedProject.billable ?? true,
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
      tag_ids: [],
      workspace_id: context.togglWorkspaceId,
      start: timeEntry.start,
      stop: timeEntry.stop,
      project_id: matchedProject.id,
      user_id: timeEntry.user_id,
      billable: matchedProject.billable ?? true,
    },
  });

  updatedTogglTasks = [...updatedTogglTasks, newTask];

  return { updatedTogglTasks };
};
