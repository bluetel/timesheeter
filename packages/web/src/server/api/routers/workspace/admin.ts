import { type PrismaClient } from '@prisma/client';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const adminToolsRouter = createTRPCRouter({
  purgeTimesheetEntryRaw: protectedProcedure
    .input(
      z.object({
        timesheetEntryId: z.string(),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureIsAdmin({
        prisma: ctx.prisma,
        userId: ctx.session.user.id,
        workspaceId: input.workspaceId,
      });

      await deleteTimesheeterTimesheetEntry({
        prisma: ctx.prisma,
        workspaceId: input.workspaceId,
        timesheetEntryId: input.timesheetEntryId,
      });
    }),
  purgeTaskRaw: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureIsAdmin({
        prisma: ctx.prisma,
        userId: ctx.session.user.id,
        workspaceId: input.workspaceId,
      });

      const timesheetEntries = await ctx.prisma.timesheetEntry.findMany({
        where: {
          taskId: input.taskId,
          workspaceId: input.workspaceId,
        },
        select: {
          id: true,
        },
      });

      await Promise.all(
        timesheetEntries.map((timesheetEntry) =>
          deleteTimesheeterTimesheetEntry({
            prisma: ctx.prisma,
            workspaceId: input.workspaceId,
            timesheetEntryId: timesheetEntry.id,
          })
        )
      );

      await deleteTimesheeterTask({
        prisma: ctx.prisma,
        workspaceId: input.workspaceId,
        taskId: input.taskId,
      });
    }),
  listAllTimesheetEntriesOfTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string().nullable(),
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureIsAdmin({
        prisma: ctx.prisma,
        userId: ctx.session.user.id,
        workspaceId: input.workspaceId,
      });

      if (!input.taskId) {
        return { taskWithTimesheetEntries: null };
      }

      const taskWithTimesheetEntries = await ctx.prisma.task.findUnique({
        where: {
          id: input.taskId,
          workspaceId: input.workspaceId,
        },
        select: {
          name: true,
          togglTaskId: true,
          timesheetEntries: {
            select: {
              id: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              start: true,
              end: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return { taskWithTimesheetEntries };
    }),
});

const ensureIsAdmin = async ({
  prisma,
  userId,
  workspaceId,
}: {
  prisma: PrismaClient;
  userId: string;
  workspaceId: string;
}) => {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      workspaceId,
      role: 'owner',
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Workspace not found or you are not an owner of this workspace',
    });
  }
};

const deleteTimesheeterTimesheetEntry = async ({
  prisma,
  timesheetEntryId,
  workspaceId,
}: {
  prisma: PrismaClient;
  timesheetEntryId: string;
  workspaceId: string;
}) => {
  const deletedTimesheetEntry = await prisma.timesheetEntry.delete({
    where: {
      id: timesheetEntryId,
      workspaceId,
    },
  });

  if (deletedTimesheetEntry.togglTimeEntryId) {
    await prisma.togglSyncRecord.deleteMany({
      where: {
        togglEntityId: deletedTimesheetEntry.togglTimeEntryId,
        category: 'TimeEntry',
      },
    });
  }
};

const deleteTimesheeterTask = async ({
  prisma,
  taskId,
  workspaceId,
}: {
  prisma: PrismaClient;
  taskId: string;
  workspaceId: string;
}) => {
  const deletedTask = await prisma.task.delete({
    where: {
      id: taskId,
      workspaceId,
    },
  });

  if (deletedTask.togglTaskId) {
    await prisma.togglSyncRecord.deleteMany({
      where: {
        togglEntityId: deletedTask.togglTaskId,
        category: 'Task',
      },
    });
  }
};
