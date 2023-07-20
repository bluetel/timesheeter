import { TRPCError } from '@trpc/server';
import { TASK_DEFINITIONS, type TaskConfig } from '@timesheeter/web/lib/workspace/tasks';
import { decrypt, filterConfig } from '@timesheeter/web/server/lib/secret-helpers';
import { type Task, type PrismaClient } from '@prisma/client';
import { type WithConfig } from '@timesheeter/web/server/lib/workspace-types';

export type ParsedTask<TaskType extends WithConfig> = Omit<TaskType, 'configSerialized' | 'scopedUserId'> & {
  config: TaskConfig;
  scoped: boolean;
};

export const parseTask = <TaskType extends WithConfig>(task: TaskType, safe = true): ParsedTask<TaskType> => {
  const { configSerialized, scopedUserId, ...rest } = task;

  const config = JSON.parse(decrypt(configSerialized)) as TaskConfig;

  return {
    ...rest,
    scoped: !!scopedUserId,
    config: safe ? filterConfig<TaskConfig>(config, TASK_DEFINITIONS[config.type].fields, config.type) : config,
  };
};

type AuthorizeParams<TaskId extends string | null> = {
  prisma: PrismaClient;
  taskId: TaskId;
  workspaceId: string;
  userId: string;
};

type ParsedTicketForTask = Task & {
  ticketForTask: {
    number: number;
    id: string;
    taskPrefix: {
      id: string;
      prefix: string;
    };
  } | null;
};

type AuthorizeResult<TaskId extends string | null> = TaskId extends null ? null : ParsedTask<ParsedTicketForTask>;

export const authorize = async <TaskId extends string | null>({
  prisma,
  taskId,
  workspaceId,
  userId,
}: AuthorizeParams<TaskId>): Promise<AuthorizeResult<TaskId>> => {
  const membership = await prisma.membership.findMany({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'You are not a member of this workspace',
    });
  }

  if (!taskId) {
    return null as AuthorizeResult<TaskId>;
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
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
    },
  });

  if (!task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found',
    });
  }

  if (task.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Task not found',
    });
  }

  if (task.scopedUserId && task.scopedUserId !== userId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'That task is private and does not belong to you',
    });
  }

  return parseTask(task, false) as AuthorizeResult<TaskId>;
};

/** Ensure a requested task prefix is in the workspace */
export const authorizeTaskPrefix = async ({
  workspaceId,
  projectId,
  taskPrefixId,
  prisma,
}: {
  workspaceId: string;
  projectId: string | null;
  taskPrefixId: string;
  prisma: PrismaClient;
}) => {
  const taskPrefix = await prisma.taskPrefix.findUnique({
    where: {
      id: taskPrefixId,
    },
  });

  if (!taskPrefix) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Task prefix not found',
    });
  }

  if (taskPrefix.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Task prefix not found',
    });
  }

  if (!projectId) return;

  if (taskPrefix.projectId !== projectId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Task prefix not found',
    });
  }
};
