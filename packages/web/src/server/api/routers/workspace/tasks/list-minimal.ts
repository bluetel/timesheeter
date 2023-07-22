import { z } from 'zod';
import { protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { authorize } from './lib';

export const listMinimalTasksProcedure = protectedProcedure
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
        deleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });
  });
