import { createTRPCRouter, devToolsEnabledProcedure } from '../trpc';
import { z } from 'zod';

export const devToolsRouter = createTRPCRouter({
  deleteTimesheetEntries: devToolsEnabledProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.timesheetEntry.deleteMany({
        where: {
          workspaceId: input.workspaceId,
        },
      });
    }),
  deleteTasks: devToolsEnabledProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.task.deleteMany({
        where: {
          workspaceId: input.workspaceId,
        },
      });
    }),
  deleteProjects: devToolsEnabledProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.project.deleteMany({
        where: {
          workspaceId: input.workspaceId,
        },
      });
    }),
  deleteTogglSyncRecords: devToolsEnabledProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.togglSyncRecord.deleteMany({
        where: {
          workspaceId: input.workspaceId,
        },
      });
    }),
});
