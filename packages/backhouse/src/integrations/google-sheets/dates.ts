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

  // Check if year is just 2 characters long and if so, pad with current century
  const correctedYear = getCorrectedYear(parseInt(year));

  const monthIndex = getMonthIndex(month);

  const date = new Date(Date.UTC(correctedYear, monthIndex, 1));

  // Check if valid date
  if (isNaN(date.getTime())) {
    throw new Error('Invalid month/year');
  }

  return date;
};

/** Helper function to correct dates that are only 2 digits long */
const getCorrectedYear = (uncheckedYear: number) => {
  const yearString = uncheckedYear.toString();

  if (yearString.length > 2) {
    return uncheckedYear;
  }

  const currentYear = new Date().getUTCFullYear();
  const currentYearString = currentYear.toString();

  const currentYearPrefix = currentYearString.slice(0, currentYearString.length - 2);

  return parseInt(`${currentYearPrefix}${yearString}`);
};

/** Helper function that deals with all the many date formats a user may enter */
export const parseCellBasedStartDate = ({
  lastEntryCellValue,
  startMonthIndex,
  startYear,
}: {
  lastEntryCellValue: string | number;
  startMonthIndex: number;
  startYear: number;
}): Date => {
  // Type 1 - Date formatted as number (e.g., 44205)
  if (typeof lastEntryCellValue === 'number') {
    // Google Sheets serial numbers use 1/1/1900 as the base date
    const baseDate = new Date(1900, 0, 1); // January is 0-based
    const daysSinceBaseDate = lastEntryCellValue - 1; // Subtract 1 to account for the base date

    // Calculate the timestamp in milliseconds
    const timestamp = baseDate.getTime() + daysSinceBaseDate * 24 * 60 * 60 * 1000;

    // Return the date (adding one day to account for the base date)
    const date = new Date(timestamp);

    return date;
  }

  const formattedCellValue = lastEntryCellValue.toLowerCase().trim();

  // Type 2 - Date formatted as month date (e.g., "January 1")
  // If formattedCellValue starts with a month, try and parse it as a month/year
  if (MONTHS.some((month) => formattedCellValue.startsWith(month))) {
    const [_, date] = formattedCellValue.split(' ');

    const startDate = new Date(Date.UTC(startYear, startMonthIndex, parseInt(date) + 1, 0, 0, 0, 0));

    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    return startDate;
  }

  // Type 3 eg "26 Friday"
  // Extract the day from the cell value
  let lastEntryDay = parseInt(formattedCellValue.split(' ')[0]);

  // Type 4 eg "Wednesday 26"
  // Check if the first part is not a number (e.g., "Wednesday 26"), then try the second part
  if (isNaN(lastEntryDay)) {
    lastEntryDay = parseInt(formattedCellValue.split(' ')[1]);
  }

  // Type 5 eg "26/01/2021" - this is the new format
  // If the date is in the format dd/mm/yyyy, parse it accordingly
  if (formattedCellValue.includes('/')) {
    const [date] = formattedCellValue.split('/').map(Number);
    return new Date(Date.UTC(startYear, startMonthIndex, date + 1, 0, 0, 0, 0));
  }

  // Construct a date, using the month and year from the provided startMonth and startYear
  const startDate = new Date(Date.UTC(startYear, startMonthIndex, lastEntryDay + 1, 0, 0, 0, 0));

  // Ensure the date is valid
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid start date');
  }

  return startDate;
};
