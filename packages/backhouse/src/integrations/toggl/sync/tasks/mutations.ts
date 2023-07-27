import {
  ProjectConfig,
  deleteTask,
  encrypt,
  getDefaultTaskConfig,
  matchTaskRegex,
  parseProject,
  parseTask,
} from '@timesheeter/web';
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
      project_id: togglTask.project_id,
      task_id: togglTask.id,
    },
    body: {
      // Toggl Tasks must have a name
      name: !!timesheeterTask.name ? timesheeterTask.name : 'Unnamed task',
      active: true,
      estimated_seconds: 0,
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
  const matchResult = matchTaskRegex(togglTask.name);

  const getTicketForTask = async () => {
    if (matchResult.variant === 'no-task') {
      return undefined;
    }

    let taskPrefix = await prisma.taskPrefix.findUnique({
      where: {
        prefix_workspaceId: {
          prefix: matchResult.prefix,
          workspaceId,
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

  const timesheeterTask = await prisma.task
    .create({
      data: {
        name: matchResult.variant === 'no-task' ? togglTask.name : '',
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
  context: { axiosClient, prisma, togglWorkspaceId },
  timesheeterTask,
  togglProjectId,
}: {
  context: TogglIntegrationContext;
  timesheeterTask: TimesheeterTask;
  togglProjectId: number;
}): Promise<TaskPair> => {
  // We need to get the ticket number if there is one, as that is what will be used
  // as the task name in Toggl
  const togglTaskName =
    timesheeterTask.ticketForTask?.taskPrefix.prefix && timesheeterTask.ticketForTask?.number
      ? `${timesheeterTask.ticketForTask?.taskPrefix.prefix}-${timesheeterTask.ticketForTask?.number}`
      : timesheeterTask.name;

  const togglTask = await toggl.tasks.post({
    axiosClient: axiosClient,
    path: { workspace_id: togglWorkspaceId, project_id: togglProjectId },
    body: {
      name: togglTaskName,
      active: true,
      estimated_seconds: 0,
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
  context: { prisma, workspaceId, togglWorkspaceId, axiosClient },
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

  // Delete the task from toggl, before it was just marked as to delete
  await toggl.tasks.delete({
    axiosClient: axiosClient,
    path: {
      workspace_id: togglWorkspaceId,
      project_id: togglTask.project_id,
      task_id: togglTask.id,
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
  togglTask: TogglTask;
  timesheeterTask: TimesheeterTask;
}): Promise<TaskPair> => {
  // Altough we have to set as inactive to delete from inside toggl, we can still
  // delete the task from timesheeter
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
