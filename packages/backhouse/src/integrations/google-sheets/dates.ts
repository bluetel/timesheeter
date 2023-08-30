const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

export const getMonthIndex = (month: string) => {
  const monthLowerCase = month.toLowerCase();

  const monthIndex = MONTHS.findIndex((m) => m.startsWith(monthLowerCase));

  if (monthIndex === -1) {
    throw new Error(`Invalid month: ${month}`);
  }

  return monthIndex;
};

export const dateToMonthYear = (date: Date) => {
  const monthLowerCase = MONTHS[date.getUTCMonth()];
  const month = `${monthLowerCase[0].toUpperCase()}${monthLowerCase.slice(1)}`;

  const year = date.getUTCFullYear();

  return `${month} ${year}`;
};

export const monthYearToDate = (monthYear: string) => {
  const [month, year] = monthYear.toLowerCase().split(' ');
  if (!month || !year) {
    throw new Error('Invalid month/year');
  }

  const monthIndex = getMonthIndex(month);

  const date = new Date(Date.UTC(parseInt(year), monthIndex, 1));

  // Check if valid date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid month/year');
  }

  return date;
};

/** Helper function that deals with all the many date formats a user may enter */
export const parseCellBasedStartDate = ({
  lastEntryCellValue,
  startMonth,
  startYear,
}: {
  lastEntryCellValue: string;
  startMonth: number;
  startYear: number;
}): Date => {
  // Extract the day from the cell value
  let lastEntryDay = parseInt(lastEntryCellValue.toLowerCase().split(' ')[0]);

  // Check if the first part is not a number (e.g., "Wednesday 26"), then try the second part
  if (isNaN(lastEntryDay)) {
    lastEntryDay = parseInt(lastEntryCellValue.split(' ')[1]);
  }

  // If the date is in the format dd/mm/yyyy, parse it accordingly
  if (lastEntryCellValue.includes('/')) {
    const [day] = lastEntryCellValue.split('/').map(Number);
    return new Date(Date.UTC(startYear, startMonth, day + 1, 0, 0, 0, 0));
  }

  // Construct a date, using the month and year from the provided startMonth and startYear
  const startDate = new Date(Date.UTC(startYear, startMonth, lastEntryDay + 1, 0, 0, 0, 0));

  // Ensure the date is valid
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid start date');
  }

  return startDate;
};
