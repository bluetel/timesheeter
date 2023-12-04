import { type DatabaseEntries } from './database-entries';
import { getBankHolidayDates } from './bank-holidays';
import { NON_WORKING_PROJECT_NAME, TOIL_TASK_NANE } from '@timesheeter/web';

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

type GroupedEntry = {
  task: DatabaseEntries['timesheetEntries'][number]['task'];
  projectName: string;
  time: number;
  details: string;
  overtime: number;
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

const OVERTIME_HOURS = 8;

/**  Need to calculate overtime, overtime is applied to each entry based on the hours already worked in that day, ie later entries might have overtime applied to them, earlier ones won't. There are 8 hours */
const calculateOvertime = (groupedEntries: Omit<GroupedEntry, 'overtime'>[], isWorkDay: boolean): GroupedEntry[] => {
  // If not a workday, then overtime is applied to all entries
  if (!isWorkDay) {
    return groupedEntries.map((groupedEntry) => ({
      ...groupedEntry,
      overtime: groupedEntry.time,
    }));
  }

  let timeWorked = 0;

  return groupedEntries.map((groupedEntry) => {
    // If task name is TOIL_TASK_NANE then subtract overtime as time off in lieu
    if (
      groupedEntry.task.name.toUpperCase() === TOIL_TASK_NANE &&
      groupedEntry.task.project.name === NON_WORKING_PROJECT_NAME
    ) {
      return {
        ...groupedEntry,
        overtime: -groupedEntry.time,
      };
    }

    // If task name is NON_WORKING_PROJECT_NAME then don't apply overtime
    // Must also not be TOIL_TASK_NANE as that is a special case but we have already
    // handled that above
    if (groupedEntry.task.project.name === NON_WORKING_PROJECT_NAME) {
      return {
        ...groupedEntry,
        overtime: 0,
      };
    }

    let newGroupedEntry: GroupedEntry | null = null;

    if (timeWorked > OVERTIME_HOURS) {
      newGroupedEntry = {
        ...groupedEntry,
        overtime: groupedEntry.time,
      };
    } else if (timeWorked + groupedEntry.time < OVERTIME_HOURS) {
      newGroupedEntry = {
        ...groupedEntry,
        overtime: 0,
      };
    } else {
      // Only some of the time is overtime
      newGroupedEntry = {
        ...groupedEntry,
        overtime: timeWorked + groupedEntry.time - OVERTIME_HOURS,
      };
    }

    timeWorked += groupedEntry.time;

    return newGroupedEntry;
  });
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

const formatTaskDetails = (task: DatabaseEntries['timesheetEntries'][number]['task']) => {
  const taskNumber = task.ticketForTask ? `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}` : null;

  if (taskNumber) {
    return task.name ? `${taskNumber}: ${task.name}` : taskNumber;
  }

  return task.name;
};
