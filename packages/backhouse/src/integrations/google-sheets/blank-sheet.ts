import { GoogleSpreadsheet } from 'google-spreadsheet';
import { dateToMonthYear } from './dates';

const defaultData = [
  ['Month Year Timesheet'],
  ['Each project / client should have a generic JIRA task to record time spent in meetings'],
  ['IAT should be recorded against the original story'],
  ['Time off should be recorded as HOLIDAYS (not ANNUAL LEAVE) or TIME IN LIEU in Column C no time in Column D'],
  ['Conference Attendance recorded as CONFERENCE no time in Column D'],
  ['Group together work carried out on a given task on 1 line rather than 2 per day'],
  [],
  [],
  ['Date', 'Project / Customer', 'JIRA Task', 'Time', 'Details', 'Overtime'],
] as const;

export const createBlankSheet = async ({ startDate, doc }: { startDate: Date; doc: GoogleSpreadsheet }) => {
  // If the sheet already exists delete it and create a new one
  const existingSheet = doc.sheetsByTitle[dateToMonthYear(startDate)];

  if (existingSheet) {
    await existingSheet.delete();
  }

  const monthYearLowerCase = dateToMonthYear(startDate);
  const sheetTitle = `${monthYearLowerCase[0].toUpperCase()}${monthYearLowerCase.slice(1)}`;

  const sheet = await doc.addSheet({
    title: sheetTitle,
    index: 0,
  });

  // Add default data to the sheet using cell api
  await sheet.loadCells();

  for (const [rowIndex, row] of defaultData.entries()) {
    const lastRow = rowIndex === defaultData.length - 1;
    for (const [columnIndex, cellValue] of row.entries()) {
      const cell = sheet.getCell(rowIndex, columnIndex);
      cell.value = cellValue;

      if (lastRow || rowIndex === 0) {
        cell.textFormat = {
          bold: true,
        };
      }
    }
  }

  await sheet.saveUpdatedCells();

  return sheet;
};
