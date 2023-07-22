import { z } from 'zod';
import { protectedProcedure } from '@timesheeter/web/server/api/trpc';
import { authorize } from './lib';
import { deleteTask } from '@timesheeter/web/server/deletion';

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

    await deleteTask({
      prisma: ctx.prisma,
      taskId: input.id,
    });
  });
