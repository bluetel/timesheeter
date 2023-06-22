import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/app/server/api/trpc";
import {
  createHolidaySchema,
  updateHolidaySchema,
} from "@timesheeter/app/lib/workspace/holidays";
import { type Holiday, type PrismaClient } from "@prisma/client";

export const holidaysRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        holidayId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.holiday
        .findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        })
        .then((holidays) => holidays.map((holiday) => parseHoliday(holiday)));
    }),
  create: protectedProcedure
    .input(createHolidaySchema)
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        holidayId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { start, end, ...rest } = input;

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (startDate > endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date cannot be after end date",
        });
      }

      return ctx.prisma.holiday
        .create({
          data: {
            ...rest,
            userId: ctx.session.user.id,
            start: startDate,
            end: endDate,
          },
        })
        .then(parseHoliday);
    }),
  update: protectedProcedure
    .input(updateHolidaySchema)
    .mutation(async ({ ctx, input }) => {
      const existingHoliday = await authorize({
        prisma: ctx.prisma,
        holidayId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const start = input.start ? new Date(input.start) : existingHoliday.start;
      const end = input.end ? new Date(input.end) : existingHoliday.end;

      if (start > end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date cannot be after end date",
        });
      }

      return ctx.prisma.holiday
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...input,
          },
        })
        .then(parseHoliday);
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        holidayId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.holiday
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseHoliday);
    }),
});

export type ParsedHoliday = Omit<Holiday, "start" | "end"> & {
  start: string;
  end: string;
};

export const parseHoliday = (holiday: Holiday): ParsedHoliday => {
  const { start, end, ...rest } = holiday;

  return {
    ...rest,
    // Convert to uk format eg 21/06/2023
    start: start.toLocaleDateString("en-GB"),
    end: end.toLocaleDateString("en-GB"),
  };
};

type AuthorizeParams<HolidayId extends string | null> = {
  prisma: PrismaClient;
  holidayId: HolidayId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<HolidayId extends string | null> = HolidayId extends null
  ? null
  : ParsedHoliday;

const authorize = async <HolidayId extends string | null>({
  prisma,
  holidayId,
  workspaceId,
  userId,
}: AuthorizeParams<HolidayId>): Promise<AuthorizeResult<HolidayId>> => {
  const membership = await prisma.membership.findMany({
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

  if (!holidayId) {
    return null as AuthorizeResult<HolidayId>;
  }

  const holiday = await prisma.holiday.findUnique({
    where: {
      id: holidayId,
    },
  });

  if (!holiday) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Holiday not found",
    });
  }

  if (holiday.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Holiday not found",
    });
  }

  if (holiday.userId !== userId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This holiday does not belong to you",
    });
  }

  return parseHoliday(holiday) as AuthorizeResult<HolidayId>;
};
