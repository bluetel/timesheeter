import { z } from 'zod';
import { protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { API_PAGINATION_LIMIT } from '@timesheeter/web/server/lib';
import { authorize, parseTask } from './lib';

export const listTasksProcedure = protectedProcedure
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
        deleted: false,
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
          deleted: false,
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
        skip: (input.page - 1) * API_PAGINATION_LIMIT,
        take: API_PAGINATION_LIMIT,
        orderBy: {
          createdAt: 'desc',
        },
      })
      .then((tasks) => tasks.map((task) => parseTask(task)));

    const [taskCount, tasks] = await Promise.all([taskCountPromise, tasksPromise]);

    return {
      count: taskCount,
      page: input.page,
      next: taskCount > input.page * API_PAGINATION_LIMIT ? input.page + 1 : null,
      data: tasks,
    };
  });
