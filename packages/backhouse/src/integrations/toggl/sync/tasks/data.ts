import { parseTask } from '@timesheeter/web';
import { TogglTask, toggl } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { EvaluatedProjectPair } from '../projects';

export type TaskPair = {
  togglTask: TogglTask | null;
  timesheeterTask: TimesheeterTask | null;
};

/** Once we have synced tasks each pair always has a toggl task, though it
 * may be marked as deleted
 */
export type EvaluatedTaskPair = {
  togglTask: TogglTask;
  timesheeterTask: TimesheeterTask | null;
};

export const timesheeterTaskSelectQuery = {
  id: true,
  updatedAt: true,
  name: true,
  projectId: true,
  togglTaskId: true,
  configSerialized: true,
  project: {
    select: {
      id: true,
      togglProjectId: true,
    },
  },
  ticketForTask: {
    select: {
      id: true,
      number: true,
      taskPrefix: {
        select: {
          id: true,
          prefix: true,
        },
      },
    },
  },
};

export const createTaskPairs = async ({
  context,
  syncedProjectPairs,
}: {
  context: TogglIntegrationContext;
  syncedProjectPairs: EvaluatedProjectPair[];
}): Promise<TaskPair[]> => {
  const { togglTasks, timesheeterTasks } = await getTaskData({ context, syncedProjectPairs });

  const taskPairs = [] as TaskPair[];

  // One toggl task can only be linked to one timesheeter task, pairs may not exist,
  // in such case a pair with null values is created
  for (const togglTask of togglTasks) {
    const timesheeterTask = timesheeterTasks.find((timesheeterTask) => {
      return timesheeterTask?.togglTaskId?.toString() === togglTask.id.toString();
    });

    taskPairs.push({
      togglTask,
      timesheeterTask: timesheeterTask ?? null,
    });
  }

  const timesheeterTasksWithoutTogglTask = timesheeterTasks.filter((timesheeterTask) => {
    return !timesheeterTask.togglTaskId;
  });

  timesheeterTasksWithoutTogglTask.forEach((timesheeterTask) => {
    taskPairs.push({
      togglTask: null,
      timesheeterTask,
    });
  });

  return taskPairs;
};

const getTaskData = async ({
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient },
  syncedProjectPairs,
}: {
  context: TogglIntegrationContext;
  syncedProjectPairs: EvaluatedProjectPair[];
}) => {
  const togglTasksPromise = Promise.all(
    syncedProjectPairs.map(async ({ togglProject }) =>
      toggl.tasks.get({
        axiosClient,
        path: {
          workspace_id: togglWorkspaceId,
          project_id: togglProject.id,
        },
      })
    )
  ).then((tasks) => tasks.flat());

  const timesheeterTasksPromise = prisma.task
    .findMany({
      where: {
        workspaceId,
      },
      select: timesheeterTaskSelectQuery,
    })
    .then((tasks) => tasks.map((task) => parseTask(task, false)));

  const [togglTasks, timesheeterTasks] = await Promise.all([togglTasksPromise, timesheeterTasksPromise]);

  return {
    togglTasks,
    timesheeterTasks,
  };
};

export type TimesheeterTask = Awaited<ReturnType<typeof getTaskData>>['timesheeterTasks'][0];
