import { TRPCError } from '@trpc/server';
import { protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { createTaskSchema } from '@timesheeter/web/lib/workspace/tasks';
import { encrypt } from '@timesheeter/web/server/lib/secret-helpers';
import { authorize, authorizeTaskPrefix, parseTask } from './lib';

export const createTaskProcedure = protectedProcedure
  .input(
    createTaskSchema.transform((data) => {
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
    await authorize({
      prisma: ctx.prisma,
      taskId: null,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config, scoped, taskPrefixId, taskNumber, ...rest } = input;

    if (taskPrefixId) {
      await authorizeTaskPrefix({
        prisma: ctx.prisma,
        workspaceId: rest.workspaceId,
        projectId: rest.projectId,
        taskPrefixId: taskPrefixId,
      });
    }

    const createdTask = await ctx.prisma.task
      .create({
        data: {
          ...rest,
          scopedUserId: scoped ? ctx.session.user.id : null,
          configSerialized: encrypt(JSON.stringify(config)),
          ticketForTask:
            taskNumber && taskPrefixId
              ? {
                  create: {
                    workspace: {
                      connect: {
                        id: rest.workspaceId,
                      },
                    },
                    number: taskNumber,
                    taskPrefix: {
                      connect: {
                        id: taskPrefixId,
                      },
                    },
                  },
                }
              : undefined,
        },
      })
      .then(parseTask);

    return createdTask;
  });
