import { prisma } from "@timesheeter/app";

export const getDatabaseEntries = async ({
    fromStartDate,
    toStartDate,
}: {
    fromStartDate: Date;
    toStartDate: Date;
}) => {
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

    const earliestEntry = allStartDates.sort((a, b) => a.getTime() - b.getTime())[0];

    // Set to midnight
    earliestEntry.setUTCHours(0, 0, 0, 0);

    return earliestEntry;
};

// todo:

// fix overtime not being applied

// fix first column date not being foramtted

// fix column sizes

// marking non current sheets as completed if not already

// details and overtime columns are missing
