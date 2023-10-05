import { GoogleSpreadsheet } from 'google-spreadsheet';
import { dateToMonthYear } from './dates';

const defaultData = [['Date', 'Project / Customer', 'JIRA Task', 'Time', 'Details', 'Overtime']] as const;

export const createBlankSheet = async ({ startDate, doc }: { startDate: Date; doc: GoogleSpreadsheet }) => {
  const sheetTitle = dateToMonthYear(startDate);

  // If the sheet already exists delete it and create a new one
  const existingSheet = doc.sheetsByTitle[sheetTitle];

  if (existingSheet) {
    await existingSheet.delete();
  }

  const sheet = await doc.addSheet({
    title: sheetTitle,
    index: 0,
  });

  // Add default data to the sheet using cell api
  await addDefaultHeadings({ sheet });

  return sheet;
};

export const addDefaultHeadings = async ({ sheet }: { sheet: GoogleSpreadsheet['sheetsByTitle'][number] }) => {
  await sheet.loadCells();

  for (const [rowIndex, row] of defaultData.entries()) {
    for (const [columnIndex, cellValue] of row.entries()) {
      const cell = sheet.getCell(rowIndex, columnIndex);
      cell.value = cellValue;

      if (rowIndex === 0) {
        cell.textFormat = {
          bold: true,
        };
      }
    }
  }

  await sheet.saveUpdatedCells();
};
