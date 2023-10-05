import { monthYearRegex } from '@timesheeter/web';
import { GoogleSpreadsheet, type GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { monthYearToDate, parseCellBasedStartDate } from './dates';
import { TransformedData } from './transformer';
import { createBlankSheet, addDefaultHeadings } from './blank-sheet';

const HEADER_ROW = 0;

/** The default start row for the case that there are no entries in the sheet */
const DEFAULT_FIRST_ENTRY_ROW = 2;

const ENTRY_SPACING = 1;

const DATE_COLUMN = 0;

/** The total number of columns we fill in */
const COLUMN_COUNT = 6;

export type SheetToProcess = {
  sheet: GoogleSpreadsheetWorksheet;
  sheetStartDate: Date;
};

export type SheetStart = Awaited<ReturnType<typeof getSheetStart>>;

/** Gets the day to start processing from, this is one day after the last day previously processed */
export const getSheetStart = async (sheetsToProcess: SheetToProcess[]) => {
  if (!sheetsToProcess.length) {
    return null;
  }

  const mostRecentSheet = sheetsToProcess[0];

  // Loop down DATE_COLUMN until we find 2 consecutive empty rows
  const { sheet, sheetStartDate } = mostRecentSheet;

  await sheet.loadCells();

  const { rowCount } = sheet;

  let lastDateEntryRow = null as number | null;

  for (let i = rowCount - 1; i > HEADER_ROW; i--) {
    const dateCell = sheet.getCell(i, DATE_COLUMN);

    // Check if date cell is 'Date' if so return
    if (dateCell.value === 'Date') {
      // Plus 1 as this is the row after the header
      return { sheet, sheetStartDate, sheetStartRow: i + ENTRY_SPACING + 1 };
    }

    if (dateCell.value) {
      lastDateEntryRow = i;
      break;
    }
  }

  // Scenario for an empty timesheet
  if (lastDateEntryRow === null) {
    return { sheet, sheetStartDate, sheetStartRow: DEFAULT_FIRST_ENTRY_ROW };
  }

  // The dates are in the format "26 Friday" so we need to extract the date
  const lastEntryCellValue = sheet.getCell(lastDateEntryRow, DATE_COLUMN).value;

  if (typeof lastEntryCellValue !== 'string' && typeof lastEntryCellValue !== 'number') {
    throw new Error(`Invalid date cell value, expected string or number, got ${typeof lastEntryCellValue}`);
  }

  const startDate = parseCellBasedStartDate({
    lastEntryCellValue,
    startMonthIndex: sheetStartDate.getUTCMonth(),
    startYear: sheetStartDate.getUTCFullYear(),
  });

  let startRow = 0;

  // Keep going down from last entry row until we find an empty row
  for (let i = lastDateEntryRow; i <= rowCount; i++) {
    let allEmpty = true;
    for (let j = 0; j < COLUMN_COUNT; j++) {
      const cell = sheet.getCell(i, j);

      if (cell.value) {
        allEmpty = false;
        break;
      }
    }

    if (allEmpty) {
      startRow = i + ENTRY_SPACING;
      break;
    }
  }

  if (startRow === 0) {
    throw new Error('Failed to find a start row');
  }

  return {
    sheet,
    sheetStartDate: startDate,
    sheetStartRow: startRow,
  };
};

const sheetTitleToDate = (title: string) => {
  // Split the title by spaces and get the first 2 words
  const titleWords = title.toLocaleLowerCase().split(' ').slice(0, 2).join(' ');

  // Extract the month and year from the sheet title using the regex
  const result = monthYearRegex.exec(titleWords);

  if (!result) {
    return null;
  }

  return monthYearToDate(result[0]);
};

export const filterExistingSheets = async (sheets: GoogleSpreadsheetWorksheet[]) =>
  (
    sheets
      .map((sheet) => {
        const sheetStartDate = sheetTitleToDate(sheet.title);

        if (!sheetStartDate) {
          return null;
        }

        return {
          sheet,
          sheetStartDate,
        };
      })
      .filter(Boolean) as SheetToProcess[]
  )
    // sort so most recent is first
    .sort((a, b) => b.sheetStartDate.getTime() - a.sheetStartDate.getTime());

export const applyTransforms = async ({
  transformedData,
  sheetStart,
  doc,
  firstDayToProcess,
  lastDayToProcess,
}: {
  transformedData: TransformedData[];
  sheetStart: SheetStart;
  doc: GoogleSpreadsheet;
  firstDayToProcess: Date;
  lastDayToProcess: Date;
}) => {
  const date = new Date(firstDayToProcess);
  let cursor = await createSheetStartIfBlank({
    doc,
    sheetStart,
    startDate: date,
  });

  while (date <= lastDayToProcess) {
    cursor = await updateCursor({
      doc,
      newDate: date,
      ...cursor,
    });
    // Find transformed data for this date
    const dataForDate = transformedData.filter((data) => data.date.getTime() === date.getTime());

    // If there is data for this date, add it to the sheet
    if (dataForDate) {
      for (const data of dataForDate) {
        for (const [rowIndex, row] of data.cells.entries()) {
          for (const [columnIndex, cellValue] of row.entries()) {
            const cell = cursor.currentSheet.getCell(rowIndex + cursor.currentRow, columnIndex);
            cell.value = cellValue;
          }
        }
        cursor.currentRow += data.cells.length + ENTRY_SPACING;
      }

      await cursor.currentSheet.saveUpdatedCells();

      // Delay for 1 second to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }
};

const createSheetStartIfBlank = async ({
  doc,
  startDate,
  sheetStart,
}: {
  doc: GoogleSpreadsheet;
  startDate: Date;
  sheetStart: SheetStart;
}) => {
  if (sheetStart) {
    return {
      currentSheet: sheetStart.sheet,
      currentRow: sheetStart.sheetStartRow,
    };
  }

  const sheet = await createBlankSheet({ startDate, doc });

  return {
    currentSheet: sheet,
    currentRow: DEFAULT_FIRST_ENTRY_ROW,
  };
};

const updateCursor = async ({
  doc,
  newDate,
  currentSheet,
  currentRow,
}: {
  doc: GoogleSpreadsheet;
  newDate: Date;
  currentSheet: GoogleSpreadsheetWorksheet;
  currentRow: number;
}) => {
  const currentSheetMonth = sheetTitleToDate(currentSheet.title);

  if (!currentSheetMonth) {
    throw new Error('Invalid sheet title');
  }

  // If newDate is in a different month, create a new sheet
  if (newDate.getUTCMonth() !== currentSheetMonth.getUTCMonth()) {
    const sheet = await createBlankSheet({ startDate: newDate, doc });

    return {
      currentSheet: sheet,
      currentRow: DEFAULT_FIRST_ENTRY_ROW,
    };
  }

  // If top row is empty, write the column headings
  const topRow = currentSheet.getCell(HEADER_ROW, DATE_COLUMN);

  const topRowEmpty = !topRow.value;

  if (topRowEmpty) {
    await addDefaultHeadings({ sheet: currentSheet });
  }

  return {
    currentSheet,
    currentRow,
  };
};
