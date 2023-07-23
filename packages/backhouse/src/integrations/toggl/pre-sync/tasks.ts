import { TogglProject, TogglTask, TogglTimeEntry, toggl } from '../api';
import { TogglIntegrationContext } from '../lib';

export const matchTimeEntryToTask = async ({
  context,
  timeEntry,
  matchedProject,
  togglTasks,
  taskName,
}: {
  context: TogglIntegrationContext;
  timeEntry: TogglTimeEntry;
  matchedProject: TogglProject;
  togglTasks: TogglTask[];
  taskName: string;
}) => {
  let updatedTogglTasks = togglTasks;

  const matchingTask = togglTasks.find((task) => task.name === taskName);

  if (!timeEntry.stop) {
    throw new Error(
      `Time entry ${timeEntry.id} has no stop time, this should have been filtered out while getting pre-sync data`
    );
  }

  if (matchingTask) {
    toggl.timeEntries.put({
      axiosClient: context.axiosClient,
      path: { workspace_id: context.togglWorkspaceId, time_entry_id: timeEntry.id },
      body: {
        description: timeEntry.description ?? '',
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

  updatedTogglTasks = [...updatedTogglTasks, newTask];

  return { updatedTogglTasks };
};
