import { parseTask, togglMaxScanPeriod } from '@timesheeter/web';
import { toggl } from '../../../api';
import { TogglIntegrationContext } from '../../../lib';
import { TaskPair, TimesheeterTask, TogglTask, timesheeterTaskSelectQuery } from '../data';
import { togglSyncRecordSelectQuery, togglTaskSyncRecordType } from '../../../sync-records';

export const updateTogglTask = async ({
  context,
  timesheeterTask,
  togglTask,
  updatedTogglProjectId,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  togglTask: TogglTask & {
    deleted: false;
  };
  updatedTogglProjectId: number;
}): Promise<TaskPair> => {
  if (togglTask.project_id !== updatedTogglProjectId) {
    return handleRecreateTogglTask({
      context,
      timesheeterTask,
      oldTogglTask: togglTask,
      updatedTogglProjectId,
    });
  }

  const updatedTogglTask = await toggl.tasks.put({
    axiosClient: context.axiosClient,
    path: {
      workspace_id: context.togglWorkspaceId,
      project_id: togglTask.project_id,
      task_id: togglTask.id,
    },
    body: {
      // Toggl Tasks must have a name
      name: !!timesheeterTask.name ? timesheeterTask.name : 'Unnamed task',
      active: true,
      estimated_seconds: 0,
      workspace_id: context.togglWorkspaceId,
      user_id: null,
      project_id: updatedTogglProjectId,
    },
  });

  return {
    togglTask: { ...updatedTogglTask, deleted: false as const },
    timesheeterTask,
  };
};

const handleRecreateTogglTask = async ({
  context,
  timesheeterTask,
  oldTogglTask,
  updatedTogglProjectId,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  oldTogglTask: TogglTask & {
    deleted: false;
  };
  updatedTogglProjectId: number;
}): Promise<TaskPair> => {
  // Need to create a new task in the new toggl project, update the projectId in timesheeter, create a new sync record,
  // transfer all time entries to the new task, and delete the old task

  const newTogglTask = await getOrCreateExistingTogglTask({
    context,
    oldTogglTask,
    timesheeterTask,
    updatedTogglProjectId,
  });

  // Update the timesheeter task to point to the new toggl task
  const updatedTimesheeterTask = await context.prisma.task
    .update({
      where: {
        id: timesheeterTask.id,
      },
      data: {
        togglTaskId: newTogglTask.id,
        name: newTogglTask.name,
      },
      select: timesheeterTaskSelectQuery,
    })
    .then((task) => parseTask(task, false));

  // Need to create a new data as far back in time that overrides the scan period
  const maxPeriodStartDate = new Date();
  maxPeriodStartDate.setUTCDate(maxPeriodStartDate.getUTCDate() - togglMaxScanPeriod);

  // Transfer all time entries to the new task
  const togglTimeEntries = await toggl.reports.search
    .timeEntries({
      axiosClient: context.axiosClient,
      path: {
        workspace_id: context.togglWorkspaceId,
      },
      query: {
        start_date: maxPeriodStartDate.toISOString(),
        end_date: context.endDate.toISOString(),
      },
    })
    .then((timeEntries) =>
      timeEntries.filter(
        (timeEntry) => timeEntry.task_id === oldTogglTask.id && timeEntry.project_id === oldTogglTask.project_id
      )
    );

  await Promise.all(
    togglTimeEntries.map((timeEntry) => {
      if (!timeEntry.project_id) {
        throw new Error(`Toggl time entry ${timeEntry.id} has no project_id`);
      }

      return toggl.timeEntries.put({
        axiosClient: context.axiosClient,
        path: {
          workspace_id: context.togglWorkspaceId,
          time_entry_id: timeEntry.id,
        },
        body: {
          task_id: newTogglTask.id,
          created_with: 'timesheeter',
          tag_action: 'add',
          description: timeEntry.description ?? '',
          project_id: updatedTogglProjectId,
          tag_ids: [],
          start: timeEntry.start,
          stop: timeEntry.stop,
          user_id: timeEntry.user_id,
          workspace_id: timeEntry.workspace_id,
          billable: timeEntry.billable,
        },
      });
    })
  );

  // Delete the old task
  await toggl.tasks.delete({
    axiosClient: context.axiosClient,
    path: {
      workspace_id: context.togglWorkspaceId,
      project_id: oldTogglTask.project_id,
      task_id: oldTogglTask.id,
    },
  });

  return {
    togglTask: { ...newTogglTask, deleted: false as const },
    timesheeterTask: updatedTimesheeterTask,
  };
};

const getOrCreateExistingTogglTask = async ({
  context,
  timesheeterTask,
  oldTogglTask,
  updatedTogglProjectId,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  oldTogglTask: TogglTask & {
    deleted: false;
  };
  updatedTogglProjectId: number;
}) => {
  // See if a toggl task already exists in the new project with the same name
  const existingTogglTask = await toggl.tasks
    .get({
      axiosClient: context.axiosClient,
      path: {
        workspace_id: context.togglWorkspaceId,
        project_id: updatedTogglProjectId,
      },
    })
    .then((tasks) => tasks.find((task) => task.name === oldTogglTask.name));

  let taskName = timesheeterTask.name;

  if (existingTogglTask) {
    taskName = `${taskName} (name conflict)`;
  }

  // Create a new task in Toggl
  const newTogglTask = await toggl.tasks.post({
    axiosClient: context.axiosClient,
    path: {
      workspace_id: context.togglWorkspaceId,
      project_id: updatedTogglProjectId,
    },
    body: {
      // Toggl Tasks must have a name
      name: taskName,
      active: true,
      estimated_seconds: 0,
      workspace_id: context.togglWorkspaceId,
      user_id: null,
      project_id: updatedTogglProjectId,
    },
  });

  // Create a new sync record as we have a new toggl entity
  await context.prisma.togglSyncRecord.create({
    data: {
      workspaceId: context.workspaceId,
      togglEntityId: newTogglTask.id,
      category: togglTaskSyncRecordType,
      togglProjectId: newTogglTask.project_id,
    },
    select: togglSyncRecordSelectQuery,
  });

  return newTogglTask;
};
