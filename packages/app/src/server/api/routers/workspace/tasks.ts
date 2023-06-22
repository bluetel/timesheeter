import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/app/server/api/trpc";
import {
  createTaskSchema,
  TASK_DEFINITIONS,
  updateTaskSchema,
  type TaskConfig,
  type UpdateTaskConfig,
  updateTaskConfigSchema,
} from "@timesheeter/app/lib/workspace/tasks";
import {
  decrypt,
  encrypt,
  filterConfig,
} from "@timesheeter/app/server/lib/secret-helpers";
import { type Task, type PrismaClient } from "@prisma/client";

export const tasksRouter = createTRPCRouter({
  list: protectedProcedure
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

      return ctx.prisma.task
        .findMany({
          where: {
            workspaceId: input.workspaceId,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                taskPrefix: true,
              },
            },
          },
        })
        .then((tasks) => tasks.map((task) => parseTask(task)));
    }),
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        taskId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config, ...rest } = input;

      const createdTask = await ctx.prisma.task
        .create({
          data: {
            ...rest,
            configSerialized: encrypt(JSON.stringify(config)),
          },
        })
        .then(parseTask);

      return createdTask;
    }),
  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { config: oldConfig } = await authorize({
        prisma: ctx.prisma,
        taskId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config: updatedConfigValues, ...rest } = input;

      // Config is a single field, so we need to merge it manually
      const updatedConfig = {
        ...oldConfig,
        ...updatedConfigValues,
      } satisfies UpdateTaskConfig;

      // Validate the config against the config schema to double check everything
      // has been merged correctly
      updateTaskConfigSchema.parse(updatedConfig);

      await ctx.prisma.task
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
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

type WithConfig = {
  configSerialized: string;
  [key: string]: unknown;
};

export type ParsedTask<TaskType extends WithConfig> = Omit<
  TaskType,
  "configSerialized"
> & {
  config: TaskConfig;
};

export const parseTask = <TaskType extends WithConfig>(
  task: TaskType,
  safe = true
): ParsedTask<TaskType> => {
  const { configSerialized, ...rest } = task;

  const config = JSON.parse(decrypt(configSerialized)) as TaskConfig;

  return {
    ...rest,
    config: safe
      ? filterConfig<TaskConfig>(
          config,
          TASK_DEFINITIONS[config.type].fields,
          config.type
        )
      : config,
  };
};

type AuthorizeParams<TaskId extends string | null> = {
  prisma: PrismaClient;
  taskId: TaskId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<TaskId extends string | null> = TaskId extends null
  ? null
  : ParsedTask<Task>;

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
      code: "NOT_FOUND",
      message: "You are not a member of this workspace",
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
      code: "NOT_FOUND",
      message: "Task not found",
    });
  }

  if (task.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task not found",
    });
  }

  return parseTask(task) as AuthorizeResult<TaskId>;
};
