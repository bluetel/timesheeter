import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/web/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@prisma/client";
import { NON_WORKING_PROJECT_NAME } from "@timesheeter/web/lib/workspace/projects";
import { TOIL_TASK_NAME } from "@timesheeter/web/lib/workspace/tasks";

export const monthlyTimeRouter = createTRPCRouter({
  getMonthlyStats: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        year: z.number().int().min(2020).max(2030),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const startDate = new Date(Date.UTC(input.year, input.month - 1, 1));
      const endDate = new Date(
        Date.UTC(input.year, input.month, 0, 23, 59, 59, 999)
      );

      // Get all timesheet entries for the month
      const timesheetEntries = await ctx.prisma.timesheetEntry.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
          deleted: false,
          start: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          task: {
            include: {
              project: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          start: "asc",
        },
      });

      // Calculate summary statistics
      let totalHours = 0;
      let toilHours = 0;
      let nonWorkingHours = 0;
      let workingHours = 0;

      // Group entries by day
      const dailyBreakdown = new Map<
        string,
        {
          date: string;
          totalHours: number;
          toilHours: number;
          nonWorkingHours: number;
          workingHours: number;
          entries: typeof timesheetEntries;
        }
      >();

      timesheetEntries.forEach((entry) => {
        const durationMs = entry.end.getTime() - entry.start.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        const dateKey = entry.start.toISOString().split("T")[0]!;

        if (!dailyBreakdown.has(dateKey)) {
          dailyBreakdown.set(dateKey, {
            date: dateKey,
            totalHours: 0,
            toilHours: 0,
            nonWorkingHours: 0,
            workingHours: 0,
            entries: [],
          });
        }

        const dayData = dailyBreakdown.get(dateKey)!;
        dayData.totalHours += durationHours;
        dayData.entries.push(entry);

        // Categorize hours
        if (
          entry.task.name.toUpperCase() === TOIL_TASK_NAME &&
          entry.task.project.name === NON_WORKING_PROJECT_NAME
        ) {
          dayData.toilHours += durationHours;
          toilHours += durationHours;
        } else if (entry.task.project.name === NON_WORKING_PROJECT_NAME) {
          dayData.nonWorkingHours += durationHours;
          nonWorkingHours += durationHours;
        } else {
          dayData.workingHours += durationHours;
          workingHours += durationHours;
        }

        totalHours += durationHours;
      });

      // Calculate target hours based on working days in the month
      const getWorkingDaysInMonth = (year: number, month: number) => {
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        let workingDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(Date.UTC(year, month - 1, day));
          const dayOfWeek = date.getUTCDay();
          // 0 = Sunday, 6 = Saturday
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
          }
        }
        return workingDays;
      };

      const workingDaysInMonth = getWorkingDaysInMonth(input.year, input.month);
      const targetHours = workingDaysInMonth * 8; // 8 hours per working day

      // Add blank working days to the breakdown
      const daysInMonth = new Date(
        Date.UTC(input.year, input.month, 0)
      ).getUTCDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(input.year, input.month - 1, day));
        const dayOfWeek = date.getUTCDay();

        // Only include working days (Monday-Friday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const dateKey = date.toISOString().split("T")[0]!;

          if (!dailyBreakdown.has(dateKey)) {
            dailyBreakdown.set(dateKey, {
              date: dateKey,
              totalHours: 0,
              toilHours: 0,
              nonWorkingHours: 0,
              workingHours: 0,
              entries: [],
            });
          }
        }
      }

      // Calculate summary
      const netWorkingHours = workingHours + nonWorkingHours - toilHours;
      const hoursOverUnder = netWorkingHours - targetHours;

      return {
        summary: {
          totalHours: Math.round(totalHours * 100) / 100,
          workingHours: Math.round(workingHours * 100) / 100,
          toilHours: Math.round(toilHours * 100) / 100,
          nonWorkingHours: Math.round(nonWorkingHours * 100) / 100,
          netWorkingHours: Math.round(netWorkingHours * 100) / 100,
          targetHours,
          hoursOverUnder: Math.round(hoursOverUnder * 100) / 100,
        },
        dailyBreakdown: Array.from(dailyBreakdown.values())
          .map((day) => ({
            ...day,
            netHours: Math.round((day.totalHours - day.toilHours) * 100) / 100,
            toilHours: Math.round(-day.toilHours * 100) / 100,
            nonWorkingHours: Math.round(day.nonWorkingHours * 100) / 100,
            workingHours: Math.round(day.workingHours * 100) / 100,
          }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
      };
    }),
});

const authorize = async ({
  prisma,
  workspaceId,
  userId,
}: {
  prisma: PrismaClient;
  workspaceId: string;
  userId: string;
}) => {
  const membership = await prisma.membership.findFirst({
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
};
