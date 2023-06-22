import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@timesheeter/app/server/api/trpc";
import {
  createTimesheetEntrySchema,
  updateTimesheetEntrySchema,
  type TimesheetEntryConfig,
  type UpdateTimesheetEntryConfig,
  updateTimesheetEntryConfigSchema,
  TIMESHEET_ENTRY_DEFINITIONS,
} from "@timesheeter/app/lib/workspace/timesheet-entries";
import {
  decrypt,
  encrypt,
  filterConfig,
} from "@timesheeter/app/server/lib/secret-helpers";
import { type TimesheetEntry, type PrismaClient } from "@prisma/client";

export const timesheetEntriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        timesheetEntryId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.timesheetEntry
        .findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        })
        .then((timesheetEntries) =>
          timesheetEntries.map((timesheetEntry) =>
            parseTimesheetEntry(timesheetEntry)
          )
        );
    }),
  create: protectedProcedure
    .input(createTimesheetEntrySchema)
    .mutation(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        timesheetEntryId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config, ...rest } = input;

      const createdTimesheetEntry = await ctx.prisma.timesheetEntry
        .create({
          data: {
            userId: ctx.session.user.id,
            ...rest,
            configSerialized: encrypt(JSON.stringify(config)),
          },
        })
        .then(parseTimesheetEntry);

      return createdTimesheetEntry;
    }),
  update: protectedProcedure
    .input(updateTimesheetEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const { config: oldConfig } = await authorize({
        prisma: ctx.prisma,
        timesheetEntryId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const { config: updatedConfigValues, ...rest } = input;

      // Config is a single field, so we need to merge it manually
      const updatedConfig = {
        ...oldConfig,
        ...updatedConfigValues,
      } satisfies UpdateTimesheetEntryConfig;

      // Validate the config against the config schema to double check everything
      // has been merged correctly
      updateTimesheetEntryConfigSchema.parse(updatedConfig);

      return ctx.prisma.timesheetEntry
        .update({
          where: {
            id: input.id,
          },
          data: {
            ...rest,
            configSerialized: encrypt(JSON.stringify(updatedConfig)),
          },
        })
        .then(parseTimesheetEntry);
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
        timesheetEntryId: input.id,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      return ctx.prisma.timesheetEntry
        .delete({
          where: {
            id: input.id,
          },
        })
        .then(parseTimesheetEntry);
    }),
});

export type ParsedTimesheetEntry = Omit<TimesheetEntry, "configSerialized"> & {
  config: TimesheetEntryConfig;
};

export const parseTimesheetEntry = (
  timesheetEntry: TimesheetEntry,
  safe = true
): ParsedTimesheetEntry => {
  const { configSerialized, ...rest } = timesheetEntry;

  const config = JSON.parse(decrypt(configSerialized)) as TimesheetEntryConfig;

  return {
    ...rest,
    config: safe
      ? filterConfig<TimesheetEntryConfig>(
          config,
          TIMESHEET_ENTRY_DEFINITIONS[config.type].fields,
          config.type
        )
      : config,
  };
};

type AuthorizeParams<TimesheetEntryId extends string | null> = {
  prisma: PrismaClient;
  timesheetEntryId: TimesheetEntryId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<TimesheetEntryId extends string | null> =
  TimesheetEntryId extends null ? null : ParsedTimesheetEntry;

const authorize = async <TimesheetEntryId extends string | null>({
  prisma,
  timesheetEntryId,
  workspaceId,
  userId,
}: AuthorizeParams<TimesheetEntryId>): Promise<
  AuthorizeResult<TimesheetEntryId>
> => {
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

  if (!timesheetEntryId) {
    return null as AuthorizeResult<TimesheetEntryId>;
  }

  const timesheetEntry = await prisma.timesheetEntry.findUnique({
    where: {
      id: timesheetEntryId,
    },
  });

  if (!timesheetEntry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "TimesheetEntry not found",
    });
  }

  if (timesheetEntry.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "TimesheetEntry not found",
    });
  }

  if (timesheetEntry.userId !== userId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This TimesheetEntry does not belong to you",
    });
  }

  return parseTimesheetEntry(
    timesheetEntry
  ) as AuthorizeResult<TimesheetEntryId>;
};
