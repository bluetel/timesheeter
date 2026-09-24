import {
  type ProjectConfig,
  deleteTask,
  encrypt,
  getDefaultTaskConfig,
  matchTaskRegex,
  parseProject,
  parseTask,
} from '@timesheeter/web';
import { toggl } from '../../../api';
import { type TogglIntegrationContext } from '../../../lib';
import { type TaskPair, type TimesheeterTask, type TogglTask, timesheeterTaskSelectQuery } from '../data';
import { togglSyncRecordSelectQuery, togglTaskSyncRecordType } from '../../../sync-records';
import { type TogglProject } from '../../projects';

export const updateTimesheeterTask = async ({
  context: { prisma },
  togglTask,
  timesheeterTask,
  updatedTimesheeterProjectId,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask & {
    deleted: false;
  };
  timesheeterTask: TimesheeterTask;
  updatedTimesheeterProjectId: string;
}): Promise<TaskPair> => {
  const matchResult = matchTaskRegex(togglTask.name);
  const updatedName = matchResult.variant === 'jira-based'
    ? matchResult.description ?? ''
    : matchResult.taskName;

  const updatedTimesheeterTask = await prisma.task
    .update({
      where: {
        id: timesheeterTask.id,
      },
      data: {
        name: updatedName,
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

export const createTimesheeterTask = async ({
  context: { prisma, workspaceId },
  togglTask,
  timesheeterProjectId,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask & {
    deleted: false;
  };
  timesheeterProjectId: string;
}): Promise<TaskPair> => {
  const matchResult = matchTaskRegex(togglTask.name);

  const getTicketForTask = async () => {
    if (matchResult.variant === 'description-based') {
      return undefined;
    }

    let taskPrefix = await prisma.taskPrefix.findUnique({
      where: {
        prefix_projectId: {
          prefix: matchResult.prefix,
          projectId: timesheeterProjectId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!taskPrefix) {
      taskPrefix = await prisma.taskPrefix.create({
        data: {
          projectId: timesheeterProjectId,
          prefix: matchResult.prefix,
          workspaceId,
        },
        select: {
          id: true,
        },
      });

      const timesheeterProject = await prisma.project
        .findUniqueOrThrow({
          where: {
            id: timesheeterProjectId,
          },
          select: {
            configSerialized: true,
          },
        })
        .then((project) => parseProject(project, false));

      const updatedConfig = {
        ...timesheeterProject.config,
        taskPrefixes: [...timesheeterProject.config.taskPrefixes, matchResult.prefix],
      } satisfies ProjectConfig;

      await prisma.project.update({
        where: {
          id: timesheeterProjectId,
        },
        data: {
          configSerialized: encrypt(JSON.stringify(updatedConfig)),
        },
        select: {
          id: true,
        },
      });
    }

    return {
      create: {
        number: matchResult.taskNumber,
        workspace: {
          connect: {
            id: workspaceId,
          },
        },
        taskPrefix: {
          connect: {
            id: taskPrefix.id,
          },
        },
      },
    };
  };

  console.log('Creating timesheeter task', togglTask.name, matchResult);

  const timesheeterTask = await prisma.task
    .create({
      data: {
        name: matchResult.variant === 'description-based' ? matchResult.taskName : '',
        workspaceId,
        configSerialized: encrypt(JSON.stringify(getDefaultTaskConfig())),
        togglTaskId: togglTask.id,
        projectId: timesheeterProjectId,
        ticketForTask: await getTicketForTask(),
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
  context: { axiosClient, prisma, togglWorkspaceId, workspaceId },
  timesheeterTask,
  togglProject,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  togglProject: TogglProject & {
    deleted: false;
  };
}): Promise<TaskPair> => {
  // We need to get the ticket number if there is one, as that is what will be used
  // as the task name in Toggl
  const togglTaskName =
    timesheeterTask.ticketForTask?.taskPrefix.prefix && timesheeterTask.ticketForTask?.number
      ? `${timesheeterTask.ticketForTask?.taskPrefix.prefix}-${timesheeterTask.ticketForTask?.number}`
      : timesheeterTask.name;

  const togglTask = await toggl.tasks.post({
    axiosClient: axiosClient,
    path: { workspace_id: togglWorkspaceId, project_id: togglProject.id },
    body: {
      name: togglTaskName,
      active: true,
      estimated_seconds: 0,
      workspace_id: togglWorkspaceId,
      project_id: togglProject.id,
      user_id: null,
    },
  });

  // Create a new sync record as we have a new toggl entity
  await prisma.togglSyncRecord.create({
    data: {
      workspaceId,
      togglEntityId: togglTask.id,
      category: togglTaskSyncRecordType,
      togglProjectId: togglTask.project_id,
    },
    select: togglSyncRecordSelectQuery,
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
    togglTask: { ...togglTask, deleted: false as const },
    timesheeterTask: updatedTimesheeterTask,
  };
};

export const deleteTimesheeterTask = async ({
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient },
  togglTask,
}: {
  context: TogglIntegrationContext;
  togglTask: TogglTask & {
    deleted: true;
  };
}): Promise<TaskPair> => {
  const timesheeterTask = await prisma.task.findFirst({
    where: {
      togglTaskId: togglTask.togglEntityId,
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (timesheeterTask) {
    await deleteTask({ prisma, taskId: timesheeterTask.id });
  }

  // Delete the task from toggl, before it was just marked as to delete
  await toggl.tasks.delete({
    axiosClient: axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      project_id: Number(togglTask.togglProjectId),
      task_id: Number(togglTask.togglEntityId),
    },
  });

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
  togglTask: TogglTask & {
    deleted: false;
  };
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

export * from './update-toggl-task';
