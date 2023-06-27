import { monthYearRegex } from "@timesheeter/app";
import { GoogleSpreadsheet, type GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { dateToMonthYear, monthYearToDate } from "./dates";
import { TransformedData } from "./transformer";
import { createBlankSheet } from "./blank-sheet";

const HEADER_ROW = 8 as const;
const FIRST_ENTRY_ROW = 11 as const;

export const DATE_COLUMN = 0 as const;

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

    let lastEntryRow = null as number | null;

    for (let i = rowCount - 1; i >= HEADER_ROW; i--) {
        const dateCell = sheet.getCell(i, DATE_COLUMN);

        if (dateCell.value) {
            lastEntryRow = i;
            break;
        }
    }

    // Scenario for an empty timesheet
    if (lastEntryRow === null) {
        return { sheet, sheetStartDate, sheetStartRow: FIRST_ENTRY_ROW };
    }

    // The dates are in the format "26 Friday" so we need to extract the date
    const lastEntryCellValue = sheet.getCell(lastEntryRow, DATE_COLUMN).value;

    if (typeof lastEntryCellValue !== "string") {
        throw new Error("Invalid date cell value");
    }

    const lastEntryDay = parseInt(lastEntryCellValue.split(" ")[0]);
    console.log("lastEntryDay", lastEntryDay);

    // Construct a date, using the month and year from the sheet start date
    const startMonth = sheetStartDate.getUTCMonth();
    const startYear = sheetStartDate.getUTCFullYear();

    const startDate = new Date(startYear, startMonth, lastEntryDay + 1);

    // Ensure the date is valid
    if (isNaN(startDate.getTime())) {
        throw new Error("Invalid start date");
    }

    return {
        sheet,
        sheetStartDate,
        sheetStartRow: lastEntryRow + 2,
    };
};

export const filterExistingSheets = async (sheets: GoogleSpreadsheetWorksheet[], skipTillAferMonthDate: Date | null) =>
    (
        sheets
            .map((sheet) => {
                // Split the title by spaces and get the first 2 words
                const titleWords = sheet.title.toLocaleLowerCase().split(" ").slice(0, 2).join(" ");

                // Extract the month and year from the sheet title using the regex
                const result = monthYearRegex.exec(titleWords);

                if (!result) {
                    return null;
                }

                const sheetStartDate = monthYearToDate(result[0]);

                if (skipTillAferMonthDate && sheetStartDate <= skipTillAferMonthDate) {
                    console.log("Skipping sheet", sheet.title);
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
        startDate: date,
        sheetStart,
    });

    while (date <= lastDayToProcess) {
        cursor = await updateCursor({
            doc,
            newDate: date,
            ...cursor,
        });

        let addedRowCount = 0;

        // Find transformed data for this date
        const dataForDate = transformedData.filter((data) => data.date === date);

        // If there is data for this date, add it to the sheet

        for (const data of dataForDate) {
            for (const [rowIndex, row] of data.cells.entries()) {
                for (const [columnIndex, cellValue] of row.entries()) {
                    const cell = cursor.currentSheet.getCell(rowIndex, columnIndex);
                    cell.value = cellValue;
                }
            }
            addedRowCount += data.cells.length + 2;
        }

        await cursor.currentSheet.saveUpdatedCells();

        // Delay for 1 second to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));

        date.setDate(date.getUTCDate() + 1);
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
            currentDate: sheetStart.sheetStartDate,
            currentRow: sheetStart.sheetStartRow,
        };
    }

    const sheet = await createBlankSheet({ startDate, doc });

    return {
        currentSheet: sheet,
        currentDate: startDate,
        currentRow: FIRST_ENTRY_ROW,
    };
};

const updateCursor = async ({
    doc,
    newDate,
    currentSheet,
    currentDate,
    currentRow,
}: {
    doc: GoogleSpreadsheet;
    newDate: Date;
    currentDate: Date;
    currentSheet: GoogleSpreadsheetWorksheet;
    currentRow: number;
}) => {
    // If newDate is in a different month, create a new sheet
    if (newDate.getUTCMonth() !== currentDate.getUTCMonth()) {
        const sheet = await createBlankSheet({ startDate: newDate, doc });

        return {
            currentSheet: sheet,
            currentDate: newDate,
            currentRow: FIRST_ENTRY_ROW,
        };
    }

    return {
        currentSheet,
        currentDate: newDate,
        currentRow,
    };
};
