import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { updateTaskSchema, type UpdateTaskConfig, updateTaskConfigSchema } from '@timesheeter/web/lib/workspace/tasks';
import { encrypt } from '@timesheeter/web/server/lib/secret-helpers';
import { authorize, authorizeTaskPrefix, parseTask } from './lib';
import { type PrismaClient } from '@prisma/client';

export const updateTaskProcedure = protectedProcedure
  .input(
    updateTaskSchema.transform((data) => {
      // Ensure that if taskNumber is null, taskPrefixId is also null
      if (
        (data.taskNumber === null && data.taskPrefixId !== null) ||
        (data.taskNumber !== null && data.taskPrefixId === null)
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Task number and prefix must be both set or both unset',
        });
      }

      return data;
    })
  )
  .mutation(async ({ ctx, input }) => {
    const {
      config: oldConfig,
      projectId,
      ticketForTask,
    } = await authorize({
      prisma: ctx.prisma,
      taskId: input.id,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config: updatedConfigValues, scoped, taskPrefixId, taskNumber, ...rest } = input;

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
      await authorizeChangeTaskScope({
        scopedUserId,
        prisma: ctx.prisma,
        taskId: input.id,
      });
    }

    if (taskPrefixId) {
      await authorizeTaskPrefix({
        prisma: ctx.prisma,
        workspaceId: input.workspaceId,
        projectId,
        taskPrefixId: taskPrefixId,
      });
    }

    const existingTaskPrefix = ticketForTask?.taskPrefix;
    const existingTaskNumber = ticketForTask?.number;

    const newTaskPrefix = taskPrefixId;
    const newTaskNumber = taskNumber;

    const updatedTask = await ctx.prisma.task
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

    // If new task prefix or number undefined then do nothing
    if (newTaskPrefix === undefined || newTaskNumber === undefined) {
      return updatedTask;
    }

    // if existing task prefix and number are the same as the new ones, do nothing
    if (existingTaskPrefix?.id === newTaskPrefix && existingTaskNumber === newTaskNumber) {
      return updatedTask;
    }

    // if existing task prefix and number are different than the new ones, delete the old ticketForTask
    if (existingTaskPrefix?.id !== newTaskPrefix || existingTaskNumber !== newTaskNumber) {
      await ctx.prisma.ticketForTask.deleteMany({
        where: {
          taskId: input.id,
        },
      });
    }

    // if new task prefix and number are set, create a new ticketForTask
    if (newTaskPrefix && newTaskNumber) {
      await ctx.prisma.ticketForTask.create({
        data: {
          workspaceId: input.workspaceId,
          taskId: input.id,
          number: newTaskNumber,
          taskPrefixId: newTaskPrefix,
        },
      });
    }

    const newUpdatedTask = await ctx.prisma.task.findFirst({
      where: {
        id: input.id,
      },
      include: {
        ticketForTask: {
          select: {
            number: true,
            id: true,
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

    if (!newUpdatedTask) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Task not found after update',
      });
    }

    return parseTask(newUpdatedTask);
  });

const authorizeChangeTaskScope = async ({
  scopedUserId,
  prisma,
  taskId,
}: {
  scopedUserId: string;
  prisma: PrismaClient;
  taskId: string;
}) => {
  const timesheetEntries = await prisma.timesheetEntry.findMany({
    where: {
      taskId,
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
};
