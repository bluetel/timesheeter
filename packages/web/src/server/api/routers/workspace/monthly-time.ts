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

      // Calculate summary statistics with proper overtime logic
      let totalHours = 0;
      let toilHours = 0;
      let nonWorkingHours = 0;
      let workingHours = 0;
      let overtimeHours = 0;

      // Group entries by day
      const dailyBreakdown = new Map<
        string,
        {
          date: string;
          totalHours: number;
          toilHours: number;
          nonWorkingHours: number;
          workingHours: number;
          overtimeHours: number;
          entries: typeof timesheetEntries;
        }
      >();

      // Process entries day by day to calculate proper overtime
      const entriesByDay = new Map<string, typeof timesheetEntries>();
      
      timesheetEntries.forEach((entry) => {
        const dateKey = entry.start.toISOString().split("T")[0]!;
        if (!entriesByDay.has(dateKey)) {
          entriesByDay.set(dateKey, []);
        }
        entriesByDay.get(dateKey)!.push(entry);
      });

      // Calculate overtime for each day
      entriesByDay.forEach((dayEntries, dateKey) => {
        const date = new Date(dateKey);
        const dayOfWeek = date.getUTCDay();
        const isWorkDay = dayOfWeek !== 0 && dayOfWeek !== 6; // Monday-Friday
        
        let dayTotalHours = 0;
        let dayToilHours = 0;
        let dayNonWorkingHours = 0;
        let dayWorkingHours = 0;
        let dayOvertimeHours = 0;
        
        // Sort entries by start time for proper overtime calculation
        const sortedEntries = dayEntries.sort((a, b) => a.start.getTime() - b.start.getTime());
        
        let timeWorkedInDay = 0;
        
        sortedEntries.forEach((entry) => {
          const durationMs = entry.end.getTime() - entry.start.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          
          dayTotalHours += durationHours;
          
          // Categorize hours
          if (
            entry.task.name.toUpperCase() === TOIL_TASK_NAME &&
            entry.task.project.name === NON_WORKING_PROJECT_NAME
          ) {
            dayToilHours += durationHours;
            // TOIL counts as negative overtime
            dayOvertimeHours -= durationHours;
          } else if (entry.task.project.name === NON_WORKING_PROJECT_NAME) {
            dayNonWorkingHours += durationHours;
            // Non-working hours don't count toward overtime on work days
            if (!isWorkDay) {
              dayOvertimeHours += durationHours;
            }
          } else {
            dayWorkingHours += durationHours;
            
            // Calculate overtime for working hours
            if (isWorkDay) {
              if (timeWorkedInDay >= 8) {
                // All of this entry is overtime
                dayOvertimeHours += durationHours;
              } else if (timeWorkedInDay + durationHours > 8) {
                // Only part of this entry is overtime
                dayOvertimeHours += (timeWorkedInDay + durationHours) - 8;
              }
              timeWorkedInDay += durationHours;
            } else {
              // Non-work day: all working hours are overtime
              dayOvertimeHours += durationHours;
            }
          }
        });

        // Store daily breakdown
        dailyBreakdown.set(dateKey, {
          date: dateKey,
          totalHours: dayTotalHours,
          toilHours: dayToilHours,
          nonWorkingHours: dayNonWorkingHours,
          workingHours: dayWorkingHours,
          overtimeHours: dayOvertimeHours,
          entries: dayEntries,
        });

        // Add to summary totals
        totalHours += dayTotalHours;
        toilHours += dayToilHours;
        nonWorkingHours += dayNonWorkingHours;
        workingHours += dayWorkingHours;
        overtimeHours += dayOvertimeHours;
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
              overtimeHours: 0,
              entries: [],
            });
          }
        }
      }

      // Calculate summary - net working hours should be capped at 8 hours per working day plus overtime
      const standardWorkingHours = Math.min(workingHours, workingDaysInMonth * 8);
      const netWorkingHours = standardWorkingHours + nonWorkingHours + overtimeHours;
      const hoursOverUnder = netWorkingHours - targetHours;

      return {
        summary: {
          totalHours: Math.round(totalHours * 100) / 100,
          workingHours: Math.round(workingHours * 100) / 100,
          toilHours: Math.round(toilHours * 100) / 100,
          nonWorkingHours: Math.round(nonWorkingHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          netWorkingHours: Math.round(netWorkingHours * 100) / 100,
          targetHours,
          hoursOverUnder: Math.round(hoursOverUnder * 100) / 100,
        },
        dailyBreakdown: Array.from(dailyBreakdown.values())
          .map((day) => ({
            ...day,
            netHours: Math.round((Math.min(day.workingHours, 8) + day.nonWorkingHours + day.overtimeHours) * 100) / 100,
            toilHours: Math.round(-day.toilHours * 100) / 100,
            nonWorkingHours: Math.round(day.nonWorkingHours * 100) / 100,
            workingHours: Math.round(day.workingHours * 100) / 100,
            overtimeHours: Math.round(day.overtimeHours * 100) / 100,
            totalHours: Math.round(day.totalHours * 100) / 100,
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
