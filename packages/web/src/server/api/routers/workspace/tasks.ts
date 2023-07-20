import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@timesheeter/web/server/api/trpc';
import {
  createTaskSchema,
  TASK_DEFINITIONS,
  updateTaskSchema,
  type TaskConfig,
  type UpdateTaskConfig,
  updateTaskConfigSchema,
} from '@timesheeter/web/lib/workspace/tasks';
import { decrypt, encrypt, filterConfig } from '@timesheeter/web/server/lib/secret-helpers';
import { type Task, type PrismaClient } from '@prisma/client';
import { type WithConfig } from '@timesheeter/web/server/lib/workspace-types';
import { API_PAGINATION_LIMIT } from '@timesheeter/web/server/lib';

export const tasksRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        page: z.number().int().positive().default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        taskId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const taskCountPromise = ctx.prisma.task.count({
        where: {
          workspaceId: input.workspaceId,
          OR: [
            {
              scopedUserId: null,
            },
            {
              scopedUserId: ctx.session.user.id,
            },
          ],
        },
      });

      const tasksPromise = ctx.prisma.task
        .findMany({
          where: {
            workspaceId: input.workspaceId,
            OR: [
              {
                scopedUserId: null,
              },
              {
                scopedUserId: ctx.session.user.id,
              },
            ],
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            taskPrefix: {
              select: {
                id: true,
                prefix: true,
              },
            },
          },
          skip: (input.page - 1) * API_PAGINATION_LIMIT,
          take: API_PAGINATION_LIMIT,
        })
        .then((tasks) => tasks.map((task) => parseTask(task)));

      const [taskCount, tasks] = await Promise.all([taskCountPromise, tasksPromise]);

      return {
        count: taskCount,
        page: input.page,
        next: taskCount > input.page * API_PAGINATION_LIMIT ? input.page + 1 : null,
        data: tasks,
      };
    }),
  listMinimal: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        taskId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.task.findMany({
        where: {
          workspaceId: input.workspaceId,
        },
        select: {
          id: true,
          name: true,
        },
      });
    }),
  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    await authorize({
      prisma: ctx.prisma,
      taskId: null,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config, scoped, ...rest } = input;

    const createdTask = await ctx.prisma.task
      .create({
        data: {
          ...rest,
          scopedUserId: scoped ? ctx.session.user.id : null,
          configSerialized: encrypt(JSON.stringify(config)),
        },
      })
      .then(parseTask);

    return createdTask;
  }),
  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    const { config: oldConfig } = await authorize({
      prisma: ctx.prisma,
      taskId: input.id,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config: updatedConfigValues, scoped, ...rest } = input;

    // Config is a single field, so we need to merge it manually
    const updatedConfig = {
      ...oldConfig,
      ...updatedConfigValues,
    } satisfies UpdateTaskConfig;

    // Validate the config against the config schema to double check everything
    // has been merged correctly
    updateTaskConfigSchema.parse(updatedConfig);

    const scopedUserId = scoped ? ctx.session.user.id : null;

    // If scoped and timesheetEntries exist to users other than the current user,
    // then throw an error
    if (scopedUserId) {
      const timesheetEntries = await ctx.prisma.timesheetEntry.findMany({
        where: {
          taskId: input.id,
          userId: {
            not: scopedUserId,
          },
        },
      });

      if (timesheetEntries.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This task has timesheet entries that belong to other users, it cannot be set as private',
        });
      }
    }

    await ctx.prisma.task
      .update({
        where: {
          id: input.id,
        },
        data: {
          ...rest,
          scopedUserId,
          configSerialized: encrypt(JSON.stringify(updatedConfig)),
        },
      })
      .then(parseTask);
  }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        taskId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const deletedTask = await ctx.prisma.task
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseTask);

      return deletedTask;
    }),
});

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

type AuthorizeResult<TaskId extends string | null> = TaskId extends null ? null : ParsedTask<Task>;

const authorize = async <TaskId extends string | null>({
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
