import { prisma } from "@timesheeter/app";

export const getDatabaseEntries = async ({
    fromStartDate,
    toStartDate,
}: {
    fromStartDate: Date;
    toStartDate: Date;
}) => {
    const holidays = await prisma.holiday.findMany({
        where: {
            start: {
                gte: fromStartDate,
                lte: toStartDate,
            },
        },
    });

    const timesheetEntries = await prisma.timesheetEntry.findMany({
        where: {
            start: {
                gte: fromStartDate,
                lte: toStartDate,
            },
        },
        include: {
            task: {
                select: {
                    id: true,
                    taskNumber: true,
                    name: true,
                    project: {
                        select: {
                            name: true,
                            taskPrefix: true,
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

    return allStartDates.sort((a, b) => a.getTime() - b.getTime())[0];
};
