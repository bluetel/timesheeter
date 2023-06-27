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

        if (holiday) {
            sheetEntries.push({
                date,
                cells: formatHolidayCells(holiday, date),
            });
            continue;
        }

        const timesheetEntriesForDate = findTimesheetEntries(timesheetEntries, date);

        if (timesheetEntriesForDate.length > 0) {
            sheetEntries.push({
                date,
                cells: formatTimesheetEntryCells(timesheetEntriesForDate, date, bankHolidays),
            });
        }

        date.setDate(date.getUTCDate() + 1);
    }

    return sheetEntries;
};

const findHoliday = (holidays: DatabaseEntries["holidays"], date: Date): DatabaseEntries["holidays"][number] | null =>
    // On holiday if date is start <= date <= end
    holidays.find((holiday) => holiday.start <= date && date <= holiday.end) ?? null;

const findTimesheetEntries = (
    timesheetEntries: DatabaseEntries["timesheetEntries"],
    date: Date
    // match any entries that start on this date
): DatabaseEntries["timesheetEntries"] => {
    const dateStart = date.getUTCDate();

    return timesheetEntries.filter((timesheetEntry) => timesheetEntry.start.getUTCDate() === dateStart);
};

const formatHolidayCells = (holiday: DatabaseEntries["holidays"][number], date: Date): string[][] => {
    const monthYearDate = dateToMonthYear(date);

    return [[monthYearDate, "", "HOLIDAYS", "8", holiday.description ?? ""]];
};

const formatTimesheetEntryCells = (
    timesheetEntriesDate: DatabaseEntries["timesheetEntries"],
    date: Date,
    bankHolidays: Date[]
): string[][] => {
    const monthYearDate = dateToMonthYear(date);

    const groupedEntries = groupEntriesToTasks(timesheetEntriesDate, date, bankHolidays);

    return groupedEntries.map((entry, index) => {
        const { projectName, jiraTask, time, details, overtime } = entry;

        return [index === 0 ? monthYearDate : "", projectName, jiraTask, time, details, overtime];
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
    date: Date,
    bankHolidays: Date[]
): GroupedEntry[] => {
    const overtimeCalculations = calculateOvertime(timesheetEntriesDate, date, bankHolidays);

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

    return groupedEntries.map((groupedEntry) => ({
        ...groupedEntry,
        time: formatTime(groupedEntry.time),
        overtime: formatTime(groupedEntry.overtime),
    }));
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
    date: Date,
    bankHolidays: Date[]
): OvertimeCalculation[] => {
    // sort most recent
    const sortedTimesheetEntries = timesheetEntriesDate.sort((a, b) => b.start.getTime() - a.start.getTime());

    // If date is a bank holiday, then overtime is applied to all entries
    const isBankHoliday = bankHolidays.some((bankHoliday) => bankHoliday === date);

    if (isBankHoliday) {
        return sortedTimesheetEntries.map((timesheetEntry) => ({
            timesheetEntry,
            overtime: 8,
        }));
    }

    let timeWorked = 0;
    const overtimeCalculations: OvertimeCalculation[] = [];

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
            overtimeCalculations.push({
                timesheetEntry,
                overtime: timeWorked + duration - OVERTIME_MILLISECONDS,
            });
        }

        timeWorked += duration;
    }

    return overtimeCalculations;
};
