import { getPrismaClient } from '@timesheeter/web';

export const getDatabaseEntries = async ({
  fromStartDate,
  toStartDate,
  userId,
}: {
  fromStartDate: Date;
  toStartDate: Date;
  userId: string;
}) => {
  const prisma = await getPrismaClient();

  const holidays = await prisma.holiday.findMany({
    // Holidays have a start and an end date, the start date may be before the from date and the end date may be after the to date
    // so we need to check if the start date is before the to date and the end date is after the from date
    where: {
      start: {
        lte: toStartDate,
      },
      end: {
        gte: fromStartDate,
      },
      userId,
    },
  });

  const timesheetEntries = await prisma.timesheetEntry.findMany({
    where: {
      start: {
        gte: fromStartDate,
        lte: toStartDate,
      },
      userId,
    },
    include: {
      task: {
        select: {
          id: true,
          ticketForTask: {
            select: {
              number: true,
              taskPrefix: {
                select: {
                  prefix: true,
                },
              },
            },
          },
          name: true,
          project: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return {
    holidays,
    timesheetEntries,
  };
};

export type DatabaseEntries = Awaited<ReturnType<typeof getDatabaseEntries>>;

/** Gets the earliest start date from the holidays and timesheet entries */
export const getDatabaseEntriesStartDate = ({ holidays, timesheetEntries }: DatabaseEntries) => {
  const holidayStartDates = holidays.map((holiday) => holiday.start);
  const timesheetEntryStartDates = timesheetEntries.map((timesheetEntry) => timesheetEntry.start);

  const allStartDates = [...holidayStartDates, ...timesheetEntryStartDates];

  if (allStartDates.length === 0) {
    return null;
  }

  const earliestEntry = new Date(allStartDates.sort((a, b) => a.getTime() - b.getTime())[0]);

  // Set to midnight
  earliestEntry.setUTCHours(0, 0, 0, 0);

  return earliestEntry;
};
