import { DatabaseEntries } from "./database-entries";
import { dateToMonthYear, getBankHolidayDates } from "./dates";

export type TransformedData = {
    date: Date;
    // Down first then across
    cells: string[][];
};

/** Transforms database entries into the format required for the Google Sheet */
export const getTransformedSheetData = async ({
    databaseEntries,
    firstDayToProcess,
    lastDayToProcess,
}: {
    databaseEntries: DatabaseEntries;
    firstDayToProcess: Date;
    lastDayToProcess: Date;
}): Promise<TransformedData[]> => {
    const { holidays, timesheetEntries } = databaseEntries;

    const sheetEntries: TransformedData[] = [];
    const bankHolidays = await getBankHolidayDates();
    const date = new Date(firstDayToProcess);

    while (date <= lastDayToProcess) {
        const holiday = findHoliday(holidays, date);
        const isWorkDay = calculateIsWorkDay(bankHolidays, date);

        if (holiday && isWorkDay) {
            sheetEntries.push({
                date: new Date(date),
                cells: formatHolidayCells(holiday, date),
            });

            date.setUTCDate(date.getUTCDate() + 1);
            continue;
        }

        const timesheetEntriesForDate = findTimesheetEntries(timesheetEntries, date);

        if (timesheetEntriesForDate.length > 0) {
            sheetEntries.push({
                date: new Date(date),
                cells: formatTimesheetEntryCells(timesheetEntriesForDate, date, isWorkDay),
            });
        }

        date.setUTCDate(date.getUTCDate() + 1);
    }

    return sheetEntries;
};

const findHoliday = (
    holidays: DatabaseEntries["holidays"],
    dateMidnight: Date
): DatabaseEntries["holidays"][number] | null =>
    // On holiday if date is start <= date <= end
    holidays.find((holiday) => holiday.start <= dateMidnight && dateMidnight <= holiday.end) ?? null;

const findTimesheetEntries = (
    timesheetEntries: DatabaseEntries["timesheetEntries"],
    dateMidnight: Date
    // match any entries that start on this date
): DatabaseEntries["timesheetEntries"] =>
    timesheetEntries.filter((timesheetEntry) => timesheetEntry.start.toDateString() === dateMidnight.toDateString());

const formatHolidayCells = (holiday: DatabaseEntries["holidays"][number], date: Date): string[][] => {
    const dateFormatted = date.toLocaleDateString("en-GB", {
        day: "numeric",
        weekday: "long",
    });

    return [[dateFormatted, "", "HOLIDAYS", "8.00", holiday.description ?? ""]];
};

const formatTimesheetEntryCells = (
    timesheetEntriesDate: DatabaseEntries["timesheetEntries"],
    date: Date,
    isWorkDay: boolean
): string[][] => {
    const dateFormatted = date.toLocaleDateString("en-GB", {
        day: "numeric",
        weekday: "long",
    });

    const groupedEntries = groupEntriesToTasks(timesheetEntriesDate, isWorkDay);

    return groupedEntries.map((entry, index) => {
        const { projectName, jiraTask, time, details, overtime } = entry;

        return [index === 0 ? dateFormatted : "", projectName, jiraTask, time, details, overtime];
    });
};

type GroupedEntry = {
    taskId: string;
    projectName: string;
    jiraTask: string;
    time: string;
    details: string;
    overtime: string;
};

type GroupedEntryNumber = Omit<GroupedEntry, "time" | "overtime"> & {
    time: number;
    overtime: number;
};

