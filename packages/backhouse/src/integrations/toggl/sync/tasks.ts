import { encrypt, getDefaultTaskConfig, parseTask } from '@timesheeter/web';
import { toggl, TogglTask } from '../api';
import { TogglIntegrationContext } from '../lib';
import { EvaluatedProjectPair } from './projects';

type TaskPair = {
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

export const syncTasks = async ({
  context,
  syncedProjectPairs,
}: {
  context: TogglIntegrationContext;
  syncedProjectPairs: EvaluatedProjectPair[];
}): Promise<EvaluatedTaskPair[]> => {
  const taskPairs = await createTaskPairs({ context, syncedProjectPairs });

  // As we update the timesheeter tasks in the loop, we need to store the updated tasks
  const updatedTaskPairs = [] as TaskPair[];

  // Loop through all task pairs and create/update/delete tasks as needed
  for (const taskPair of taskPairs) {
    const { togglTask, timesheeterTask } = taskPair;

    // If both tasks exist, update the timesheeter task with the toggl task data
    if (togglTask && !togglTask.deleted && timesheeterTask) {
      // If both unchanged, skip
      if (
        togglTask.name === timesheeterTask.name &&
        BigInt(togglTask.id) === timesheeterTask.togglTaskId &&
        togglTask.project_id.toString() === timesheeterTask.project?.id.toString()
      ) {
        updatedTaskPairs.push(taskPair);
        continue;
      }

      // Check to see which task has been updated more recently, then copy the data from the newer task to the older one

      if (togglTask.at > timesheeterTask.updatedAt) {
        // Update the timesheeter task with the toggl task data
        const updatedTimesheeterProjectId = syncedProjectPairs.find(
          (projectPair) => projectPair.togglProject.id === togglTask.project_id
        )?.timesheeterProject?.id;

        if (!updatedTimesheeterProjectId) {
          throw new Error(
            `updateTimesheeterTask error - could not find timesheeter project for toggl project ${togglTask.project_id}`
          );
        }

        updatedTaskPairs.push(
          await updateTimesheeterTask({ context, timesheeterTask, togglTask, updatedTimesheeterProjectId })
        );
        continue;
      }

      const updatedTogglProjectId = syncedProjectPairs.find(
        (projectPair) => projectPair.timesheeterProject?.id === timesheeterTask.projectId
      )?.togglProject.id;

      if (!updatedTogglProjectId) {
        throw new Error(
          `updateTogglTask error - could not find toggl project for timesheeter project ${timesheeterTask.projectId}`
        );
      }

      // Update the toggl task with the timesheeter task data
      updatedTaskPairs.push(await updateTogglTask({ context, timesheeterTask, togglTask, updatedTogglProjectId }));
      continue;
    }

    // If only the toggl task exists and not deleted, create a new timesheeter task
    if (togglTask && !togglTask.deleted && !timesheeterTask) {
      const timesheeterProjectId = syncedProjectPairs.find(
        (projectPair) => projectPair.togglProject.id === togglTask.project_id
      )?.timesheeterProject?.id;

      if (!timesheeterProjectId) {
        throw new Error(
          `createTimesheeterTask error - could not find timesheeter project for toggl project ${togglTask.project_id}`
        );
      }

      updatedTaskPairs.push(await createTimesheeterTask({ context, togglTask, timesheeterProjectId }));
      continue;
    }

    // If only the timesheeter task exists, create a new toggl task
    if (!togglTask && timesheeterTask) {
      const togglProjectId = syncedProjectPairs.find(
        (projectPair) => projectPair.timesheeterProject?.id === timesheeterTask.projectId
      )?.togglProject.id;

      if (!togglProjectId) {
        throw new Error(
          `createTogglTask error - could not find toggl project for timesheeter project ${timesheeterTask.projectId}`
        );
      }

      updatedTaskPairs.push(await createTogglTask({ context, timesheeterTask, togglProjectId }));
      continue;
    }

    // If only the toggl task exists and is deleted, delete the timesheeter task
    if (togglTask && togglTask.deleted && timesheeterTask) {
      updatedTaskPairs.push(await deleteTimesheeterTask({ context, togglTask }));
      continue;
    }

    console.warn('Unreachable code reached in syncTasks');
    updatedTaskPairs.push(taskPair);
  }

  // Ensure that all pairs have a toggl task
  return updatedTaskPairs
    .map((taskPair) => {
      if (taskPair.togglTask) {
        return taskPair as EvaluatedTaskPair;
      }

      return null;
    })
    .filter((taskPair): taskPair is EvaluatedTaskPair => !!taskPair);
};

const createTaskPairs = async ({
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

const timesheeterTaskSelectQuery = {
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

type TimesheeterTask = Awaited<ReturnType<typeof getTaskData>>['timesheeterTasks'][0];

const updateTimesheeterTask = async ({
  context: { prisma },
  togglTask,
  timesheeterTask,
  updatedTimesheeterProjectId,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask;
  timesheeterTask: TimesheeterTask;
  updatedTimesheeterProjectId: string;
}): Promise<TaskPair> => {
  const updatedTimesheeterTask = await prisma.task
    .update({
      where: {
        id: timesheeterTask.id,
      },
      data: {
        name: togglTask.name,
        togglTaskId: togglTask.id,
        projectId: updatedTimesheeterProjectId,
      },
      select: timesheeterTaskSelectQuery,
    })
    .then((task) => parseTask(task, false));

  return {
    togglTask,
    timesheeterTask: updatedTimesheeterTask,
  };
};

const updateTogglTask = async ({
  context: { axiosClient, togglWorkspaceId },
  timesheeterTask,
  togglTask,
  updatedTogglProjectId,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  togglTask: TogglTask;
  updatedTogglProjectId: number;
}): Promise<TaskPair> => {
  const updatedTogglTask = await toggl.tasks.put({
    axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      project_id: updatedTogglProjectId,
      task_id: togglTask.id,
    },
    body: {
      name: timesheeterTask.name,
      active: true,
      estimated_seconds: null,
      workspace_id: togglWorkspaceId,
      user_id: null,
      project_id: updatedTogglProjectId,
    },
  });

  return {
    togglTask: updatedTogglTask,
    timesheeterTask,
  };
};

const createTimesheeterTask = async ({
  context: { prisma, workspaceId },
  togglTask,
  timesheeterProjectId,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask;
  timesheeterProjectId: string;
}): Promise<TaskPair> => {
  const timesheeterTask = await prisma.task
    .create({
      data: {
        name: togglTask.name,
        workspaceId,
        configSerialized: encrypt(JSON.stringify(getDefaultTaskConfig())),
        togglTaskId: togglTask.id,
        projectId: timesheeterProjectId,
      },
      select: timesheeterTaskSelectQuery,
    })
    .then((task) => parseTask(task, false));

  return {
    togglTask,
    timesheeterTask,
  };
};

const createTogglTask = async ({
  context: { axiosClient, prisma, togglWorkspaceId },
  timesheeterTask,
  togglProjectId,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  togglProjectId: number;
}): Promise<TaskPair> => {
  const togglTask = await toggl.tasks.post({
    axiosClient: axiosClient,
    path: { workspace_id: togglWorkspaceId, project_id: togglProjectId },
    body: {
      name: timesheeterTask.name,
      active: true,
      estimated_seconds: null,
      workspace_id: togglWorkspaceId,
      project_id: togglProjectId,
      user_id: null,
    },
  });

  const updatedTimesheeterTask = await prisma.task
    .update({
      where: {
        id: timesheeterTask.id,
      },
      data: {
        togglTaskId: togglTask.id,
      },
      select: timesheeterTaskSelectQuery,
    })
    .then((task) => parseTask(task, false));

  return {
    togglTask,
    timesheeterTask: updatedTimesheeterTask,
  };
};

const deleteTimesheeterTask = async ({
  context: { prisma, workspaceId },
  togglTask,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask;
}): Promise<TaskPair> => {
  await prisma.project.deleteMany({
    where: {
      workspaceId: workspaceId,
      togglProjectId: togglTask.id,
    },
  });

  return {
    togglTask,
    timesheeterTask: null,
  };
};
