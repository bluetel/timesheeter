import { deleteTask, encrypt, getDefaultTaskConfig, parseTask } from '@timesheeter/web';
import { TogglTask, toggl } from '../../api';
import { TogglIntegrationContext } from '../../lib';
import { TaskPair, TimesheeterTask, timesheeterTaskSelectQuery } from './data';

export const updateTimesheeterTask = async ({
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

export const updateTogglTask = async ({
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

export const createTimesheeterTask = async ({
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

export const createTogglTask = async ({
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

export const deleteTimesheeterTask = async ({
  context: { prisma, workspaceId },
  togglTask,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask;
}): Promise<TaskPair> => {
  const timesheeterTask = await prisma.task.findFirst({
    where: {
      togglTaskId: togglTask.id,
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (timesheeterTask) {
    await deleteTask({ prisma, taskId: timesheeterTask.id });
  }

  return {
    togglTask,
    timesheeterTask: null,
  };
};

export const deleteTogglTask = async ({
  context: { axiosClient, togglWorkspaceId },
  togglTask,
  timesheeterTask,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask;
  timesheeterTask: TimesheeterTask;
}): Promise<TaskPair> => {
  await toggl.tasks.delete({
    axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      project_id: togglTask.project_id,
      task_id: togglTask.id,
    },
  });

  return {
    togglTask: null,
    timesheeterTask,
  };
};