const groupEntriesToTasks = (
    timesheetEntriesDate: DatabaseEntries["timesheetEntries"],
    isWorkDay: boolean
): GroupedEntry[] => {
    const overtimeCalculations = calculateOvertime(timesheetEntriesDate, isWorkDay);

    const groupedEntries = overtimeCalculations.reduce((acc, { timesheetEntry, overtime }) => {
        const { task } = timesheetEntry;

        const existingEntry = acc.find((entry) => entry.taskId === task.id);

        if (existingEntry) {
            (existingEntry.time += timesheetEntry.end.getTime() - timesheetEntry.start.getTime()),
                (existingEntry.overtime += overtime);
            // Join with comma
            existingEntry.details = timesheetEntry.description
                ? existingEntry.details + ", " + timesheetEntry.description
                : existingEntry.details;
        } else {
            const taskNumber =
                task.taskNumber && task.project?.taskPrefix
                    ? `${task.project.taskPrefix}-${task.taskNumber}`
                    : undefined;

            acc.push({
                taskId: task.id,
                projectName: task.project?.name ?? "",
                jiraTask: taskNumber && task.name ? `${taskNumber} - ${task.name}` : taskNumber ?? task.name ?? "",
                time: timesheetEntry.end.getTime() - timesheetEntry.start.getTime(),
                overtime,
                details: timesheetEntry.description ?? "",
            });
        }

        return acc;
    }, [] as GroupedEntryNumber[]);

    return groupedEntries.map((groupedEntry) => {
        const formattedOvertimeTime = formatTime(groupedEntry.overtime);
        return {
            ...groupedEntry,
            time: formatTime(groupedEntry.time),
            overtime: formattedOvertimeTime === "0.00" ? "" : formattedOvertimeTime,
        };
    });
};

/** Formats milliseconds to quarter hourly eg 0.25 hours or 1.25 hours */
const formatTime = (durationMillis: number): string => {
    const durationHours = durationMillis / 3600000;

    return (Math.round(durationHours * 4) / 4).toFixed(2);
};

type OvertimeCalculation = {
    timesheetEntry: DatabaseEntries["timesheetEntries"][number];
    overtime: number;
};

const OVERTIME_MILLISECONDS = 28800000 as const;

/**  Need to calculate overtime, overtime is applied to each entry based on the hours already worked in that day, ie later entries might have overtime applied to them, earlier ones won't. There are 8 hours */
const calculateOvertime = (
    timesheetEntriesDate: DatabaseEntries["timesheetEntries"],
    isWorkDay: boolean
): OvertimeCalculation[] => {
    // sort most recent
    const sortedTimesheetEntries = timesheetEntriesDate.sort((a, b) => b.start.getTime() - a.start.getTime());

    // If not a workday, then overtime is applied to all entries
    if (!isWorkDay) {
        return sortedTimesheetEntries.map((timesheetEntry) => ({
            timesheetEntry,
            overtime: 8,
        }));
    }

    const overtimeCalculations: OvertimeCalculation[] = [];
    let timeWorked = 0;

    for (const timesheetEntry of timesheetEntriesDate) {
        const duration = timesheetEntry.end.getTime() - timesheetEntry.start.getTime();

        if (timeWorked > OVERTIME_MILLISECONDS) {
            overtimeCalculations.push({
                timesheetEntry,
                overtime: duration,
            });
        } else if (timeWorked + duration < OVERTIME_MILLISECONDS) {
            overtimeCalculations.push({
                timesheetEntry,
                overtime: 0,
            });
        } else {
            // Only some of the time is overtime
            overtimeCalculations.push({
                timesheetEntry,
                overtime: timeWorked + duration - OVERTIME_MILLISECONDS,
            });
        }

        timeWorked += duration;
    }

    console.log(
        "overtime",
        overtimeCalculations.map((a) => a.overtime)
    );

    return overtimeCalculations;
};

const calculateIsWorkDay = (bankHolidays: Date[], date: Date): boolean => {
    // If weekend then not a work day, needs to not be utc
    const day = date.getDay();

    if (day === 0 || day === 6) {
        return false;
    }

    // If bank holiday then not a work day
    if (bankHolidays.some((bankHoliday) => bankHoliday.getTime() === date.getTime())) {
        return false;
    }

    return true;
};
