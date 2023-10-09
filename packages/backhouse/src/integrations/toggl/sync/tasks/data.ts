import { parseTask } from '@timesheeter/web';
import { type RawTogglTask, toggl } from '../../api';
import { type TogglIntegrationContext } from '../../lib';
import { type EvaluatedProjectPair } from '../projects';
import { type TogglTaskSyncRecord, togglSyncRecordSelectQuery, togglTaskSyncRecordType } from '../../sync-records';

export type TogglTask =
  | (RawTogglTask & {
      deleted: false;
    })
  | ({
      deleted: true;
    } & TogglTaskSyncRecord);

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
  ).then((tasks) => tasks.flat().map((task) => ({ ...task, deleted: false as const })));

  const togglTaskSyncRecordsPromise = prisma.togglSyncRecord.findMany({
    where: {
      workspaceId,
      category: togglTaskSyncRecordType,
    },
    select: togglSyncRecordSelectQuery,
  }) as Promise<TogglTaskSyncRecord[]>;

  const timesheeterTasksPromise = prisma.task
    .findMany({
      where: {
        workspaceId,
      },
      select: timesheeterTaskSelectQuery,
    })
    .then((tasks) => tasks.map((task) => parseTask(task, false)));

  const [togglTasks, togglTaskSyncRecords, timesheeterTasks] = await Promise.all([
    togglTasksPromise,
    togglTaskSyncRecordsPromise,
    timesheeterTasksPromise,
  ]);

  return {
    togglTasks,
    togglTaskSyncRecords,
    timesheeterTasks,
  };
};

export type TimesheeterTask = Awaited<ReturnType<typeof getTaskData>>['timesheeterTasks'][0];

export type TaskPair = {
  togglTask: TogglTask | null;
  timesheeterTask: TimesheeterTask | null;
};

/** Once we have synced tasks each pair always has a toggl task, though it
 * may be marked as deleted
 */
export type EvaluatedTaskPair = {
  togglTask: TogglTask & {
    deleted: false;
  };
  timesheeterTask: TimesheeterTask | null;
};

export const timesheeterTaskSelectQuery = {
  id: true,
  updatedAt: true,
  name: true,
  deleted: true,
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
  const { togglTasks, timesheeterTasks, togglTaskSyncRecords } = await getTaskData({ context, syncedProjectPairs });

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

  // Add togglTaskSyncRecords that are not present in togglTasks
  const togglTaskSyncRecordsWithoutTogglTask = togglTaskSyncRecords.filter(
    (togglTaskSyncRecord) => !togglTasks.find((togglTask) => togglTask.id === Number(togglTaskSyncRecord.togglEntityId))
  );

  togglTaskSyncRecordsWithoutTogglTask.forEach((togglTaskSyncRecord) => {
    const timesheeterTask = timesheeterTasks.find(
      (timesheeterTask) => timesheeterTask.togglTaskId === togglTaskSyncRecord.togglEntityId
    );

    if (timesheeterTask) {
      taskPairs.push({
        togglTask: {
          ...togglTaskSyncRecord,
          deleted: true,
        },
        timesheeterTask,
      });
    }
  });

  return taskPairs;
};
