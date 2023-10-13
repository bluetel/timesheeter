import { type DatabaseEntries } from './database-entries';
import { getBankHolidayDates } from './bank-holidays';
import { nonWorkingProjectName } from '@timesheeter/web';

export type TransformedData = {
  date: Date;
  // Down first then across
  cells: (string | number)[][];
};

/** Transforms database entries into the format required for the Google Sheet */
export const getTransformedSheetData = async ({
  databaseEntries: { holidays, timesheetEntries },
  firstDayToProcess,
  lastDayToProcess,
}: {
  databaseEntries: DatabaseEntries;
  firstDayToProcess: Date;
  lastDayToProcess: Date;
}): Promise<TransformedData[]> => {
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

    const formattedCells = formatTimesheetEntryCells(timesheetEntriesForDate, date, isWorkDay);
    if (formattedCells.length > 0) {
      sheetEntries.push({
        date: new Date(date),
        cells: formattedCells,
      });
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }

  return sheetEntries;
};

const findHoliday = (
  holidays: DatabaseEntries['holidays'],
  dateMidnight: Date
): DatabaseEntries['holidays'][number] | null => {
  // Ensure holiday dates are at midnight
  const holidaysCorrected = holidays.map((holiday) => {
    const start = new Date(holiday.start);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(holiday.end);
    end.setUTCHours(0, 0, 0, 0);

    return {
      ...holiday,
      start,
      end,
    };
  });

  // On holiday if date is start <= date <= end
  return holidaysCorrected.find((holiday) => holiday.start <= dateMidnight && dateMidnight <= holiday.end) ?? null;
};

const findTimesheetEntries = (
  timesheetEntries: DatabaseEntries['timesheetEntries'],
  dateMidnight: Date
  // match any entries that start on this date
): DatabaseEntries['timesheetEntries'] =>
  timesheetEntries.filter((timesheetEntry) => timesheetEntry.start.toDateString() === dateMidnight.toDateString());

const formatHolidayCells = (holiday: DatabaseEntries['holidays'][number], date: Date): TransformedData['cells'] => [
  [formatOutputDate(date), '', 'HOLIDAYS', 8, holiday.description ?? ''],
];

const formatTimesheetEntryCells = (
  timesheetEntriesDate: DatabaseEntries['timesheetEntries'],
  date: Date,
  isWorkDay: boolean
): TransformedData['cells'] => {
  const groupedEntries = groupEntriesToTasks(timesheetEntriesDate, isWorkDay);
  const formattedDate = formatOutputDate(date);

  return groupedEntries.map((entry) => {
    const { projectName, taskDetails, time, details, overtime } = entry;

    return [formattedDate, projectName, taskDetails, time, removeDetailDuplicates(details), overtime];
  });
};

type GroupedEntry = {
  taskId: string;
  projectName: string;
  taskDetails: string;
  time: number;
  details: string;
  overtime: number;
};

type GroupedEntryNumber = Omit<GroupedEntry, 'time' | 'overtime'> & {
  time: number;
  overtime: number;
};

const groupEntriesToTasks = (
  timesheetEntriesDate: DatabaseEntries['timesheetEntries'],
  isWorkDay: boolean
): GroupedEntry[] => {
  const overtimeCalculations = calculateOvertime(timesheetEntriesDate, isWorkDay);

  const groupedEntries = overtimeCalculations.reduce((acc, { timesheetEntry, overtime }) => {
    const { task } = timesheetEntry;

    const existingEntry = acc.find((entry) => entry.taskId === task.id);

    if (existingEntry) {
      (existingEntry.time += timesheetEntry.end.getTime() - timesheetEntry.start.getTime()),
        (existingEntry.overtime += overtime);

      const trimmedDescription = (timesheetEntry.description ?? '').trim();

      if (trimmedDescription !== '') {
        existingEntry.details = `${existingEntry.details}, ${trimmedDescription}`;
      }
    } else {
      const taskNumber = task.ticketForTask
        ? `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}`
        : undefined;

      acc.push({
        taskId: task.id,
        projectName: task.project?.name ?? '',
        taskDetails: formatTaskDetails({ taskNumber, task }),
        time: timesheetEntry.end.getTime() - timesheetEntry.start.getTime(),
        overtime,
        details: timesheetEntry.description ?? '',
      });
    }

    return acc;
  }, [] as GroupedEntryNumber[]);

  const timedGroupedEntries = groupedEntries.map((groupedEntry) => {
    const formattedOvertimeTime = formatTime(groupedEntry.overtime);
    return {
      ...groupedEntry,
      time: formatTime(groupedEntry.time),
      overtime: formattedOvertimeTime === 0 ? 0 : formattedOvertimeTime,
    };
  });

  return timedGroupedEntries.filter((timedGroupedEntry) => timedGroupedEntry.time >= 0.25);
};

type OvertimeCalculation = {
  timesheetEntry: DatabaseEntries['timesheetEntries'][number];
  overtime: number;
};

const OVERTIME_MILLISECONDS = 28800000 as const; // 8 hours

/**  Need to calculate overtime, overtime is applied to each entry based on the hours already worked in that day, ie later entries might have overtime applied to them, earlier ones won't. There are 8 hours */
const calculateOvertime = (
  timesheetEntriesDate: DatabaseEntries['timesheetEntries'],
  isWorkDay: boolean
): OvertimeCalculation[] => {
  // sort most recent
  const sortedTimesheetEntries = timesheetEntriesDate.sort((a, b) => b.start.getTime() - a.start.getTime());

  // If not a workday, then overtime is applied to all entries
  if (!isWorkDay) {
    return sortedTimesheetEntries.map((timesheetEntry) => ({
      timesheetEntry,
      overtime: timesheetEntry.end.getTime() - timesheetEntry.start.getTime(),
    }));
  }

  const overtimeCalculations: OvertimeCalculation[] = [];
  let timeWorked = 0;

  for (const timesheetEntry of timesheetEntriesDate) {
    // If task name is 'Non Working' then don't apply overtime
    if (timesheetEntry.task.project.name === nonWorkingProjectName) {
      overtimeCalculations.push({
        timesheetEntry,
        overtime: 0,
      });
      continue;
    }

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

  return overtimeCalculations;
};

const calculateIsWorkDay = (bankHolidays: Date[], date: Date): boolean => {
  // If weekend then not a work day, needs to not be utc
  const day = date.getUTCDay();

  if (day === 0 || day === 6) {
    return false;
  }

  // If bank holiday then not a work day
  if (bankHolidays.some((bankHoliday) => bankHoliday.getTime() === date.getTime())) {
    return false;
  }

  return true;
};

/** Formats milliseconds to quarter hourly eg 0.25 hours or 1.25 hours */
const formatTime = (durationMillis: number): number => {
  const durationHours = durationMillis / 3600000;

  return Number((Math.round(durationHours * 4) / 4).toFixed(2));
};

const formatOutputDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });

const removeDetailDuplicates = (input: string) => {
  const items = input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

  // We reverse the array as we want the oldest description to be first so there
  // is a chronological order to the descriptions
  const uniqueItems = Array.from(new Set(items)).reverse();
  return uniqueItems.join(', ');
};

const formatTaskDetails = ({
  taskNumber,
  task,
}: {
  taskNumber: string | undefined;
  task: DatabaseEntries['timesheetEntries'][number]['task'];
}) => {
  if (taskNumber) {
    return task.name ? `${taskNumber}: ${task.name}` : taskNumber;
  }

  return task.name;
};
