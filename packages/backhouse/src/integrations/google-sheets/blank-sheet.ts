import { GoogleSpreadsheet } from "google-spreadsheet";
import { dateToMonthYear } from "./dates";

const defaultData = [
    ["Month Year Timesheet"],
    ["Each project / client should have a generic JIRA task to record time spent in meetings"],
    ["IAT should be recorded against the original story"],
    ["Time off should be recorded as HOLIDAYS (not ANNUAL LEAVE) or TIME IN LIEU in Column C no time in Column D"],
    ["Conference Attendance recorded as CONFERENCE no time in Column D"],
    ["Group together work carried out on a given task on 1 line rather than 2 per day"],
] as const;

export const createBlankSheet = async ({ startDate, doc }: { startDate: Date; doc: GoogleSpreadsheet }) => {
    const monthYearLowerCase = dateToMonthYear(startDate);
    const sheetTitle = `${monthYearLowerCase[0].toUpperCase()}${monthYearLowerCase.slice(1)}`;

    const sheet = await doc.addSheet({
        title: sheetTitle,
    });

    // Add default data to the sheet using cell api
    await sheet.loadCells();

    for (const [rowIndex, row] of defaultData.entries()) {
        for (const [columnIndex, cellValue] of row.entries()) {
            const cell = sheet.getCell(rowIndex, columnIndex);
            cell.value = cellValue;
        }
    }

    await sheet.saveUpdatedCells();

    return sheet;
};
