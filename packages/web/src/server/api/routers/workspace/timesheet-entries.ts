import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@timesheeter/web/server/api/trpc';
import {
  createTimesheetEntrySchema,
  updateTimesheetEntrySchema,
  type TimesheetEntryConfig,
  type UpdateTimesheetEntryConfig,
  updateTimesheetEntryConfigSchema,
  TIMESHEET_ENTRY_DEFINITIONS,
} from '@timesheeter/web/lib/workspace/timesheet-entries';
import { decrypt, encrypt, filterConfig } from '@timesheeter/web/server/lib/secret-helpers';
import { type TimesheetEntry, type PrismaClient } from '@prisma/client';
import { type WithConfig } from '@timesheeter/web/server/lib/workspace-types';
import { API_PAGINATION_LIMIT } from '@timesheeter/web/server/lib';
import { deleteTimesheetEntry } from '@timesheeter/web/server/deletion';

export const timesheetEntriesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        page: z.number().int().positive().default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      await authorize({
        prisma: ctx.prisma,
        timesheetEntryId: null,
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
      });

      const timesheetEntryCountPromise = ctx.prisma.timesheetEntry.count({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
          deleted: false,
        },
      });

      const timesheetEntriesPromise = ctx.prisma.timesheetEntry
        .findMany({
          where: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
            deleted: false,
          },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                ticketForTask: {
                  select: {
                    id: true,
                    number: true,
                    taskPrefix: {
                      select: {
                        id: true,
                        prefix: true,
                      },
                    },
                  },
                },
              },
            },
          },
          skip: (input.page - 1) * API_PAGINATION_LIMIT,
          take: API_PAGINATION_LIMIT,
        })
        .then((timesheetEntries) => timesheetEntries.map((timesheetEntry) => parseTimesheetEntry(timesheetEntry)));

      const [timesheetEntries, timesheetEntryCount] = await Promise.all([
        timesheetEntriesPromise,
        timesheetEntryCountPromise,
      ]);

      return {
        count: timesheetEntryCount,
        page: input.page,
        next: timesheetEntryCount > input.page * API_PAGINATION_LIMIT ? input.page + 1 : null,
        data: timesheetEntries,
      };
    }),
  create: protectedProcedure.input(createTimesheetEntrySchema).mutation(async ({ ctx, input }) => {
    await authorize({
      prisma: ctx.prisma,
      timesheetEntryId: null,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const { config, ...rest } = input;

    if (rest.start > rest.end) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Start date cannot be after end date',
      });
    }

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
  update: protectedProcedure.input(updateTimesheetEntrySchema).mutation(async ({ ctx, input }) => {
    const {
      config: oldConfig,
      start: existingStart,
      end: existingEnd,
    } = await authorize({
      prisma: ctx.prisma,
      timesheetEntryId: input.id,
      workspaceId: input.workspaceId,
      userId: ctx.session.user.id,
    });

    const start = input.start ? input.start : existingStart;
    const end = input.end ? input.end : existingEnd;

    if (start > end) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Start date cannot be after end date',
      });
    }

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

      await deleteTimesheetEntry({
        prisma: ctx.prisma,
        timesheetEntryId: input.id,
      });
    }),
});

export type ParsedTimesheetEntry<TimesheetEntryType extends WithConfig> = Omit<
  TimesheetEntryType,
  'configSerialized'
> & {
  config: TimesheetEntryConfig;
};

export const parseTimesheetEntry = <TimesheetEntryType extends WithConfig>(
  timesheetEntry: TimesheetEntryType,
  safe = true
): ParsedTimesheetEntry<TimesheetEntryType> => {
  const { configSerialized, ...rest } = timesheetEntry;

  const config = JSON.parse(decrypt(configSerialized)) as TimesheetEntryConfig;

  return {
    ...rest,
    config: safe
      ? filterConfig<TimesheetEntryConfig>(config, TIMESHEET_ENTRY_DEFINITIONS[config.type].fields, config.type)
      : config,
  };
};

type AuthorizeParams<TimesheetEntryId extends string | null> = {
  prisma: PrismaClient;
  timesheetEntryId: TimesheetEntryId;
  workspaceId: string;
  userId: string;
};

type AuthorizeResult<TimesheetEntryId extends string | null> = TimesheetEntryId extends null
  ? null
  : ParsedTimesheetEntry<TimesheetEntry>;

const authorize = async <TimesheetEntryId extends string | null>({
  prisma,
  timesheetEntryId,
  workspaceId,
  userId,
}: AuthorizeParams<TimesheetEntryId>): Promise<AuthorizeResult<TimesheetEntryId>> => {
  const membership = await prisma.membership.findMany({
    where: {
      userId,
      workspaceId,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'You are not a member of this workspace',
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
      code: 'NOT_FOUND',
      message: 'TimesheetEntry not found',
    });
  }

  if (timesheetEntry.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'TimesheetEntry not found',
    });
  }

  if (timesheetEntry.userId !== userId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'This TimesheetEntry does not belong to you',
    });
  }

  return parseTimesheetEntry(timesheetEntry, false) as AuthorizeResult<TimesheetEntryId>;
};
