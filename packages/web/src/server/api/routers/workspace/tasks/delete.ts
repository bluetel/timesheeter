import { z } from 'zod';
import { protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { authorize, parseTask } from './lib';

export const deleteTaskProcedure = protectedProcedure
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
  });
