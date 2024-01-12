import { type DatabaseEntries } from '../database-entries';

export type GroupedEntry = {
  task: DatabaseEntries['timesheetEntries'][number]['task'];
  projectName: string;
  time: number;
  details: string;
  overtime: number;
};

export const formatTaskDetails = (task: DatabaseEntries['timesheetEntries'][number]['task']) => {
  const taskNumber = task.ticketForTask ? `${task.ticketForTask.taskPrefix.prefix}-${task.ticketForTask.number}` : null;

  if (taskNumber) {
    return task.name ? `${taskNumber}: ${task.name}` : taskNumber;
  }

  return task.name;
};

export const formatOutputDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });

/** Formats milliseconds to quarter hourly eg 0.25 hours or 1.25 hours */
export const formatTime = (durationMillis: number): number => {
  const durationHours = durationMillis / 3600000;

  return Number((Math.round(durationHours * 4) / 4).toFixed(2));
};

export const removeDetailDuplicates = (input: string) => {
  const items = input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

  const uniqueItems = Array.from(new Set(items));

  return uniqueItems.join(', ');
};

export const calculateIsWorkDay = (bankHolidays: Date[], date: Date): boolean => {
  // If weekend then not a work day
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
