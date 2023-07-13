import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/web/server/api/trpc";
import {
  createHolidaySchema,
  updateHolidaySchema,
} from "@timesheeter/web/lib/workspace/holidays";
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

      return ctx.prisma.holiday.findMany({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
      });
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

      if (input.start > input.end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date cannot be after end date",
        });
      }

      return ctx.prisma.holiday.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });
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

      const start = input.start ? input.start : existingHoliday.start;
      const end = input.end ? input.end : existingHoliday.end;

      if (start > end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Start date cannot be after end date",
        });
      }

      return ctx.prisma.holiday.update({
        where: {
          id: input.id,
        },
        data: {
          ...input,
        },
      });
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

      return ctx.prisma.holiday.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

type AuthorizeParams<HolidayId extends string | null> = {
  prisma: PrismaClient;
  holidayId: HolidayId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<HolidayId extends string | null> = HolidayId extends null
  ? null
  : Holiday;

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

  return holiday as AuthorizeResult<HolidayId>;
};
