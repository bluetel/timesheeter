import { monthYearRegex } from "@timesheeter/app";
import { GoogleSpreadsheet, type GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { monthYearToDate } from "./dates";
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

    let lastDateEntryRow = null as number | null;

    for (let i = rowCount - 1; i > HEADER_ROW; i--) {
        const dateCell = sheet.getCell(i, DATE_COLUMN);

        if (dateCell.value) {
            lastDateEntryRow = i;
            break;
        }
    }

    // Scenario for an empty timesheet
    if (lastDateEntryRow === null) {
        return { sheet, sheetStartDate, sheetStartRow: FIRST_ENTRY_ROW };
    }

    // The dates are in the format "26 Friday" so we need to extract the date
    const lastEntryCellValue = sheet.getCell(lastDateEntryRow, DATE_COLUMN).value;

    if (typeof lastEntryCellValue !== "string") {
        throw new Error("Invalid date cell value");
    }

    const lastEntryDay = parseInt(lastEntryCellValue.split(" ")[0]);

    // Construct a date, using the month and year from the sheet start date
    const startMonth = sheetStartDate.getUTCMonth();
    const startYear = sheetStartDate.getUTCFullYear();

    let startDate = new Date(Date.UTC(startYear, startMonth, lastEntryDay + 1, 0, 0, 0, 0));

    // Ensure the date is valid
    if (isNaN(startDate.getTime())) {
        //  Assume in format Wednesday 26
        const lastEntryDate = lastEntryCellValue.split(" ")[1];

        startDate = new Date(Date.UTC(startYear, startMonth, parseInt(lastEntryDate) + 1, 0, 0, 0, 0));

        if (isNaN(startDate.getTime())) {
            throw new Error("Invalid start date");
        }
    }

    let startRow = 0;

    // Keep going down from last entry row until we find an empty row
    for (let i = lastDateEntryRow; i <= rowCount; i++) {
        let allEmpty = true;
        for (let j = 0; j < 6; j++) {
            const cell = sheet.getCell(i, j);

            if (cell.value) {
                allEmpty = false;
                break;
            }
        }

        if (allEmpty) {
            startRow = i + 2;
            break;
        }
    }

    if (startRow === 0) {
        throw new Error("Failed to find a start row");
    }

    return {
        sheet,
        sheetStartDate: startDate,
        sheetStartRow: startRow,
    };
};

const sheetTitleToDate = (title: string) => {
    // Split the title by spaces and get the first 2 words
    const titleWords = title.toLocaleLowerCase().split(" ").slice(0, 2).join(" ");

    // Extract the month and year from the sheet title using the regex
    const result = monthYearRegex.exec(titleWords);

    if (!result) {
        return null;
    }

    return monthYearToDate(result[0]);
};

export const filterExistingSheets = async (sheets: GoogleSpreadsheetWorksheet[], skipTillAferMonthDate: Date | null) =>
    (
        sheets
            .map((sheet) => {
                const sheetStartDate = sheetTitleToDate(sheet.title);

                if (!sheetStartDate) {
                    return null;
                }

                if (skipTillAferMonthDate && sheetStartDate <= skipTillAferMonthDate) {
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
                cursor.currentRow += data.cells.length + 2;
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
        currentRow: FIRST_ENTRY_ROW,
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
        throw new Error("Invalid sheet title");
    }

    // If newDate is in a different month, create a new sheet
    if (newDate.getUTCMonth() !== currentSheetMonth.getUTCMonth()) {
        const sheet = await createBlankSheet({ startDate: newDate, doc });

        return {
            currentSheet: sheet,
            currentRow: FIRST_ENTRY_ROW,
        };
    }

    return {
        currentSheet,
        currentRow,
    };
};
