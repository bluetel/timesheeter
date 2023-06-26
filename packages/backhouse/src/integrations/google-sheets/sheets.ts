import { type GoogleSpreadsheetWorksheet } from "google-spreadsheet";

export const HEADER_ROW = 8 as const;

export const DATE_COLUMN = 0 as const;

export type SheetToProcess = {
    sheet: GoogleSpreadsheetWorksheet;
    sheetStartDate: Date;
};

// Gets the day to start processing from
export const getSheetBasedStartDate = (sheetsToProcess: SheetToProcess[]) => {
    if (!sheetsToProcess.length) {
        return null;
    }

    const mostRecentSheet = sheetsToProcess[0];

    // Loop down DATE_COLUMN until we find 2 consecutive empty rows
    const { sheet, sheetStartDate } = mostRecentSheet;
    const { rowCount } = sheet;

    let lastEntryRow = null as number | null;

    for (let i = rowCount - 1; i >= HEADER_ROW; i--) {
        const dateCell = sheet.getCell(i, DATE_COLUMN);

        if (dateCell.value) {
            lastEntryRow = i;
            break;
        }
    }

    if (lastEntryRow === null) {
        return sheetStartDate;
    }

    // The dates are in the format "26 Friday" so we need to extract the date
    const lastEntryCellValue = sheet.getCell(lastEntryRow, DATE_COLUMN).value;

    if (typeof lastEntryCellValue !== "string") {
        throw new Error("Invalid date cell value");
    }

    const lastEntryDay = parseInt(lastEntryCellValue.split(" ")[0]);

    // Construct a date, using the month and year from the sheet start date
    const startMonth = sheetStartDate.getMonth();
    const startYear = sheetStartDate.getFullYear();

    const startDate = new Date(startYear, startMonth, lastEntryDay + 1);

    // Ensure the date is valid
    if (isNaN(startDate.getTime())) {
        throw new Error("Invalid start date");
    }

    return startDate;
};
