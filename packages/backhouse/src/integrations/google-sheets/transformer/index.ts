import { type DatabaseEntries } from '../database-entries';
import { getBankHolidayDates } from '../bank-holidays';
import { calculateOvertime } from './calculate-overtime';
import {
  formatOutputDate,
  formatTaskDetails,
  formatTime,
  removeDetailDuplicates,
  type GroupedEntry,
  calculateIsWorkDay,
} from './lib';

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
    const { projectName, task, time, details, overtime } = entry;

    return [formattedDate, projectName, formatTaskDetails(task), time, removeDetailDuplicates(details), overtime];
  });
};

const groupEntriesToTasks = (
  timesheetEntriesDate: DatabaseEntries['timesheetEntries'],
  isWorkDay: boolean
): GroupedEntry[] => {
  const groupedEntries = timesheetEntriesDate
    .reduce((acc, timesheetEntry) => {
      const existingEntry = acc.find((entry) => entry.task.id === timesheetEntry.task.id);

      if (existingEntry) {
        existingEntry.time += timesheetEntry.end.getTime() - timesheetEntry.start.getTime();

        const trimmedDescription = (timesheetEntry.description ?? '').trim();

        if (trimmedDescription !== '') {
          existingEntry.details = `${existingEntry.details}, ${trimmedDescription}`;
        }
      } else {
        acc.push({
          task: timesheetEntry.task,
          projectName: timesheetEntry.task.project?.name ?? '',
          time: timesheetEntry.end.getTime() - timesheetEntry.start.getTime(),
          details: timesheetEntry.description ?? '',
        });
      }

      return acc;
    }, [] as Omit<GroupedEntry, 'overtime'>[])
    .map((groupedEntry) => ({
      ...groupedEntry,
      time: formatTime(groupedEntry.time),
    }));

  return calculateOvertime(groupedEntries, isWorkDay).filter((timedGroupedEntry) => timedGroupedEntry.time >= 0.25);
};
