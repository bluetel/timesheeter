import { monthYearRegex } from '@timesheeter/web';
import { type GoogleSpreadsheet, type GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { monthYearToDate, parseCellBasedStartDate } from './dates';
import { type TransformedData } from './transformer';
import { createBlankSheet, addDefaultHeadings } from './blank-sheet';
import * as console from "node:console";

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

  const { sheet, sheetStartDate } = mostRecentSheet;
  return {
    sheet,
    sheetStartDate: getDefaultStartDate(sheetStartDate), // we are able to pass the last sheet start date for backfill
    sheetStartRow: DEFAULT_FIRST_ENTRY_ROW,
  };
};

export const getDefaultStartDate = (date?:Date) => {
  // Go back to start of last month or 1 month from the last date
  const firstDayToProcess = date ?? new Date();
  firstDayToProcess.setUTCDate(1)
  firstDayToProcess.setUTCMonth(firstDayToProcess.getUTCMonth() - 1)
  firstDayToProcess.setUTCHours(0, 0, 0, 0)

  return firstDayToProcess
}

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

export const filterExistingSheets = (sheets: GoogleSpreadsheetWorksheet[]) =>
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
  doc,
  firstDayToProcess,
  lastDayToProcess,
}: {
  transformedData: TransformedData[];
  doc: GoogleSpreadsheet;
  firstDayToProcess: Date;
  lastDayToProcess: Date;
}) => {
  const date = new Date(firstDayToProcess);
  // we always remove the last two months from the start date
  let cursor = await createSheetStartIfBlank({
    doc,
    startDate: date,
  });
  while (date <= lastDayToProcess) {
    const previousSheet = cursor.currentSheet

    cursor = await updateCursor({
      doc,
      newDate: date,
      ...cursor,
    });

    // save each month vs each day
    if (cursor.currentSheet.sheetId !== previousSheet.sheetId) {
      await saveSheet(previousSheet)
    }

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
    }

    date.setUTCDate(date.getUTCDate() + 1);
  }
  // final save catch all
  await saveSheet(cursor.currentSheet)
  await sleep(1)
};

const saveSheet = async (sheet: GoogleSpreadsheetWorksheet) => {
  console.log('Save Sheet', sheet.title)
  await sheet.saveUpdatedCells()
}

const sleep = (seconds: number): Promise<void> => {
  console.log(`Sleeping ${seconds} seconds`)
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

const createSheetStartIfBlank = async ({
  doc,
  startDate
}: {
  doc: GoogleSpreadsheet;
  startDate: Date;
}) => {
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
