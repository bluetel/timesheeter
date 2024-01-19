import {
  type ProjectConfig,
  encrypt,
  getDefaultTaskConfig,
  matchTaskRegex,
  parseProject,
  parseTask,
  type MatchedTaskResult,
  isPrismaClientKnownRequestError,
} from '@timesheeter/web';
import { type TogglIntegrationContext } from '../../../lib';
import { type TaskPair, type TogglTask, timesheeterTaskSelectQuery } from '../data';

export const createTimesheeterTask = async ({
  context,
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

  console.log('Creating timesheeter task', togglTask.name, matchResult);

  const tryCreateTimesheeterTask = async () =>
    await context.prisma.task
      .create({
        data: {
          name: matchResult.variant === 'description-based' ? matchResult.taskName : '',
          configSerialized: encrypt(JSON.stringify(getDefaultTaskConfig())),
          togglTaskId: togglTask.id,
          projectId: timesheeterProjectId,
          workspaceId: context.workspaceId,
          ticketForTask: await getTicketForTaskQuery({
            context,
            matchResult,
            timesheeterProjectId,
          }),
        },
        select: timesheeterTaskSelectQuery,
      })
      .then((task) => parseTask(task, false));

  try {
    const timesheeterTask = await tryCreateTimesheeterTask();
    return {
      togglTask,
      timesheeterTask,
    };
  } catch (error) {
    if (!isPrismaClientKnownRequestError(error)) {
      throw error;
    }

    // Sometimes if a sync fails and is retried, the task already exists, so purge
    // the existing one if no entries are associated with it.
    if (error.code !== 'P2002') {
      throw error;
    }

    const existingTask = await context.prisma.task.findFirstOrThrow({
      where: {
        togglTaskId: togglTask.id,
        workspaceId: context.workspaceId,
      },
      select: {
        id: true,
        timesheetEntries: {
          select: {
            id: true,
          },
        },
      },
    });

    if (existingTask.timesheetEntries.length > 0) {
      console.log(`Task ${existingTask.id} already exists and has timesheet entries, skipping deletion`);
      throw error;
    }

    const deletedTask = await context.prisma.task.delete({
      where: {
        id: existingTask.id,
        workspaceId: context.workspaceId,
      },
      select: {
        id: true,
        togglTaskId: true,
      },
    });

    if (deletedTask.togglTaskId) {
      await context.prisma.togglSyncRecord.deleteMany({
        where: {
          togglEntityId: deletedTask.togglTaskId,
          category: 'Task',
        },
      });
    }

    return {
      togglTask,
      timesheeterTask: await tryCreateTimesheeterTask(),
    };
  }
};

const getTicketForTaskQuery = async ({
  context,
  matchResult,
  timesheeterProjectId,
}: {
  context: TogglIntegrationContext;
  matchResult: MatchedTaskResult;
  timesheeterProjectId: string;
}) => {
  if (matchResult.variant === 'description-based') {
    return undefined;
  }

  const taskPrefix = await getTaskPrefix({
    context,
    prefix: matchResult.prefix,
    timesheeterProjectId,
  });

  return {
    create: {
      number: matchResult.taskNumber,
      workspace: {
        connect: {
          id: context.workspaceId,
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

const getTaskPrefix = async ({
  context: { prisma, workspaceId },
  prefix,
  timesheeterProjectId,
}: {
  context: TogglIntegrationContext;
  prefix: string;
  timesheeterProjectId: string;
}) => {
  const existingTaskPrefix = await prisma.taskPrefix.findUnique({
    where: {
      prefix_projectId: {
        prefix,
        projectId: timesheeterProjectId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingTaskPrefix) {
    return existingTaskPrefix;
  }

  const newTaskPrefix = await prisma.taskPrefix.create({
    data: {
      projectId: timesheeterProjectId,
      prefix,
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
    taskPrefixes: [...timesheeterProject.config.taskPrefixes, prefix],
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

  return newTaskPrefix;
};
